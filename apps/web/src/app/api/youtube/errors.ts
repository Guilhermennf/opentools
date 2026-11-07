import { NextResponse } from "next/server";
import type { YoutubeErrorCode } from "@opentools/tool-media-converter/youtube";

const STATUS: Record<YoutubeErrorCode, number> = {
  invalidUrl: 400,
  unavailable: 404,
  ageRestricted: 403,
  live: 422,
  tooLarge: 413,
  noFormats: 422,
  blocked: 503,
  disabled: 503,
  engine: 502,
  failed: 502,
};

export const youtubeErrorResponse = (code: YoutubeErrorCode) =>
  NextResponse.json({ error: code }, { status: STATUS[code], headers: { "cache-control": "no-store" } });
