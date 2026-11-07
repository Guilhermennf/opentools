import { defaultLocale, type Locale } from "./locales";

/**
 * Picks a supported locale from an ordered list of browser language tags
 * (e.g. `navigator.languages` or a parsed Accept-Language header).
 * Any Portuguese variant maps to pt-BR; any English variant to en; else English.
 */
export function matchLocale(languages: readonly (string | null | undefined)[]): Locale {
  for (const language of languages) {
    if (!language) continue;
    const normalized = language.trim().toLowerCase();
    if (normalized === "pt" || normalized.startsWith("pt-")) return "pt-BR";
    if (normalized === "en" || normalized.startsWith("en-")) return "en";
  }
  return defaultLocale;
}

/** Parses an Accept-Language header into tags ordered by descending q-value. */
export function parseAcceptLanguage(header: string | null | undefined): string[] {
  if (!header) return [];
  return header
    .split(",")
    .map((part, index) => {
      const [tag = "", ...params] = part.trim().split(";");
      const qParam = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
      const q = qParam ? Number.parseFloat(qParam.slice(2)) : 1;
      return { tag: tag.trim(), q: Number.isNaN(q) ? 0 : q, index };
    })
    .filter((entry) => entry.tag && entry.tag !== "*" && entry.q > 0)
    .sort((a, b) => b.q - a.q || a.index - b.index)
    .map((entry) => entry.tag);
}
