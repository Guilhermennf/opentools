import { locales, normalizeSearch, type Locale } from "@opentools/shared";
import { toolCategories, type ToolCategory, type ToolDefinition } from "../contracts";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export interface Registry {
  all(): readonly ToolDefinition[];
  getBySlug(slug: string): ToolDefinition | undefined;
  byCategory(category: ToolCategory): ToolDefinition[];
  /** Categories that contain at least one tool. */
  categories(): ToolCategory[];
  related(slug: string): ToolDefinition[];
  search(query: string, locale: Locale): ToolDefinition[];
}

/** Builds a registry and fails fast on invalid definitions (runs at build time). */
export function createRegistry(defs: readonly ToolDefinition[]): Registry {
  const ids = new Set<string>();
  const slugs = new Set<string>();

  for (const def of defs) {
    const { id, slug } = def.meta;
    if (!SLUG_RE.test(slug)) throw new Error(`Tool "${id}": slug "${slug}" must be kebab-case`);
    if (ids.has(id)) throw new Error(`Duplicate tool id "${id}"`);
    if (slugs.has(slug)) throw new Error(`Duplicate tool slug "${slug}"`);
    ids.add(id);
    slugs.add(slug);
    for (const locale of locales) {
      if (!def.messages[locale]) throw new Error(`Tool "${id}": missing messages for "${locale}"`);
    }
  }
  for (const def of defs) {
    for (const rel of def.meta.related) {
      if (!slugs.has(rel)) throw new Error(`Tool "${def.meta.id}": related slug "${rel}" not found`);
      if (rel === def.meta.slug) throw new Error(`Tool "${def.meta.id}": cannot relate to itself`);
    }
  }

  const list = Object.freeze([...defs]);
  const bySlug = new Map(list.map((d) => [d.meta.slug, d]));

  return {
    all: () => list,
    getBySlug: (slug) => bySlug.get(slug),
    byCategory: (category) => list.filter((d) => d.meta.category === category),
    categories: () => toolCategories.filter((c) => list.some((d) => d.meta.category === c)),
    related: (slug) =>
      (bySlug.get(slug)?.meta.related ?? []).flatMap((s) => {
        const d = bySlug.get(s);
        return d ? [d] : [];
      }),
    search(query, locale) {
      const terms = normalizeSearch(query).split(/\s+/).filter(Boolean);
      if (terms.length === 0) return [...list];
      return list.filter((d) => {
        const m = d.messages[locale];
        const haystack = normalizeSearch(
          [m.name, m.tagline, m.description, ...d.meta.keywords[locale], d.meta.slug].join(" "),
        );
        return terms.every((t) => haystack.includes(t));
      });
    },
  };
}
