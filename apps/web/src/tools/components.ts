import type { ComponentType } from "react";

/**
 * Maps a tool slug to its interactive UI. Empty until Phase 03; the tool page
 * falls back to a "coming soon" state when a slug has no component.
 * Example: "json-formatter": dynamic(() => import("@opentools/tool-json-formatter/ui")),
 */
export const toolComponents: Record<string, ComponentType | undefined> = {};
