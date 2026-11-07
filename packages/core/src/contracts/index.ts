import type { ZodType } from "zod";
import type { Locale } from "@opentools/shared";

export const toolCategories = ["developer", "media", "file", "text"] as const;
export type ToolCategory = (typeof toolCategories)[number];

export type ToolRuntime = "browser" | "worker" | "server";
export type ToolStatus = "stable" | "beta" | "coming-soon";

export interface ToolMeta {
  /** Unique, stable identifier. */
  id: string;
  /** URL slug (kebab-case), identical in every locale. */
  slug: string;
  category: ToolCategory;
  /** Lucide icon name, e.g. "file-json". */
  icon: string;
  keywords: Record<Locale, string[]>;
  runtime: ToolRuntime;
  version: string;
  status: ToolStatus;
  /** Slugs of related tools. */
  related: string[];
}

export interface ToolFaqItem {
  question: string;
  answer: string;
}

export interface ToolContent {
  instructions?: string[];
  formats?: string[];
  technical?: string;
  examples?: string[];
  privacy?: string;
  faq?: ToolFaqItem[];
}

export interface ToolMessages {
  name: string;
  tagline: string;
  description: string;
  seo: { title: string; description: string };
  content?: ToolContent;
}

export interface ToolDefinition {
  meta: ToolMeta;
  /** Original ASCII illustration (no language-specific text inside). */
  ascii: string;
  /** Accessible description of the illustration, per locale. */
  asciiLabel: Record<Locale, string>;
  messages: Record<Locale, ToolMessages>;
}

export interface ToolContext {
  signal?: AbortSignal;
  onProgress?: (progress: number) => void;
}

export interface ToolModule<I, O> {
  inputSchema: ZodType<I>;
  execute(input: I, ctx: ToolContext): Promise<O>;
}
