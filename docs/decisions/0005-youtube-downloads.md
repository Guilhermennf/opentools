# 0005: YouTube downloads in the Media Converter

**Status:** accepted, supersedes [0001](0001-media-converter-scope.md)

The owner decided the Media Converter should also download YouTube videos as MP3 or MP4, on the public site too. Two things make this risky, and this ADR records them: it goes against YouTube's Terms of Service (a takedown or a host complaint is possible), and YouTube often blocks requests that come from datacenter IPs.

**Decision:**

- **A server relay, a browser converter.** The browser cannot read YouTube streams (CORS, signed and IP-bound URLs), so two Node.js route handlers run [yt-dlp](https://github.com/yt-dlp/yt-dlp):
  - `GET /api/youtube/info?v=<id>`: `yt-dlp -J`, reduced by `summarizeVideo` to a title, a duration, the best M4A audio and one H.264 MP4 stream per resolution up to 1080p. Options above 500 MB are dropped.
  - `GET /api/youtube/stream?v=<id>&f=<format id>`: `yt-dlp -f <id> -o -`, streamed straight through. Streaming avoids the 4.5 MB response limit on Vercel Functions. The route waits for the first bytes, so bot checks and removed videos still get a real HTTP status.
  - The browser converts the audio to MP3, or joins video and audio into an MP4 with `-c copy` (no re-encoding), with the same FFmpeg.wasm engine as local files. Nothing is stored on the server.
- **Only ids reach yt-dlp.** Routes accept an 11-character video id and a plain format id (`[A-Za-z0-9_-]`, no selector syntax), build the watch URL themselves and spawn yt-dlp with an argument array (no shell).
- **The yt-dlp binary is downloaded at runtime.** YouTube breaks old yt-dlp builds often, so a cold instance downloads the latest standalone build from the official GitHub release, checks it against the release's `SHA2-256SUMS` and caches it in the temp directory for 24 hours. `YTDLP_PATH` points at an installed binary instead.
- **Node.js solves YouTube's JavaScript challenges.** yt-dlp needs a JavaScript runtime for YouTube; the routes pass the Node.js binary that runs the server (`--js-runtimes node:<execPath>`, Node 22 or newer).

**Environment variables** (all optional):

| Variable | Effect |
| --- | --- |
| `YOUTUBE_DOWNLOAD=off` | Turns the feature off without a deploy (routes answer `disabled`). |
| `YOUTUBE_COOKIES` | Netscape cookies (raw or base64) passed with `--cookies` when YouTube asks the server to sign in. Use a throwaway account: anyone with the cookies can use it, and the account can be banned. |
| `YOUTUBE_PROXY` | Passed to `--proxy`, for example a residential proxy when datacenter IPs are blocked. |
| `YTDLP_EXTRACTOR_ARGS` | Passed to `--extractor-args`, for example YouTube client or PO token settings. |
| `YTDLP_PATH` | Use this yt-dlp binary instead of downloading one. |

**Consequences:**

- The tool is no longer browser-only. Bandwidth for every YouTube download goes through the host (`maxDuration` is 300 s for streams); watch usage, because there is no rate limiting yet.
- Works locally and on Vercel (Node.js runtime). It cannot work on Cloudflare Workers (no child processes), so the OpenNext deploy from ADR 0002 would answer `engine` errors.
- When YouTube blocks the server, users see "temporarily blocking our server". Cookies or a proxy are the fixes; neither is configured by default.
- Tests never touch YouTube: unit tests cover link parsing, format choice and error classification; E2E tests fake the two routes.
