// Client-only FFmpeg.wasm wrapper. The ~32 MB WebAssembly core is larger than
// Cloudflare's 25 MiB asset limit, so it is fetched from a pinned CDN URL on first use
// (see docs/decisions/0004-ffmpeg-core-delivery.md). Only the engine is downloaded;
// the user's media never leaves the browser.
import type { FFmpeg } from "@ffmpeg/ffmpeg";
import { ToolError } from "@opentools/core";
import { buildFfmpegArgs, mimeTypes, virtualInputName, type ConvertOptions } from "./options";

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

export interface ConvertRequest {
  file: File;
  options: ConvertOptions;
  signal?: AbortSignal;
  onProgress?: (fraction: number) => void;
}

export async function convertMedia({ file, options, signal, onProgress }: ConvertRequest): Promise<Blob> {
  const ffmpeg = await loadEngine();
  if (signal?.aborted) throw new ToolError("ABORTED", "errors.aborted");

  const input = virtualInputName(file);
  const output = `out.${options.format}`;
  const onFfmpegProgress = ({ progress }: { progress: number }) => {
    if (Number.isFinite(progress)) onProgress?.(Math.min(1, Math.max(0, progress)));
  };
  const onAbort = () => dropEngine();
  signal?.addEventListener("abort", onAbort, { once: true });
  ffmpeg.on("progress", onFfmpegProgress);

  try {
    await ffmpeg.writeFile(input, new Uint8Array(await file.arrayBuffer()));
    const code = await ffmpeg.exec(buildFfmpegArgs(input, output, options));
    if (signal?.aborted) throw new ToolError("ABORTED", "errors.aborted");
    if (code !== 0) throw new ToolError("EXECUTION", "errors.conversionFailed", { code });
    const data = (await ffmpeg.readFile(output)) as Uint8Array;
    if (data.byteLength === 0) throw new ToolError("EXECUTION", "errors.conversionFailed");
    onProgress?.(1);
    return new Blob([data as BlobPart], { type: mimeTypes[options.format] });
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
      for (const name of [input, output]) await ffmpeg.deleteFile(name).catch(() => undefined);
    }
  }
}
