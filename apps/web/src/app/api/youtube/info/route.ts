import { NextResponse, type NextRequest } from "next/server";
import {
  classifyYtDlpError,
  parseYoutubeId,
  summarizeVideo,
  YoutubeError,
  type YoutubeErrorCode,
  type YtDlpVideo,
} from "@opentools/tool-media-converter/youtube";
import { fetchVideoJson, YtDlpError, youtubeEnabled } from "@/server/yt-dlp";
import { youtubeErrorResponse } from "../errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** GET /api/youtube/info?v=<video id or YouTube link>: title, duration and the formats on offer. */
export async function GET(request: NextRequest) {
  if (!youtubeEnabled()) return youtubeErrorResponse("disabled");
  const id = parseYoutubeId(request.nextUrl.searchParams.get("v") ?? "");
  if (!id) return youtubeErrorResponse("invalidUrl");
  try {
    const raw = (await fetchVideoJson(id, request.signal)) as YtDlpVideo;
    const video = summarizeVideo({ ...raw, id });
    return NextResponse.json(video, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    let code: YoutubeErrorCode = "failed";
    if (error instanceof YoutubeError) code = error.code;
    else if (error instanceof YtDlpError) code = error.engine ? "engine" : classifyYtDlpError(error.stderr);
    if (code === "failed" || code === "engine") console.error("[youtube/info]", id, error);
    return youtubeErrorResponse(code);
  }
}
