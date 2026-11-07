// Server-only yt-dlp runner for the Media Converter's YouTube source.
//
// The standalone yt-dlp binary is fetched at runtime from the official GitHub release,
// verified against the release's SHA2-256SUMS and cached in the temp directory, so a cold
// serverless instance always runs a recent build (YouTube breaks old ones often).
// See docs/decisions/0005-youtube-downloads.md.
import { spawn, type ChildProcessByStdio } from "node:child_process";
import { createHash } from "node:crypto";
import { chmod, mkdir, rename, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { Readable } from "node:stream";
import { watchUrl } from "@opentools/tool-media-converter/youtube";

const RELEASE_BASE = "https://github.com/yt-dlp/yt-dlp/releases/latest/download";
const REFRESH_AFTER_MS = 24 * 60 * 60 * 1000;
const STDERR_LIMIT = 16 * 1024;
const workDir = () => path.join(os.tmpdir(), "opentools-yt-dlp");

/** Set YOUTUBE_DOWNLOAD=off to switch the feature off without a deploy. */
export const youtubeEnabled = () => !/^(off|false|0|disabled)$/i.test(process.env.YOUTUBE_DOWNLOAD ?? "");

export class YtDlpError extends Error {
  constructor(
    message: string,
    readonly stderr = "",
    readonly engine = false,
  ) {
    super(message);
    this.name = "YtDlpError";
  }
}

function assetName(): string {
  const { platform, arch } = process;
  if (platform === "win32") return arch === "arm64" ? "yt-dlp_arm64.exe" : arch === "ia32" ? "yt-dlp_x86.exe" : "yt-dlp.exe";
  if (platform === "darwin") return "yt-dlp_macos";
  if (platform === "linux") return arch === "arm64" ? "yt-dlp_linux_aarch64" : "yt-dlp_linux";
  throw new YtDlpError(`No yt-dlp build for ${platform}/${arch}`, "", true);
}

async function download(target: string): Promise<void> {
  const name = assetName();
  const [sums, binary] = await Promise.all([
    fetch(`${RELEASE_BASE}/SHA2-256SUMS`).then((r) => (r.ok ? r.text() : Promise.reject(new Error(`SHA2-256SUMS: HTTP ${r.status}`)))),
    fetch(`${RELEASE_BASE}/${name}`).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(`${name}: HTTP ${r.status}`)))),
  ]);
  const expected = sums
    .split("\n")
    .map((line) => line.trim().split(/\s+/))
    .find(([, file]) => file === name)?.[0];
  const actual = createHash("sha256").update(new Uint8Array(binary)).digest("hex");
  if (!expected || expected.toLowerCase() !== actual) throw new Error(`Checksum mismatch for ${name}`);
  const temp = `${target}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temp, new Uint8Array(binary), { mode: 0o755 });
  await chmod(temp, 0o755);
  await rename(temp, target);
}

let resolving: Promise<string> | null = null;

/** Path to a usable yt-dlp binary: YTDLP_PATH, a fresh cached download, or a new download. */
export function ytDlpBinary(): Promise<string> {
  const configured = process.env.YTDLP_PATH;
  if (configured) return Promise.resolve(configured);
  resolving ??= (async () => {
    const dir = workDir();
    const target = path.join(dir, assetName());
    await mkdir(dir, { recursive: true });
    const cached = await stat(target).catch(() => null);
    if (cached && Date.now() - cached.mtimeMs < REFRESH_AFTER_MS) return target;
    try {
      await download(target);
    } catch (cause) {
      if (cached) return target; // Keep working with the older build when GitHub is unreachable.
      throw new YtDlpError(`Could not install yt-dlp: ${String(cause)}`, "", true);
    }
    return target;
  })().finally(() => {
    resolving = null;
  });
  return resolving;
}

let cookiesFile: Promise<string | null> | null = null;

/**
 * Optional Netscape cookies (YOUTUBE_COOKIES, raw or base64) for when YouTube asks the
 * server to sign in. Use a throwaway account: the cookies grant access to it.
 */
function cookiesPath(): Promise<string | null> {
  cookiesFile ??= (async () => {
    const raw = process.env.YOUTUBE_COOKIES?.trim();
    if (!raw) return null;
    const text = raw.includes("\t") ? raw : Buffer.from(raw, "base64").toString("utf8");
    const file = path.join(workDir(), "cookies.txt");
    await mkdir(workDir(), { recursive: true });
    await writeFile(file, text.endsWith("\n") ? text : `${text}\n`, { mode: 0o600 });
    return file;
  })();
  return cookiesFile;
}

async function baseArgs(): Promise<string[]> {
  const args = [
    "--ignore-config",
    "--no-playlist",
    "--no-progress",
    "--no-color",
    "--cache-dir", path.join(workDir(), "cache"),
    // YouTube challenges need a JavaScript runtime; reuse the Node.js running this server.
    "--no-js-runtimes",
    "--js-runtimes", `node:${process.execPath}`,
  ];
  const cookies = await cookiesPath();
  if (cookies) args.push("--cookies", cookies);
  if (process.env.YOUTUBE_PROXY) args.push("--proxy", process.env.YOUTUBE_PROXY);
  if (process.env.YTDLP_EXTRACTOR_ARGS) args.push("--extractor-args", process.env.YTDLP_EXTRACTOR_ARGS);
  return args;
}

type Proc = ChildProcessByStdio<null, Readable, Readable>;

export interface YtDlpRun {
  stdout: Readable;
  /** Resolves when the process exits, with its code and the tail of stderr. */
  done: Promise<{ code: number | null; stderr: string }>;
  kill: () => void;
}

async function run(extra: string[], signal?: AbortSignal): Promise<YtDlpRun> {
  const binary = await ytDlpBinary();
  const args = [...(await baseArgs()), ...extra];
  let proc: Proc;
  try {
    proc = spawn(binary, args, { stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
  } catch (cause) {
    throw new YtDlpError(`Could not start yt-dlp: ${String(cause)}`, "", true);
  }
  let stderr = "";
  proc.stderr.setEncoding("utf8");
  proc.stderr.on("data", (chunk: string) => {
    stderr = (stderr + chunk).slice(-STDERR_LIMIT);
  });
  const kill = () => {
    if (proc.exitCode === null && !proc.killed) proc.kill("SIGKILL");
  };
  signal?.addEventListener("abort", kill, { once: true });
  const done = new Promise<{ code: number | null; stderr: string }>((resolve) => {
    proc.once("error", (error) => {
      stderr += `\n${String(error)}`;
      resolve({ code: -1, stderr });
    });
    proc.once("close", (code) => {
      signal?.removeEventListener("abort", kill);
      resolve({ code, stderr });
    });
  });
  return { stdout: proc.stdout, done, kill };
}

/** Video metadata and formats (`yt-dlp -J`). */
export async function fetchVideoJson(id: string, signal?: AbortSignal, timeoutMs = 60_000): Promise<unknown> {
  const proc = await run(["-J", "--", watchUrl(id)], signal);
  const timer = setTimeout(proc.kill, timeoutMs);
  const chunks: Buffer[] = [];
  proc.stdout.on("data", (c: Buffer) => chunks.push(c));
  const { code, stderr } = await proc.done;
  clearTimeout(timer);
  if (code !== 0) throw new YtDlpError(`yt-dlp exited with ${code}`, stderr, code === -1);
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new YtDlpError("yt-dlp returned invalid JSON", stderr);
  }
}

/** Streams one format to stdout (`yt-dlp -f <id> -o -`). */
export function streamFormat(id: string, formatId: string, maxBytes: number, signal?: AbortSignal): Promise<YtDlpRun> {
  return run(["-f", formatId, "--max-filesize", String(maxBytes), "--no-part", "-o", "-", "--", watchUrl(id)], signal);
}
