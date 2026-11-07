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

Client-side by default (the Media Converter's YouTube relay is the exception, see ADR 0005). `runTool` validates input with Zod and maps failures to `ToolError` with an i18n `messageKey`. A Web Worker bridge arrives with the Hash Generator (Phase 03). The Hono API Worker arrives in Phase 04.

## Tool implementations

- **Hash Generator** (`packages/tools/developer/hash-generator`): SHA-1/256/384/512 via Web Crypto, MD5 in pure TypeScript (processed in place, no padded copy). Large inputs run in a module Web Worker; files up to 512 MB.
- **JSON Formatter** (`packages/tools/developer/json-formatter`): a hand-written parser instead of `JSON.parse` + `JSON.stringify`. It reports exact line/column with a machine-readable error code (localized in the UI) and keeps number literals, key order and duplicate keys verbatim. Tested for agreement with `JSON.parse`.
- **Media Converter** (`packages/tools/media/media-converter`): FFmpeg.wasm converts a user's file or a direct link to MP3 or MP4 in the browser. YouTube links go through two Node.js routes (`apps/web/src/app/api/youtube`) that relay streams with yt-dlp; the browser then converts or merges them. Pure helpers (arguments, names, URL checks, format choice) are unit tested. See ADR 0004 and 0005.
