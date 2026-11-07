"use client";

import { useTranslations } from "next-intl";
import { ToolErrorBox } from "@opentools/ui";

export const fieldClass =
  "bg-background w-full rounded-md border px-3 py-2 font-mono text-sm leading-relaxed placeholder:text-muted-foreground";
export const selectClass = "bg-background h-9 rounded-md border px-2 text-sm";
export const labelClass = "label-mono mb-1.5 block";

/** Shows a ToolError's i18n key (always "errors.<name>") translated, with a safe fallback. */
export function ErrorFromKey({ messageKey }: { messageKey: string }) {
  const t = useTranslations("errors");
  const name = messageKey.startsWith("errors.") ? messageKey.slice("errors.".length) : "unexpected";
  const known = ["aborted", "invalidInput", "unexpected", "unsupported", "fileTooLarge"] as const;
  const key = (known as readonly string[]).includes(name) ? (name as (typeof known)[number]) : "unexpected";
  return <ToolErrorBox title={t(key)} />;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[i]}`;
}
