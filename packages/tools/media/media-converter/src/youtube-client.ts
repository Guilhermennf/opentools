// Browser side of the YouTube source. The OpenTools server only relays the raw streams
// (yt-dlp, see apps/web/src/app/api/youtube); conversion to MP3 and merging video with
// audio into MP4 happen here with FFmpeg.wasm, like any other conversion.
import { ToolError } from "@opentools/core";
import { convertMedia, loadEngine, mergeVideoAudio } from "./engine";
import { MAX_INPUT_BYTES, type Mp3Bitrate, type OutputFormat } from "./options";
import {
  parseYoutubeId,
  youtubeErrorKey,
  youtubeFileName,
  type StreamRef,
  type YoutubeErrorCode,
  type YoutubeVideo,
} from "./youtube";

export const YOUTUBE_API = "/api/youtube";

const ytError = (code: YoutubeErrorCode, details?: unknown, cause?: unknown) =>
  new ToolError(code === "invalidUrl" ? "VALIDATION" : "EXECUTION", youtubeErrorKey(code), details, { cause });

async function errorFrom(response: Response): Promise<ToolError> {
  let code: YoutubeErrorCode = "failed";
  try {
    const body = (await response.json()) as { error?: unknown };
    if (typeof body.error === "string") code = body.error as YoutubeErrorCode;
  } catch {
    // Not JSON (for example a platform error page): keep "failed".
  }
  return ytError(code, { status: response.status });
}

async function request(url: string, signal?: AbortSignal): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(url, { signal, credentials: "same-origin" });
  } catch (cause) {
    if (signal?.aborted) throw new ToolError("ABORTED", "errors.aborted");
    throw ytError("failed", undefined, cause);
  }
  if (!response.ok) throw await errorFrom(response);
  return response;
}

/** Looks up a YouTube link on the server: title, duration and the formats on offer. */
export async function fetchYoutubeInfo(raw: string, signal?: AbortSignal): Promise<YoutubeVideo> {
  const id = parseYoutubeId(raw);
  if (!id) throw ytError("invalidUrl");
  const response = await request(`${YOUTUBE_API}/info?v=${id}`, signal);
  return (await response.json()) as YoutubeVideo;
}

async function downloadStream(
  videoId: string,
  stream: StreamRef,
  signal: AbortSignal,
  onBytes: (count: number) => void,
): Promise<Blob> {
  const response = await request(`${YOUTUBE_API}/stream?v=${videoId}&f=${encodeURIComponent(stream.formatId)}`, signal);
  if (!response.body) throw ytError("failed");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      total += value.byteLength;
      onBytes(value.byteLength);
      if (total > MAX_INPUT_BYTES) {
        void reader.cancel();
        throw ytError("tooLarge");
      }
    }
  } catch (error) {
    if (signal.aborted) throw new ToolError("ABORTED", "errors.aborted");
    if (error instanceof ToolError) throw error;
    throw ytError("failed", undefined, error); // The server stopped mid-stream.
  }
  if (total === 0) throw ytError("failed");
  return new Blob(chunks as BlobPart[]);
}

export interface YoutubeDownloadProgress {
  stage: "downloading" | "converting";
  /** Bytes received so far and the expected total (null when unknown). */
  received: number;
  expected: number | null;
  /** 0..1 within the current stage (null while downloading without a known size). */
  fraction: number | null;
}

export interface YoutubeConvertRequest {
  video: YoutubeVideo;
  format: OutputFormat;
  mp3Bitrate: Mp3Bitrate;
  /** MP4 resolution; defaults to the highest on offer. */
  height?: number;
  signal?: AbortSignal;
  onProgress?: (progress: YoutubeDownloadProgress) => void;
}

export interface YoutubeConvertOutput {
  blob: Blob;
  fileName: string;
}

/** Downloads the streams a choice needs and turns them into an MP3 or MP4 in the browser. */
export async function convertYoutube({
  video,
  format,
  mp3Bitrate,
  height,
  signal,
  onProgress,
}: YoutubeConvertRequest): Promise<YoutubeConvertOutput> {
  const option = format === "mp4" ? (video.videos.find((v) => v.height === height) ?? video.videos[0]) : undefined;
  const streams: StreamRef[] =
    format === "mp3" ? (video.audio ? [video.audio] : []) : option ? [option.video, ...(option.audio ? [option.audio] : [])] : [];
  if (streams.length === 0) throw ytError("noFormats");
  const needsEngine = format === "mp3" || streams.length > 1;
  // Fetch the ~32 MB engine while the video downloads.
  const engine = needsEngine ? loadEngine() : null;
  engine?.catch(() => undefined);

  // One controller for both downloads, so a failure in one stops the other.
  const downloads = new AbortController();
  const stop = () => downloads.abort();
  signal?.addEventListener("abort", stop, { once: true });
  const sizes = streams.map((s) => s.size);
  const expected = sizes.every((s) => s != null) ? sizes.reduce<number>((a, s) => a + s!, 0) : null;
  let received = 0;
  const report = () =>
    onProgress?.({
      stage: "downloading",
      received,
      expected,
      fraction: expected ? Math.min(0.99, received / expected) : null,
    });
  report();

  let blobs: Blob[];
  try {
    blobs = await Promise.all(
      streams.map((s) =>
        downloadStream(video.id, s, downloads.signal, (n) => {
          received += n;
          report();
        }),
      ),
    );
  } catch (error) {
    downloads.abort();
    if (signal?.aborted) throw new ToolError("ABORTED", "errors.aborted");
    throw error;
  } finally {
    signal?.removeEventListener("abort", stop);
  }

  const fileName = youtubeFileName(video.title, format);
  const converting = (fraction: number) => onProgress?.({ stage: "converting", received, expected, fraction });
  converting(0);
  if (engine) await engine;

  if (format === "mp3") {
    const audio = streams[0]!;
    const file = new File([blobs[0]!], `audio.${audio.ext}`, { type: "" });
    const blob = await convertMedia({
      file,
      options: { format: "mp3", mp3Bitrate, mp4Quality: "standard" },
      signal,
      onProgress: converting,
    });
    return { blob, fileName };
  }
  if (blobs.length === 1) {
    // Progressive MP4: already H.264 + AAC with sound, nothing to do.
    converting(1);
    return { blob: new Blob([blobs[0]!], { type: "video/mp4" }), fileName };
  }
  const blob = await mergeVideoAudio({
    video: blobs[0]!,
    audio: blobs[1]!,
    videoExt: streams[0]!.ext,
    audioExt: streams[1]!.ext,
    signal,
    onProgress: converting,
  });
  return { blob, fileName };
}
