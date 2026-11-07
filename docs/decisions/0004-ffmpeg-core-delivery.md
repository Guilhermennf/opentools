# 0004: FFmpeg.wasm delivery for the Media Converter

**Status:** accepted

- `ffmpeg-core.wasm` is about 32 MB, above Cloudflare's 25 MiB per-asset limit, so it cannot be self-hosted in Workers assets. The core (`ffmpeg-core.js` + `.wasm`) is fetched at runtime from a version-pinned jsDelivr URL (`@ffmpeg/core@0.12.10`), once per visit, and cached by the browser. Override the base URL with `NEXT_PUBLIC_FFMPEG_CORE_BASE` (for example to self-host on R2 or another CDN).
- The UI tells users that the engine is downloaded from a public CDN and that their file is never uploaded. Conversion itself is local; tests assert that no non-GET request is made during a conversion.
- The `@ffmpeg/ffmpeg` wrapper (about 20 KB, 7 files) is copied into `apps/web/public/ffmpeg` by `scripts/sync-ffmpeg.mjs` (runs before `dev` and `build`) and loaded with a runtime `import()`. Bundlers (Turbopack) fail on the dynamic core import inside its worker, so it is intentionally kept out of the bundle.
- Single-threaded core: no `SharedArrayBuffer`, so no COOP/COEP headers are needed. Conversion is slower; the input limit is 500 MB.
- E2E tests serve the core from `node_modules/@ffmpeg/core` through request interception, so they run offline.
