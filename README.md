# OpenTools

**Useful tools. Zero nonsense.** · **Ferramentas úteis. Zero complicação.**

Free, open-source and privacy-first online tools, in English and Portuguese (Brazil). No accounts, no subscriptions, no limits. Tools run in your browser whenever possible.

Ferramentas online gratuitas, de código aberto e focadas em privacidade, em inglês e português (Brasil). Sem contas, sem assinaturas, sem limites. As ferramentas rodam no navegador sempre que possível.

## Status

Phases 01-02 (foundation, core architecture) and Phase 03 for **Hash Generator** and **JSON Formatter** are done. The Media Converter is registered as "coming soon". Next: Media Converter, then community (Phase 04) and launch SEO (Phase 05).

## Stack

Next.js (App Router) · TypeScript · next-intl · Tailwind CSS v4 · pnpm + Turborepo · Cloudflare Workers via OpenNext · Vitest · Playwright

## Getting started

Requires Node 22+ and pnpm 10+.

```bash
pnpm install
pnpm dev
```

| Command | What it does |
|---|---|
| `pnpm dev` | Dev server at http://localhost:3000 |
| `pnpm build` | Build every package |
| `pnpm typecheck` | Type-check every package |
| `pnpm lint` | ESLint everywhere |
| `pnpm test` | Unit tests (Vitest) |
| `pnpm test:e2e` | End-to-end tests (needs a prior `pnpm build`) |

## Layout

```text
apps/web          Next.js app (routes, i18n, SEO)
packages/core     Tool contracts, registry, engine (framework-agnostic)
packages/shared   Locales, language matching, search normalization
packages/ui       Design system (Tailwind tokens, ASCII art, components)
packages/tools    One package per tool
docs/             Architecture, i18n, design system, ADRs
```

See [docs/adding-a-tool.md](./docs/adding-a-tool.md) to add a tool, and [CONTRIBUTING](./.github/CONTRIBUTING.md) to contribute.

## License

[MIT](./LICENSE)
