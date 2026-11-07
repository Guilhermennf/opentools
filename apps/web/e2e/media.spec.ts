import fs from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

test.setTimeout(120_000);

const CORE_DIR = path.resolve(process.cwd(), "node_modules/@ffmpeg/core/dist/esm");

/** One second of a 440 Hz tone: 16-bit mono PCM WAV at 8 kHz. */
function wav(): Buffer {
  const rate = 8000;
  const samples = rate;
  const data = Buffer.alloc(samples * 2);
  for (let i = 0; i < samples; i++) data.writeInt16LE(Math.round(Math.sin((2 * Math.PI * 440 * i) / rate) * 12000), i * 2);
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVEfmt ", 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(rate, 24);
  header.writeUInt32LE(rate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

/** Serve the FFmpeg core from node_modules so tests need no network. */
async function serveCore(page: Page) {
  await page.route("https://cdn.jsdelivr.net/npm/@ffmpeg/core@*/dist/esm/*", async (route) => {
    const file = route.request().url().split("/").pop()!;
    await route.fulfill({
      body: fs.readFileSync(path.join(CORE_DIR, file)),
      contentType: file.endsWith(".wasm") ? "application/wasm" : "text/javascript",
      headers: { "access-control-allow-origin": "*" },
    });
  });
}

const upload = (page: Page, label: string, name: string, buffer: Buffer, mimeType: string) =>
  page.getByLabel(label).setInputFiles({ name, mimeType, buffer });

test("converts a WAV file to MP3 locally and offers a download", async ({ page }) => {
  await serveCore(page);
  await page.goto("/en/tools/media-converter");
  await upload(page, "Media file", "tone.wav", wav(), "audio/wav");
  await expect(page.getByTestId("media-info")).toContainText("tone.wav");
  await expect(page.getByTestId("media-info")).toContainText("0:01");
  await page.getByRole("button", { name: "Convert", exact: true }).click();
  const result = page.getByTestId("media-result");
  await expect(result).toBeVisible({ timeout: 90_000 });
  const link = result.getByRole("link", { name: /Download tone\.mp3/ });
  await expect(link).toBeVisible();
  const head = await page.evaluate(async (href) => {
    const buf = new Uint8Array(await (await fetch(href)).arrayBuffer());
    return { size: buf.length, bytes: Array.from(buf.slice(0, 3)) };
  }, (await link.getAttribute("href"))!);
  expect(head.size).toBeGreaterThan(1000);
  // MP3 starts with an ID3 tag or an MPEG frame sync.
  const isId3 = head.bytes[0] === 0x49 && head.bytes[1] === 0x44 && head.bytes[2] === 0x33;
  const isFrame = head.bytes[0] === 0xff && ((head.bytes[1] ?? 0) & 0xe0) === 0xe0;
  expect(isId3 || isFrame).toBe(true);
});

test("never sends the file anywhere while converting", async ({ page }) => {
  await serveCore(page);
  const posts: string[] = [];
  page.on("request", (r) => {
    if (r.method() !== "GET") posts.push(`${r.method()} ${r.url()}`);
  });
  await page.goto("/en/tools/media-converter");
  await upload(page, "Media file", "tone.wav", wav(), "audio/wav");
  await page.getByRole("button", { name: "Convert", exact: true }).click();
  await expect(page.getByTestId("media-result")).toBeVisible({ timeout: 90_000 });
  expect(posts).toEqual([]);
});

test("explains problems: audio to MP4, non-media files, empty selection", async ({ page }) => {
  await serveCore(page);
  await page.goto("/en/tools/media-converter");
  await page.getByRole("button", { name: "Convert", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Choose a file first." })).toBeVisible();
  await upload(page, "Media file", "notes.txt", Buffer.from("hello"), "text/plain");
  await page.getByRole("button", { name: "Convert", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "does not look like an audio or video" })).toBeVisible();
  await upload(page, "Media file", "tone.wav", wav(), "audio/wav");
  await page.getByLabel("Convert to").selectOption("mp4");
  await page.getByRole("button", { name: "Convert", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "has no video" })).toBeVisible();
});

test("loads a direct link and rejects video platforms", async ({ page }) => {
  await page.route("https://files.example.test/tone.wav", (route) =>
    route.fulfill({ body: wav(), contentType: "audio/wav", headers: { "access-control-allow-origin": "*" } }),
  );
  await page.goto("/pt-BR/tools/media-converter");
  await page.getByRole("radio", { name: "Link" }).click();
  await page.getByLabel("Link direto para um arquivo de mídia").fill("https://www.youtube.com/watch?v=abc");
  await page.getByRole("button", { name: "Carregar arquivo" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "plataformas de vídeo" })).toBeVisible();
  await page.getByLabel("Link direto para um arquivo de mídia").fill("https://files.example.test/tone.wav");
  await page.getByRole("button", { name: "Carregar arquivo" }).click();
  await expect(page.getByTestId("media-info")).toContainText("tone.wav");
});

test("reports an engine load failure clearly", async ({ page }) => {
  await page.route("https://cdn.jsdelivr.net/**", (route) => route.abort());
  await page.goto("/en/tools/media-converter");
  await upload(page, "Media file", "tone.wav", wav(), "audio/wav");
  await page.getByRole("button", { name: "Convert", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Could not load the converter" })).toBeVisible({ timeout: 30_000 });
});
