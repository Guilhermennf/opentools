import { base } from "@opentools/config/eslint";
import next from "eslint-config-next";

// public/ffmpeg is vendored third-party code copied by scripts/sync-ffmpeg.mjs.
const config = [{ ignores: ["public/ffmpeg/**"] }, ...next, ...base];
export default config;
