# Architecture

Modular monolith in a pnpm + Turborepo monorepo.

```text
apps/web ──► packages/core ──► packages/shared
   │              ▲
   ├──► packages/ui
   └──► packages/tools/*/*  (each depends on core)
```

- **`packages/shared`**: locales, `matchLocale`, `parseAcceptLanguage`, `normalizeSearch`. No framework code.
- **`packages/core`**: contracts (`ToolDefinition`, `ToolMeta`, `ToolModule`), `createRegistry`, `runTool`, `ToolError`. No React.
- **`packages/ui`**: Tailwind v4 tokens, ASCII art, shared components. Labels arrive as props, so it knows nothing about i18n.
- **`packages/tools/<category>/<tool>`**: metadata, ASCII art and bilingual messages per tool.
- **`apps/web`**: routes under `app/[locale]`, next-intl, SEO utilities, the tool registry.

Packages are source-only (no build step); Next transpiles them via `transpilePackages`.

## Registry

`createRegistry` validates at build time: unique id/slug, kebab-case slugs, existing `related` slugs, messages for every locale. A broken tool fails the build.

## Tool pages

`/[locale]/tools/[slug]` renders `ToolShell`: header, ASCII art, the tool UI (from `apps/web/src/tools/components.ts`, or a "coming soon" state), then content sections that exist in the tool's messages, and related tools. Pages are statically generated for every locale × slug.

## Execution

Client-side by default. `runTool` validates input with Zod and maps failures to `ToolError` with an i18n `messageKey`. A Web Worker bridge arrives with the Hash Generator (Phase 03). The Hono API Worker arrives in Phase 04.
