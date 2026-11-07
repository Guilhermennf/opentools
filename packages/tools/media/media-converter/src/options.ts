import { ToolError } from "@opentools/core";

export const outputFormats = ["mp4", "mp3"] as const;
export type OutputFormat = (typeof outputFormats)[number];
export const mp3Bitrates = [128, 192, 256, 320] as const;
export type Mp3Bitrate = (typeof mp3Bitrates)[number];
export const mp4Qualities = ["standard", "high"] as const;
export type Mp4Quality = (typeof mp4Qualities)[number];

/** The WebAssembly build of FFmpeg runs out of memory well before 1 GB. */
export const MAX_INPUT_BYTES = 500 * 1024 * 1024;

export interface ConvertOptions {
  format: OutputFormat;
  mp3Bitrate: Mp3Bitrate;
  mp4Quality: Mp4Quality;
}

export const mimeTypes: Record<OutputFormat, string> = { mp4: "video/mp4", mp3: "audio/mpeg" };

/** FFmpeg arguments for a conversion. Pure, so it can be unit tested. */
export function buildFfmpegArgs(input: string, output: string, o: ConvertOptions): string[] {
  if (o.format === "mp3") {
    return ["-i", input, "-vn", "-c:a", "libmp3lame", "-b:a", `${o.mp3Bitrate}k`, output];
  }
  return [
    "-i", input,
    "-c:v", "libx264", "-preset", "veryfast", "-crf", o.mp4Quality === "high" ? "23" : "28",
    // yuv420p + even dimensions keep the file playable everywhere.
    "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart",
    output,
  ];
}

/** Muxes a video-only and an audio-only stream into one MP4 without re-encoding. */
export function buildMergeArgs(video: string, audio: string, output: string): string[] {
  return ["-i", video, "-i", audio, "-map", "0:v:0", "-map", "1:a:0", "-c", "copy", "-movflags", "+faststart", output];
}

const MEDIA_EXTENSIONS = new Set([
  "mp4", "m4v", "mov", "mkv", "webm", "avi", "wmv", "flv", "3gp", "mpg", "mpeg", "ts",
  "mp3", "m4a", "wav", "ogg", "oga", "opus", "flac", "aac", "wma", "aiff",
]);

export const extensionOf = (name: string) => {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : "";
};

export function isLikelyMedia(file: { name: string; type: string }): boolean {
  return /^(video|audio)\//.test(file.type) || MEDIA_EXTENSIONS.has(extensionOf(file.name));
}

export function isAudioOnly(file: { name: string; type: string }): boolean {
  if (file.type.startsWith("audio/")) return true;
  return !file.type.startsWith("video/") && ["mp3", "m4a", "wav", "ogg", "oga", "opus", "flac", "aac", "wma", "aiff"].includes(extensionOf(file.name));
}

/** Name used inside FFmpeg's virtual file system (keeps a safe extension as a format hint). */
export function virtualInputName(file: { name: string }): string {
  const ext = extensionOf(file.name);
  return /^[a-z0-9]{1,5}$/.test(ext) ? `input.${ext}` : "input";
}

export function outputFileName(inputName: string, format: OutputFormat): string {
  const dot = inputName.lastIndexOf(".");
  const base = (dot > 0 ? inputName.slice(0, dot) : inputName)
    .replace(/[^\p{L}\p{N}._ -]/gu, "_")
    .trim()
    .slice(0, 100);
  return `${base || "converted"}.${format}`;
}

const PLATFORM_HOSTS = [
  "youtube.com", "youtu.be", "youtube-nocookie.com", "vimeo.com", "dailymotion.com", "twitch.tv",
  "tiktok.com", "instagram.com", "facebook.com", "fb.watch", "twitter.com", "x.com", "reddit.com",
  "soundcloud.com", "spotify.com", "netflix.com", "primevideo.com", "disneyplus.com",
];

const matchesHost = (hostname: string, hosts: string[]) => {
  const host = hostname.toLowerCase().replace(/^www[.]/, "");
  return hosts.some((p) => host === p || host.endsWith(`.${p}`));
};

export const isPlatformHost = (hostname: string) => matchesHost(hostname, PLATFORM_HOSTS);
/** YouTube links have their own source (downloaded by the server with yt-dlp). */
export const isYoutubeHost = (hostname: string) => matchesHost(hostname, ["youtube.com", "youtu.be", "youtube-nocookie.com"]);

/** Validates a user-typed link. Only direct links to files are supported. */
export function parseMediaUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new ToolError("VALIDATION", "errors.invalidUrl");
  }
  if ((url.protocol !== "https:" && url.protocol !== "http:") || url.username || url.password) {
    throw new ToolError("VALIDATION", "errors.invalidUrl");
  }
  if (isYoutubeHost(url.hostname)) throw new ToolError("UNSUPPORTED", "errors.youtubeUseTab");
  if (isPlatformHost(url.hostname)) throw new ToolError("UNSUPPORTED", "errors.platformNotSupported");
  return url;
}
