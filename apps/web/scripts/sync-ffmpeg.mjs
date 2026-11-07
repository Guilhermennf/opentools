// Copies the @ffmpeg/ffmpeg ES modules into public/ffmpeg so the browser loads them as plain
// static files. Bundlers cannot resolve the dynamic core import inside its worker, and the
// files are tiny (the 32 MB WebAssembly core is fetched from a CDN, see ADR 0004).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
// pnpm links direct dependencies into apps/web/node_modules.
const from = path.join(here, "../node_modules/@ffmpeg/ffmpeg/dist/esm");
const to = path.join(here, "../public/ffmpeg");

fs.rmSync(to, { recursive: true, force: true });
fs.mkdirSync(to, { recursive: true });
for (const file of fs.readdirSync(from)) {
  if (file.endsWith(".js")) fs.copyFileSync(path.join(from, file), path.join(to, file));
}
console.log(`ffmpeg: copied ${fs.readdirSync(to).length} files to public/ffmpeg`);
