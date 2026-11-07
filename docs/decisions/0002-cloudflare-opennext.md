# 0002: Host Next.js on Cloudflare Workers via OpenNext

**Status:** accepted, deploy path not yet verified

Use `@opennextjs/cloudflare` so the proxy can read the locale cookie and `Accept-Language` on the server.

**Known issues:**
- Next 16 `proxy.ts` runs on the Node.js runtime, which OpenNext marks as experimental on Cloudflare. If it misbehaves, fall back to an edge `middleware.ts`.
- `opennextjs-cloudflare build` fails on Windows without symlink permission (`EPERM`). Build in CI (Linux) or WSL, or enable Windows Developer Mode.

Run the preview on Linux and re-check the `/` redirect before the first deploy (Phase 05).
