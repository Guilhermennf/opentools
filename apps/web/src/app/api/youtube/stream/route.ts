import { Readable } from "node:stream";
import type { NextRequest } from "next/server";
import { classifyYtDlpError, isFormatId, isVideoId, MAX_INPUT_BYTES } from "@opentools/tool-media-converter/youtube";
import { streamFormat, YtDlpError, youtubeEnabled } from "@/server/yt-dlp";
import { youtubeErrorResponse } from "../errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const FIRST_BYTE_TIMEOUT_MS = 90_000;

/**
 * GET /api/youtube/stream?v=<video id>&f=<format id>: the raw bytes of one format.
 * The response is streamed (no buffering, no size cap from the platform); the browser
 * converts or merges it with FFmpeg.wasm.
 */
export async function GET(request: NextRequest) {
  if (!youtubeEnabled()) return youtubeErrorResponse("disabled");
  const params = request.nextUrl.searchParams;
  const id = params.get("v") ?? "";
  const formatId = params.get("f") ?? "";
  if (!isVideoId(id) || !isFormatId(formatId)) return youtubeErrorResponse("invalidUrl");

  let proc;
  try {
    proc = await streamFormat(id, formatId, MAX_INPUT_BYTES, request.signal);
  } catch (error) {
    console.error("[youtube/stream]", id, formatId, error);
    return youtubeErrorResponse(error instanceof YtDlpError && !error.engine ? classifyYtDlpError(error.stderr) : "engine");
  }

  // Wait for the first bytes so failures (bot checks, removed videos) still get a real status.
  const reader = (Readable.toWeb(proc.stdout) as ReadableStream<Uint8Array>).getReader();
  const timer = setTimeout(proc.kill, FIRST_BYTE_TIMEOUT_MS);
  const first = await reader.read().catch(() => ({ done: true as const, value: undefined }));
  clearTimeout(timer);
  if (first.done) {
    const { code, stderr } = await proc.done;
    const kind = classifyYtDlpError(stderr);
    if (kind === "failed" || kind === "blocked") console.error("[youtube/stream]", kind, id, formatId, code, stderr.slice(-2000));
    return youtubeErrorResponse(kind);
  }

  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(first.value);
    },
    async pull(controller) {
      try {
        const { done, value } = await reader.read();
        if (value) controller.enqueue(value);
        if (!done) return;
        const { code, stderr } = await proc.done;
        if (code === 0) controller.close();
        else {
          console.error("[youtube/stream] ended early", id, formatId, code, stderr.slice(-2000));
          controller.error(new Error("yt-dlp failed mid-stream"));
        }
      } catch (error) {
        proc.kill();
        controller.error(error);
      }
    },
    cancel() {
      proc.kill();
      void reader.cancel().catch(() => undefined);
    },
  });

  return new Response(body, {
    headers: {
      "content-type": "application/octet-stream",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
