// Pure YouTube helpers shared by the API routes (server) and the UI (browser).
// The server runs yt-dlp; these functions only parse links, pick formats from its
// JSON output and classify its errors, so they are unit tested without a network.
import { isYoutubeHost, MAX_INPUT_BYTES, outputFileName, type OutputFormat } from "./options";

export { isYoutubeHost, MAX_INPUT_BYTES };

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
/** yt-dlp format ids are itags such as "140", "137" or "251-drc". No selector syntax. */
const FORMAT_ID = /^[A-Za-z0-9_-]{1,24}$/;

export const isVideoId = (id: string) => VIDEO_ID.test(id);
export const isFormatId = (id: string) => FORMAT_ID.test(id);

/** Extracts the 11-character video id from a YouTube link (or a bare id). Null when it is not one. */
export function parseYoutubeId(raw: string): string | null {
  const text = raw.trim();
  if (isVideoId(text)) return text;
  let url: URL;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(text) ? text : `https://${text}`);
  } catch {
    return null;
  }
  if ((url.protocol !== "https:" && url.protocol !== "http:") || !isYoutubeHost(url.hostname)) return null;
  const parts = url.pathname.split("/").filter(Boolean);
  let id: string | null | undefined;
  if (url.hostname.toLowerCase().endsWith("youtu.be")) id = parts[0];
  else if (parts[0] === "watch" || parts.length === 0) id = url.searchParams.get("v");
  else if (["shorts", "embed", "live", "v", "e"].includes(parts[0]!)) id = parts[1];
  return id && isVideoId(id) ? id : null;
}

export const watchUrl = (id: string) => `https://www.youtube.com/watch?v=${id}`;

/** The subset of a yt-dlp format object that is used here. */
export interface YtDlpFormat {
  format_id?: string;
  ext?: string;
  vcodec?: string | null;
  acodec?: string | null;
  height?: number | null;
  fps?: number | null;
  tbr?: number | null;
  abr?: number | null;
  filesize?: number | null;
  filesize_approx?: number | null;
  protocol?: string;
  has_drm?: boolean | null;
  language_preference?: number | null;
  format_note?: string | null;
}

/** The subset of yt-dlp's `-J` output that is used here. */
export interface YtDlpVideo {
  id?: string;
  title?: string;
  channel?: string | null;
  uploader?: string | null;
  duration?: number | null;
  thumbnail?: string | null;
  is_live?: boolean | null;
  live_status?: string | null;
  formats?: YtDlpFormat[];
}

export interface StreamRef {
  formatId: string;
  ext: string;
  /** Exact or estimated size in bytes (null when unknown). */
  size: number | null;
}

export interface VideoOption {
  height: number;
  video: StreamRef;
  /** Null when `video` already carries audio (a progressive MP4). */
  audio: StreamRef | null;
  size: number | null;
}

export interface YoutubeVideo {
  id: string;
  title: string;
  channel: string | null;
  duration: number | null;
  thumbnail: string | null;
  /** Best audio-only stream, used for MP3 and to add sound to video-only streams. */
  audio: StreamRef | null;
  /** MP4 options, highest resolution first. */
  videos: VideoOption[];
}

export type YoutubeErrorCode =
  | "invalidUrl"
  | "blocked"
  | "unavailable"
  | "ageRestricted"
  | "live"
  | "tooLarge"
  | "noFormats"
  | "disabled"
  | "engine"
  | "failed";

/** Thrown by `summarizeVideo` for videos that cannot be offered. */
export class YoutubeError extends Error {
  constructor(readonly code: YoutubeErrorCode) {
    super(code);
    this.name = "YoutubeError";
  }
}

const isHttp = (f: YtDlpFormat) => (f.protocol ?? "").startsWith("http") && !f.has_drm;
const hasVideo = (f: YtDlpFormat) => !!f.vcodec && f.vcodec !== "none";
const hasAudio = (f: YtDlpFormat) => !!f.acodec && f.acodec !== "none";
const isDrc = (f: YtDlpFormat) => /drc/i.test(f.format_id ?? "") || /drc/i.test(f.format_note ?? "");

function sizeOf(f: YtDlpFormat, duration: number | null): number | null {
  const exact = f.filesize ?? f.filesize_approx;
  if (exact && exact > 0) return Math.round(exact);
  // tbr is in kbit/s.
  return f.tbr && duration ? Math.round(f.tbr * 125 * duration) : null;
}

const ref = (f: YtDlpFormat, duration: number | null): StreamRef => ({
  formatId: f.format_id!,
  ext: f.ext ?? "bin",
  size: sizeOf(f, duration),
});

const addSizes = (a: number | null, b: number | null) => (a == null || b == null ? null : a + b);

function pickAudio(formats: YtDlpFormat[]): YtDlpFormat | undefined {
  let pool = formats.filter((f) => isHttp(f) && hasAudio(f) && !hasVideo(f) && !isDrc(f));
  // Videos with dubbed tracks: yt-dlp ranks the original language highest.
  const best = Math.max(...pool.map((f) => f.language_preference ?? 0));
  if (Number.isFinite(best)) pool = pool.filter((f) => (f.language_preference ?? 0) === best);
  // M4A (AAC) can be copied into an MP4 without re-encoding, so it wins over WebM/Opus.
  const m4a = pool.filter((f) => f.ext === "m4a");
  const ranked = (m4a.length ? m4a : pool).sort((a, b) => (b.abr ?? b.tbr ?? 0) - (a.abr ?? a.tbr ?? 0));
  return ranked[0];
}

/** Turns yt-dlp's JSON into the options the UI offers. Throws `YoutubeError` when nothing fits. */
export function summarizeVideo(raw: YtDlpVideo, maxBytes = MAX_INPUT_BYTES): YoutubeVideo {
  if (raw.is_live || raw.live_status === "is_live" || raw.live_status === "is_upcoming") {
    throw new YoutubeError("live");
  }
  const duration = raw.duration && raw.duration > 0 ? raw.duration : null;
  const formats = (raw.formats ?? []).filter((f) => f.format_id && isFormatId(f.format_id));
  const audioFormat = pickAudio(formats);
  const audio = audioFormat ? ref(audioFormat, duration) : null;

  const byHeight = new Map<number, VideoOption>();
  if (audio && audioFormat?.ext === "m4a") {
    // Video-only H.264 MP4 streams: merged with the M4A audio in the browser (stream copy).
    const best = new Map<number, YtDlpFormat>();
    for (const f of formats) {
      if (!isHttp(f) || !hasVideo(f) || hasAudio(f) || f.ext !== "mp4" || !f.vcodec!.startsWith("avc1")) continue;
      if (!f.height || f.height > 1080) continue;
      const current = best.get(f.height);
      if (!current || (f.tbr ?? 0) > (current.tbr ?? 0)) best.set(f.height, f);
    }
    for (const [height, f] of best) {
      const video = ref(f, duration);
      byHeight.set(height, { height, video, audio, size: addSizes(video.size, audio.size) });
    }
  }
  // Progressive MP4 (video + audio in one file, usually 360p) as a fallback.
  for (const f of formats) {
    if (!isHttp(f) || !hasVideo(f) || !hasAudio(f) || f.ext !== "mp4" || !f.height || byHeight.has(f.height)) continue;
    const video = ref(f, duration);
    byHeight.set(f.height, { height: f.height, video, audio: null, size: video.size });
  }

  const all = [...byHeight.values()].sort((a, b) => b.height - a.height);
  const videos = all.filter((v) => v.size == null || v.size <= maxBytes);
  const audioFits = audio && (audio.size == null || audio.size <= maxBytes) ? audio : null;
  if (!audioFits && videos.length === 0) throw new YoutubeError(all.length || audio ? "tooLarge" : "noFormats");

  return {
    id: raw.id && isVideoId(raw.id) ? raw.id : "",
    title: (raw.title ?? "").trim() || "YouTube video",
    channel: raw.channel ?? raw.uploader ?? null,
    duration,
    thumbnail: raw.thumbnail && /^https:\/\//.test(raw.thumbnail) ? raw.thumbnail : null,
    audio: audioFits,
    videos,
  };
}

/** Maps yt-dlp's stderr to an error code the UI can explain. */
export function classifyYtDlpError(stderr: string): YoutubeErrorCode {
  const s = stderr.toLowerCase();
  if (s.includes("confirm you") && s.includes("bot")) return "blocked";
  if (s.includes("http error 429") || s.includes("too many requests")) return "blocked";
  if (s.includes("confirm your age") || s.includes("age-restricted") || s.includes("inappropriate for some users")) {
    return "ageRestricted";
  }
  if (s.includes("live event") || s.includes("is live") || s.includes("premieres in")) return "live";
  if (s.includes("larger than max-filesize") || s.includes("file is larger than")) return "tooLarge";
  if (s.includes("requested format is not available")) return "noFormats";
  if (
    s.includes("unavailable") ||
    s.includes("private video") ||
    s.includes("has been removed") ||
    s.includes("not available") ||
    s.includes("members-only") ||
    s.includes("does not exist")
  ) {
    return "unavailable";
  }
  return "failed";
}

export const youtubeErrorKey = (code: YoutubeErrorCode) =>
  `errors.youtube${code.charAt(0).toUpperCase()}${code.slice(1)}`;

/** File name for a downloaded video: the title, cleaned like any other output name. */
export const youtubeFileName = (title: string, format: OutputFormat) => outputFileName(`${title}.src`, format);
