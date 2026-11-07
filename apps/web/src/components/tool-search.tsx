"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import type { ToolDefinition } from "@opentools/core";
import { normalizeSearch, type Locale } from "@opentools/shared";
import { ToolCard } from "./tool-card";

/** Client-side search over serializable tool data (mirrors Registry.search). */
export function ToolSearch({ tools }: { tools: ToolDefinition[] }) {
  const t = useTranslations("toolsPage");
  const locale = useLocale() as Locale;
  const [query, setQuery] = React.useState("");

  const results = React.useMemo(() => {
    const terms = normalizeSearch(query).split(/\s+/).filter(Boolean);
    if (terms.length === 0) return tools;
    return tools.filter((d) => {
      const m = d.messages[locale];
      const hay = normalizeSearch([m.name, m.tagline, m.description, ...d.meta.keywords[locale], d.meta.slug].join(" "));
      return terms.every((term) => hay.includes(term));
    });
  }, [query, tools, locale]);

  return (
    <div>
      <label className="label-mono mb-2 block" htmlFor="tool-search">
        {t("searchLabel")}
      </label>
      <input
        id="tool-search"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("searchPlaceholder")}
        className="bg-background h-11 w-full max-w-md rounded-md border px-3 text-base"
      />
      <p className="text-muted-foreground mt-3 text-sm" aria-live="polite">
        {t("count", { count: results.length })}
      </p>
      {results.length === 0 ? (
        <p className="mt-8">{t("noResults")}</p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((tool) => (
            <ToolCard key={tool.meta.id} tool={tool} />
          ))}
        </div>
      )}
    </div>
  );
}
