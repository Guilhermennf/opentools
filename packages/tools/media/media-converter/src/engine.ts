// Client-only FFmpeg.wasm wrapper. The ~32 MB WebAssembly core is larger than
// Cloudflare's 25 MiB asset limit, so it is fetched from a pinned CDN URL on first use
// (see docs/decisions/0004-ffmpeg-core-delivery.md). Only the engine is downloaded;
// the user's media never leaves the browser.
import type { FFmpeg } from "@ffmpeg/ffmpeg";
import { ToolError } from "@opentools/core";
import { buildFfmpegArgs, buildMergeArgs, mimeTypes, virtualInputName, type ConvertOptions } from "./options";

export const FFMPEG_CORE_VERSION = "0.12.10";
export const DEFAULT_CORE_BASE = `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${FFMPEG_CORE_VERSION}/dist/esm`;

// Inlined by Next.js at build time; undefined elsewhere (tests, other bundlers).
declare const process: { env: Record<string, string | undefined> } | undefined;
const coreBase = () =>
  (typeof process !== "undefined" ? process.env.NEXT_PUBLIC_FFMPEG_CORE_BASE : undefined) || DEFAULT_CORE_BASE;

/** Served from apps/web/public/ffmpeg (copied by scripts/sync-ffmpeg.mjs); never bundled. */
const WRAPPER_URL = "/ffmpeg/index.js";

async function toBlobURL(url: string, mimeType: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  return URL.createObjectURL(new Blob([await response.arrayBuffer()], { type: mimeType }));
}

let instance: FFmpeg | null = null;
let loading: Promise<FFmpeg> | null = null;

/** Loads (once) and returns the shared FFmpeg instance. */
export function loadEngine(): Promise<FFmpeg> {
  if (instance) return Promise.resolve(instance);
  loading ??= (async () => {
    const base = coreBase();
    let ffmpeg: FFmpeg;
    try {
      const mod = (await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ WRAPPER_URL)) as {
        FFmpeg: new () => FFmpeg;
      };
      ffmpeg = new mod.FFmpeg();
      await ffmpeg.load({
        coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, "application/wasm"),
      });
    } catch (cause) {
      throw new ToolError("EXECUTION", "errors.engineLoadFailed", undefined, { cause });
    }
    instance = ffmpeg;
    return ffmpeg;
  })().finally(() => {
    loading = null;
  });
  return loading;
}

function dropEngine() {
  instance?.terminate();
  instance = null;
}

interface FfmpegJob {
  inputs: { name: string; data: Blob }[];
  args: string[];
  output: string;
  mimeType: string;
  signal?: AbortSignal;
  onProgress?: (fraction: number) => void;
}

/** Writes the inputs, runs FFmpeg and returns the output, cleaning up the virtual FS. */
async function runFfmpeg({ inputs, args, output, mimeType, signal, onProgress }: FfmpegJob): Promise<Blob> {
  const ffmpeg = await loadEngine();
  if (signal?.aborted) throw new ToolError("ABORTED", "errors.aborted");

  const onFfmpegProgress = ({ progress }: { progress: number }) => {
    if (Number.isFinite(progress)) onProgress?.(Math.min(1, Math.max(0, progress)));
  };
  const onAbort = () => dropEngine();
  signal?.addEventListener("abort", onAbort, { once: true });
  ffmpeg.on("progress", onFfmpegProgress);

  try {
    for (const { name, data } of inputs) await ffmpeg.writeFile(name, new Uint8Array(await data.arrayBuffer()));
    const code = await ffmpeg.exec(args);
    if (signal?.aborted) throw new ToolError("ABORTED", "errors.aborted");
    if (code !== 0) throw new ToolError("EXECUTION", "errors.conversionFailed", { code });
    const data = (await ffmpeg.readFile(output)) as Uint8Array;
    if (data.byteLength === 0) throw new ToolError("EXECUTION", "errors.conversionFailed");
    onProgress?.(1);
    return new Blob([data as BlobPart], { type: mimeType });
  } catch (error) {
    if (signal?.aborted) throw new ToolError("ABORTED", "errors.aborted");
    if (error instanceof ToolError) throw error;
    // FFmpeg.wasm can be left in an undefined state after a crash: start fresh next time.
    dropEngine();
    throw new ToolError("EXECUTION", "errors.conversionFailed", undefined, { cause: error });
  } finally {
    signal?.removeEventListener("abort", onAbort);
    if (instance === ffmpeg) {
      ffmpeg.off("progress", onFfmpegProgress);
      for (const name of [...inputs.map((i) => i.name), output]) await ffmpeg.deleteFile(name).catch(() => undefined);
    }
  }
}

export interface ConvertRequest {
  file: File;
  options: ConvertOptions;
  signal?: AbortSignal;
  onProgress?: (fraction: number) => void;
}

export function convertMedia({ file, options, signal, onProgress }: ConvertRequest): Promise<Blob> {
  const input = virtualInputName(file);
  const output = `out.${options.format}`;
  return runFfmpeg({
    inputs: [{ name: input, data: file }],
    args: buildFfmpegArgs(input, output, options),
    output,
    mimeType: mimeTypes[options.format],
    signal,
    onProgress,
  });
}

export interface MergeRequest {
  video: Blob;
  audio: Blob;
  /** Extensions used as format hints, e.g. "mp4" and "m4a". */
  videoExt: string;
  audioExt: string;
  signal?: AbortSignal;
  onProgress?: (fraction: number) => void;
}

/** Joins a video-only and an audio-only stream into an MP4 (stream copy, no re-encoding). */
export function mergeVideoAudio({ video, audio, videoExt, audioExt, signal, onProgress }: MergeRequest): Promise<Blob> {
  const v = virtualInputName({ name: `video.${videoExt}` });
  const a = virtualInputName({ name: `audio.${audioExt}` }).replace("input", "input-audio");
  return runFfmpeg({
    inputs: [
      { name: v, data: video },
      { name: a, data: audio },
    ],
    args: buildMergeArgs(v, a, "out.mp4"),
    output: "out.mp4",
    mimeType: mimeTypes.mp4,
    signal,
    onProgress,
  });
}
