import { describe, expect, it } from "vitest";
import {
  buildFfmpegArgs,
  isAudioOnly,
  isLikelyMedia,
  isPlatformHost,
  outputFileName,
  parseMediaUrl,
  virtualInputName,
} from "./options";

const opts = { format: "mp3", mp3Bitrate: 192, mp4Quality: "standard" } as const;

describe("buildFfmpegArgs", () => {
  it("builds an mp3 command that drops video", () => {
    const args = buildFfmpegArgs("input.mp4", "out.mp3", opts);
    expect(args).toEqual(["-i", "input.mp4", "-vn", "-c:a", "libmp3lame", "-b:a", "192k", "out.mp3"]);
  });
  it("builds a compatible mp4 command with quality presets", () => {
    const std = buildFfmpegArgs("in.mov", "out.mp4", { ...opts, format: "mp4" });
    const high = buildFfmpegArgs("in.mov", "out.mp4", { ...opts, format: "mp4", mp4Quality: "high" });
    expect(std[std.indexOf("-crf") + 1]).toBe("28");
    expect(high[high.indexOf("-crf") + 1]).toBe("23");
    expect(std).toContain("yuv420p");
    expect(std).toContain("+faststart");
    expect(std.at(-1)).toBe("out.mp4");
  });
});

describe("file helpers", () => {
  it("detects media by type or extension", () => {
    expect(isLikelyMedia({ name: "a.bin", type: "video/mp4" })).toBe(true);
    expect(isLikelyMedia({ name: "clip.MKV", type: "" })).toBe(true);
    expect(isLikelyMedia({ name: "notes.txt", type: "text/plain" })).toBe(false);
  });
  it("detects audio-only input", () => {
    expect(isAudioOnly({ name: "a.mp3", type: "" })).toBe(true);
    expect(isAudioOnly({ name: "a.bin", type: "audio/ogg" })).toBe(true);
    expect(isAudioOnly({ name: "a.mp4", type: "video/mp4" })).toBe(false);
  });
  it("names the virtual input safely", () => {
    expect(virtualInputName({ name: "My Video.MOV" })).toBe("input.mov");
    expect(virtualInputName({ name: "weird.ext!ension" })).toBe("input");
    expect(virtualInputName({ name: "noext" })).toBe("input");
  });
  it("derives a clean output name", () => {
    expect(outputFileName("Meu vídeo (1).mov", "mp3")).toBe("Meu vídeo _1_.mp3");
    expect(outputFileName("a.b.c.mp4", "mp3")).toBe("a.b.c.mp3");
    expect(outputFileName(".mp4", "mp3")).toBe(".mp4.mp3");
    expect(outputFileName("", "mp4")).toBe("converted.mp4");
    expect(outputFileName("x".repeat(300) + ".wav", "mp3").length).toBe(104);
  });
});

describe("parseMediaUrl", () => {
  it("accepts direct http(s) links", () => {
    expect(parseMediaUrl(" https://example.com/a/b.mp4?x=1 ").pathname).toBe("/a/b.mp4");
    expect(parseMediaUrl("http://example.com/a.mp3").protocol).toBe("http:");
  });
  it("rejects invalid links, other schemes and embedded credentials", () => {
    for (const bad of ["", "not a url", "ftp://example.com/a.mp4", "file:///etc/passwd", "javascript:alert(1)", "https://user:pw@example.com/a.mp4"]) {
      expect(() => parseMediaUrl(bad), bad).toThrowError(/invalidUrl/);
    }
  });
  it("rejects video platforms, including subdomains and look-alikes only when real", () => {
    for (const url of ["https://www.youtube.com/watch?v=x", "https://youtu.be/x", "https://m.youtube.com/x", "https://vimeo.com/1", "https://x.com/a/status/1"]) {
      expect(() => parseMediaUrl(url), url).toThrowError(/platformNotSupported/);
    }
    expect(isPlatformHost("notyoutube.com")).toBe(false);
    expect(isPlatformHost("youtube.com.evil.example")).toBe(false);
    expect(() => parseMediaUrl("https://cdn.example.com/video.mp4")).not.toThrow();
  });
});
