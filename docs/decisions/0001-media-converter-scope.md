# 0001: Tool 01 is a local Media Converter, not a downloader

**Status:** superseded by [0005](0005-youtube-downloads.md)

The spec's Video & Audio Downloader would need to fetch media from third-party platforms. That conflicts with the spec's own rule not to bypass platform restrictions or extract protected streams, and with platform terms.

**Decision:** Tool 01 becomes the *Media Converter* (`media-converter`). It converts files the user provides (and direct links to publicly accessible files) to MP4/MP3 in the browser with FFmpeg.wasm. It never extracts streams from platforms.

**Consequences:** fully client-side (matches Privacy First), no backend cost. Slug, SEO copy and keywords describe converting, not downloading. The original spec file is left unchanged.
