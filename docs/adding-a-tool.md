# Adding a tool

1. Create `packages/tools/<category>/<slug>/` with `package.json` (copy a sibling, rename to `@opentools/tool-<slug>`), `tsconfig.json` and `eslint.config.mjs`.
2. Add `src/ascii.ts` (original art, no text), `src/messages/en.json` and `src/messages/pt-BR.json` (name, tagline, description, `seo`, optional `content`), and `src/index.ts` exporting a `ToolDefinition`.
3. Register it: add the package to `apps/web/package.json` dependencies and `transpilePackages` in `next.config.ts`, then add one line to `apps/web/src/tools/registry.ts`.
4. Put the logic in the tool package and export a runtime module (`ToolModule`: Zod schema + `execute`) from a `./client` entry, with unit tests. Put the React UI in `apps/web/src/tools/ui/<slug>.tsx` (strings under `toolUi.<tool>` in both message files) and map the slug in `apps/web/src/tools/components.ts` with `next/dynamic`. Show errors from `ToolError.messageKey`, never raw text.
5. Set `status` to `stable` or `beta` once the UI works. While `coming-soon`, the page is `noindex`.
6. Run `pnpm install`, then `pnpm typecheck lint test build test:e2e`.

Checklist: both languages complete, validation and error states, loading state, copy/download where relevant, responsive, accessible, tests for valid, invalid and edge inputs.
