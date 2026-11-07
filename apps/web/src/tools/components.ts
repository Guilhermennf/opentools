import dynamic from "next/dynamic";
import type { ComponentType } from "react";

/**
 * Maps a tool slug to its interactive UI. A slug without an entry renders the
 * "coming soon" state. Heavy code is loaded lazily with next/dynamic.
 */
export const toolComponents: Record<string, ComponentType | undefined> = {
  "hash-generator": dynamic(() => import("./ui/hash-generator")),
  "json-formatter": dynamic(() => import("./ui/json-formatter")),
  "media-converter": dynamic(() => import("./ui/media-converter")),
};
