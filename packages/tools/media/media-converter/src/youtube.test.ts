import { describe, expect, it } from "vitest";
import { buildMergeArgs, parseMediaUrl } from "./options";
import {
  classifyYtDlpError,
  isFormatId,
  parseYoutubeId,
  summarizeVideo,
  youtubeErrorKey,
  youtubeFileName,
  type YtDlpFormat,
  type YtDlpVideo,
} from "./youtube";

describe("parseYoutubeId", () => {
  it("accepts every common link shape and bare ids", () => {
    for (const link of [
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://youtube.com/watch?v=dQw4w9WgXcQ&t=42s&list=PL123",
      "https://m.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://music.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://youtu.be/dQw4w9WgXcQ?si=abc",
      "https://www.youtube.com/shorts/dQw4w9WgXcQ",
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
      "https://www.youtube.com/live/dQw4w9WgXcQ",
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
      "youtube.com/watch?v=dQw4w9WgXcQ",
      " dQw4w9WgXcQ ",
    ]) {
      expect(parseYoutubeId(link), link).toBe("dQw4w9WgXcQ");
    }
  });
  it("rejects other hosts, look-alikes, bad ids and other schemes", () => {
    for (const bad of [
      "",
      "not a link",
      "https://vimeo.com/123",
      "https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ",
      "https://notyoutube.com/watch?v=dQw4w9WgXcQ",
      "https://www.youtube.com/watch?v=short",
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ--",
      "https://www.youtube.com/channel/UC123",
      "https://www.youtube.com/playlist?list=PL123",
      "javascript:alert(1)//youtube.com/watch?v=dQw4w9WgXcQ",
      "ftp://youtube.com/watch?v=dQw4w9WgXcQ",
    ]) {
      expect(parseYoutubeId(bad), bad).toBeNull();
    }
  });
  it("only allows plain format ids (no yt-dlp selector syntax)", () => {
    expect(isFormatId("140")).toBe(true);
    expect(isFormatId("251-drc")).toBe(true);
    for (const bad of ["", "137+140", "best[height<=720]", "140/251", "a b", "x".repeat(25)]) expect(isFormatId(bad), bad).toBe(false);
  });
});

const audio = (id: string, ext: string, abr: number, extra: Partial<YtDlpFormat> = {}): YtDlpFormat => ({
  format_id: id, ext, vcodec: "none", acodec: ext === "m4a" ? "mp4a.40.2" : "opus", abr, tbr: abr, protocol: "https", filesize: abr * 1000, ...extra,
});
const videoOnly = (id: string, height: number, vcodec: string, ext: string, tbr: number, extra: Partial<YtDlpFormat> = {}): YtDlpFormat => ({
  format_id: id, ext, vcodec, acodec: "none", height, tbr, protocol: "https", filesize: tbr * 10_000, ...extra,
});

const sample: YtDlpVideo = {
  id: "dQw4w9WgXcQ",
  title: "  Never Gonna Give You Up  ",
  channel: "Rick Astley",
  duration: 213,
  thumbnail: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hq.jpg",
  formats: [
    { format_id: "sb0", ext: "mhtml", vcodec: "none", acodec: "none", protocol: "mhtml" },
    audio("139", "m4a", 48),
    audio("140", "m4a", 129),
    audio("140-drc", "m4a", 130, { format_note: "medium, DRC" }),
    audio("251", "webm", 135),
    videoOnly("160", 144, "avc1.4d400c", "mp4", 100),
    videoOnly("136", 720, "avc1.4d401f", "mp4", 1100),
    videoOnly("298", 720, "avc1.4d4020", "mp4", 1700, { fps: 60 }),
    videoOnly("247", 720, "vp9", "webm", 1500),
    videoOnly("137", 1080, "avc1.640028", "mp4", 3000),
    videoOnly("399", 1080, "av01.0.08M.08", "mp4", 2000),
    videoOnly("401", 2160, "avc1.640033", "mp4", 20000),
    videoOnly("95", 720, "avc1.4d401f", "mp4", 1200, { protocol: "m3u8_native" }),
    { format_id: "18", ext: "mp4", vcodec: "avc1.42001E", acodec: "mp4a.40.2", height: 360, tbr: 500, protocol: "https", filesize: 5_000_000 },
  ],
};

describe("summarizeVideo", () => {
  it("picks the best M4A audio and H.264 video per resolution, up to 1080p", () => {
    const v = summarizeVideo(sample);
    expect(v.title).toBe("Never Gonna Give You Up");
    expect(v.audio).toEqual({ formatId: "140", ext: "m4a", size: 129_000 });
    expect(v.videos.map((o) => o.height)).toEqual([1080, 720, 360, 144]);
    const hd = v.videos.find((o) => o.height === 720)!;
    expect(hd.video.formatId).toBe("298"); // highest bitrate H.264 over HTTPS (60 fps)
    expect(hd.audio?.formatId).toBe("140");
    expect(hd.size).toBe(17_000_000 + 129_000);
  });
  it("falls back to the progressive MP4 where no video-only stream exists", () => {
    const sd = summarizeVideo(sample).videos.find((o) => o.height === 360)!;
    expect(sd).toMatchObject({ video: { formatId: "18" }, audio: null, size: 5_000_000 });
  });
  it("prefers the original language among dubbed audio tracks", () => {
    const v = summarizeVideo({
      ...sample,
      formats: [
        audio("140-0", "m4a", 129, { language_preference: -1 }),
        audio("140-1", "m4a", 129, { language_preference: 10 }),
        audio("251-1", "webm", 135, { language_preference: 10 }),
      ],
    });
    expect(v.audio?.formatId).toBe("140-1");
  });
  it("estimates sizes from bitrate and drops options above the limit", () => {
    const v = summarizeVideo(
      { ...sample, formats: [audio("140", "m4a", 128, { filesize: null }), videoOnly("137", 1080, "avc1.64", "mp4", 3000, { filesize: null })] },
      10_000_000,
    );
    expect(v.audio?.size).toBe(128 * 125 * 213);
    expect(v.videos).toEqual([]); // 3128 kbit/s × 213 s ≈ 83 MB > 10 MB
  });
  it("rejects live streams and videos with nothing usable", () => {
    expect(() => summarizeVideo({ ...sample, is_live: true })).toThrowError("live");
    expect(() => summarizeVideo({ ...sample, live_status: "is_upcoming" })).toThrowError("live");
    expect(() => summarizeVideo({ ...sample, formats: [] })).toThrowError("noFormats");
    expect(() => summarizeVideo(sample, 1000)).toThrowError("tooLarge");
  });
  it("drops non-https thumbnails", () => {
    expect(summarizeVideo({ ...sample, thumbnail: "http://example.com/a.jpg" }).thumbnail).toBeNull();
  });
});

describe("classifyYtDlpError", () => {
  it.each([
    ["ERROR: [youtube] x: Sign in to confirm you’re not a bot. Use --cookies-from-browser", "blocked"],
    ["ERROR: Unable to download webpage: HTTP Error 429: Too Many Requests", "blocked"],
    ["ERROR: [youtube] x: Sign in to confirm your age. This video may be inappropriate for some users.", "ageRestricted"],
    ["ERROR: [youtube] x: This live event will begin in 3 hours.", "live"],
    ["ERROR: [youtube] xxxxxxxxxxx: This video is unavailable", "unavailable"],
    ["ERROR: [youtube] x: Private video. Sign in if you've been granted access to this video", "unavailable"],
    ["ERROR: [youtube] x: Requested format is not available. Use --list-formats for a list of available formats", "noFormats"],
    ["[download] File is larger than max-filesize (600000000 bytes > 524288000 bytes). Aborting.", "tooLarge"],
    ["ERROR: something new and strange", "failed"],
  ])("%s → %s", (stderr, code) => {
    expect(classifyYtDlpError(stderr)).toBe(code);
  });
  it("maps codes to i18n keys", () => {
    expect(youtubeErrorKey("ageRestricted")).toBe("errors.youtubeAgeRestricted");
  });
});

describe("helpers", () => {
  it("names files after the title, keeping dots", () => {
    expect(youtubeFileName("Song v1.2 (Live)", "mp3")).toBe("Song v1.2 _Live_.mp3");
    expect(youtubeFileName("a/b\\c:d", "mp4")).toBe("a_b_c_d.mp4");
  });
  it("builds a stream-copy merge command", () => {
    expect(buildMergeArgs("v.mp4", "a.m4a", "out.mp4")).toEqual([
      "-i", "v.mp4", "-i", "a.m4a", "-map", "0:v:0", "-map", "1:a:0", "-c", "copy", "-movflags", "+faststart", "out.mp4",
    ]);
  });
  it("sends YouTube links in the direct-link field to the YouTube source", () => {
    expect(() => parseMediaUrl("https://youtu.be/dQw4w9WgXcQ")).toThrowError(/youtubeUseTab/);
    expect(() => parseMediaUrl("https://vimeo.com/1")).toThrowError(/platformNotSupported/);
  });
});
