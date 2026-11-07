# Contributing to OpenTools

Thanks for helping. Please read the [Code of Conduct](./CODE_OF_CONDUCT.md) first.

## Setup

```bash
pnpm install
pnpm dev
```

## Ground rules

- **Both languages, always.** A feature is not done unless it works in `en` and `pt-BR`. No hardcoded UI strings; use the message files. Machine translations must be reviewed.
- **Privacy first.** Process data in the browser whenever possible. Never store users' files.
- **Free.** No paywalls, accounts or usage limits for core tools.
- **Respect copyright and platform terms.** Do not add features that bypass access controls or extract protected streams.
- **Accurate content.** SEO text and structured data must describe what the tool actually does.

## Before opening a PR

```bash
pnpm typecheck && pnpm lint && pnpm test
pnpm build && pnpm test:e2e
```

Tool authors: follow [docs/adding-a-tool.md](../docs/adding-a-tool.md). Suggest a tool or report a bug via GitHub Issues.
