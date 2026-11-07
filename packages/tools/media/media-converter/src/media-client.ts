import { ToolError, type ToolModule } from "@opentools/core";
import { z } from "zod";
import { convertMedia } from "./engine";
import {
  isAudioOnly,
  isLikelyMedia,
  MAX_INPUT_BYTES,
  mp4Qualities,
  outputFileName,
  outputFormats,
  parseMediaUrl,
} from "./options";

export * from "./options";
export * from "./youtube";
export * from "./youtube-client";
export { loadEngine, DEFAULT_CORE_BASE, FFMPEG_CORE_VERSION } from "./engine";

export const convertInputSchema = z.object({
  file: z.instanceof(File),
  format: z.enum(outputFormats),
  mp3Bitrate: z.union([z.literal(128), z.literal(192), z.literal(256), z.literal(320)]).default(192),
  mp4Quality: z.enum(mp4Qualities).default("standard"),
});
export type ConvertInput = z.input<typeof convertInputSchema>;
export interface ConvertOutput {
  blob: Blob;
  fileName: string;
}

export const convertModule: ToolModule<z.output<typeof convertInputSchema>, ConvertOutput> = {
  inputSchema: convertInputSchema,
  async execute({ file, format, mp3Bitrate, mp4Quality }, ctx) {
    if (file.size === 0) throw new ToolError("VALIDATION", "errors.emptyFile");
    if (file.size > MAX_INPUT_BYTES) throw new ToolError("VALIDATION", "errors.fileTooLarge");
    if (!isLikelyMedia(file)) throw new ToolError("VALIDATION", "errors.notMedia");
    if (format === "mp4" && isAudioOnly(file)) throw new ToolError("VALIDATION", "errors.noVideoStream");
    const blob = await convertMedia({
      file,
      options: { format, mp3Bitrate, mp4Quality },
      signal: ctx.signal,
      onProgress: ctx.onProgress,
    });
    return { blob, fileName: outputFileName(file.name, format) };
  },
};

/** Downloads a direct link in the browser. Fails clearly when the host blocks cross-origin reads. */
export async function fetchMediaFile(rawUrl: string, signal?: AbortSignal): Promise<File> {
  const url = parseMediaUrl(rawUrl);
  let response: Response;
  try {
    response = await fetch(url, { signal, credentials: "omit", referrerPolicy: "no-referrer" });
  } catch (cause) {
    if (signal?.aborted) throw new ToolError("ABORTED", "errors.aborted");
    throw new ToolError("EXECUTION", "errors.fetchFailed", undefined, { cause });
  }
  if (!response.ok) throw new ToolError("EXECUTION", "errors.fetchFailed", { status: response.status });
  const length = Number(response.headers.get("content-length"));
  if (Number.isFinite(length) && length > MAX_INPUT_BYTES) throw new ToolError("VALIDATION", "errors.fileTooLarge");
  const type = (response.headers.get("content-type") ?? "").split(";")[0]!.trim().toLowerCase();
  const blob = await response.blob();
  if (blob.size > MAX_INPUT_BYTES) throw new ToolError("VALIDATION", "errors.fileTooLarge");
  const last = decodeURIComponent(url.pathname.split("/").filter(Boolean).pop() ?? "");
  const file = new File([blob], last || "download", { type });
  if (!isLikelyMedia(file)) throw new ToolError("VALIDATION", "errors.notMedia");
  return file;
}

export interface MediaInfo {
  duration: number | null;
  width: number | null;
  height: number | null;
}

const UNKNOWN: MediaInfo = { duration: null, width: null, height: null };

/** Reads metadata with a media element. Resolves to nulls if the browser cannot decode it. */
export function probeMedia(file: File): Promise<MediaInfo> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const el = document.createElement(isAudioOnly(file) ? "audio" : "video");
    const finish = (info: MediaInfo) => {
      clearTimeout(timer);
      URL.revokeObjectURL(url);
      el.removeAttribute("src");
      el.load();
      resolve(info);
    };
    const timer = setTimeout(() => finish(UNKNOWN), 5000);
    el.preload = "metadata";
    el.onerror = () => finish(UNKNOWN);
    el.onloadedmetadata = () => {
      const video = el instanceof HTMLVideoElement && el.videoWidth > 0 ? el : null;
      finish({
        duration: Number.isFinite(el.duration) ? el.duration : null,
        width: video?.videoWidth ?? null,
        height: video?.videoHeight ?? null,
      });
    };
    el.src = url;
  });
}
