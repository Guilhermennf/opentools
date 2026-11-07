"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { runTool, ToolError } from "@opentools/core";
import {
  convertModule,
  convertYoutube,
  fetchMediaFile,
  fetchYoutubeInfo,
  loadEngine,
  mp3Bitrates,
  probeMedia,
  type MediaInfo,
  type Mp3Bitrate,
  type Mp4Quality,
  type OutputFormat,
  type YoutubeDownloadProgress,
  type YoutubeVideo,
} from "@opentools/tool-media-converter/client";
import { Button, ToolErrorBox, ToolProgress } from "@opentools/ui";
import { ErrorFromKey, formatBytes, labelClass, selectClass } from "./shared";

type Source = "file" | "url" | "youtube";
type Phase = "idle" | "fetching" | "loadingEngine" | "downloading" | "converting" | "done";
interface Result {
  url: string;
  name: string;
  size: number;
  format: OutputFormat;
}

const formatDuration = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(Math.floor(s % 60)).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
};

const inputClass = "bg-background h-9 min-w-0 flex-1 rounded-md border px-3 font-mono text-sm";

export default function MediaConverter() {
  const t = useTranslations("toolUi.media");
  const [source, setSource] = React.useState<Source>("file");
  const [file, setFile] = React.useState<File | null>(null);
  const [info, setInfo] = React.useState<MediaInfo | null>(null);
  const [urlText, setUrlText] = React.useState("");
  const [ytText, setYtText] = React.useState("");
  const [video, setVideo] = React.useState<YoutubeVideo | null>(null);
  const [height, setHeight] = React.useState<number | null>(null);
  const [download, setDownload] = React.useState<YoutubeDownloadProgress | null>(null);
  const [format, setFormat] = React.useState<OutputFormat>("mp3");
  const [bitrate, setBitrate] = React.useState<Mp3Bitrate>(192);
  const [quality, setQuality] = React.useState<Mp4Quality>("standard");
  const [phase, setPhase] = React.useState<Phase>("idle");
  const [progress, setProgress] = React.useState(0);
  const [result, setResult] = React.useState<Result | null>(null);
  const [error, setError] = React.useState<ToolError | null>(null);
  const [needInput, setNeedInput] = React.useState(false);
  const abort = React.useRef<AbortController | null>(null);
  const resultUrl = React.useRef<string | null>(null);

  const dropResult = React.useCallback(() => {
    if (resultUrl.current) URL.revokeObjectURL(resultUrl.current);
    resultUrl.current = null;
    setResult(null);
  }, []);
  React.useEffect(
    () => () => {
      abort.current?.abort();
      if (resultUrl.current) URL.revokeObjectURL(resultUrl.current);
    },
    [],
  );

  const restart = () => {
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    dropResult();
    setError(null);
    setNeedInput(false);
    return controller;
  };

  async function pick(next: File | null) {
    dropResult();
    setError(null);
    setNeedInput(false);
    setFile(next);
    setInfo(null);
    setPhase("idle");
    if (next) setInfo(await probeMedia(next));
  }

  const asToolError = (e: unknown) =>
    e instanceof ToolError ? e : new ToolError("EXECUTION", "errors.unexpected");

  async function loadUrl() {
    const controller = restart();
    setPhase("fetching");
    try {
      const fetched = await fetchMediaFile(urlText, controller.signal);
      if (controller.signal.aborted) return;
      await pick(fetched);
    } catch (e) {
      if (!controller.signal.aborted) {
        setError(asToolError(e));
        setPhase("idle");
      }
    }
  }

  async function loadYoutube() {
    const controller = restart();
    setVideo(null);
    setPhase("fetching");
    try {
      const found = await fetchYoutubeInfo(ytText, controller.signal);
      if (controller.signal.aborted) return;
      setVideo(found);
      setHeight(found.videos[0]?.height ?? null);
      if (!found.audio && found.videos.length > 0) setFormat("mp4");
      if (found.audio && found.videos.length === 0) setFormat("mp3");
      setPhase("idle");
    } catch (e) {
      if (!controller.signal.aborted) {
        setError(asToolError(e));
        setPhase("idle");
      }
    }
  }

  function finish(blob: Blob, name: string) {
    const url = URL.createObjectURL(blob);
    resultUrl.current = url;
    setResult({ url, name, size: blob.size, format });
    setPhase("done");
  }

  async function convertFile() {
    if (!file) {
      dropResult();
      setError(null);
      setNeedInput(true);
      return;
    }
    const controller = restart();
    setProgress(0);
    setPhase("loadingEngine");
    try {
      await loadEngine();
      if (controller.signal.aborted) return;
      setPhase("converting");
      const outcome = await runTool(
        convertModule,
        { file, format, mp3Bitrate: bitrate, mp4Quality: quality },
        { signal: controller.signal, onProgress: (p) => setProgress(p * 100) },
      );
      if (controller.signal.aborted) return;
      if (!outcome.ok) throw outcome.error;
      finish(outcome.value.blob, outcome.value.fileName);
    } catch (e) {
      if (controller.signal.aborted) return;
      setError(asToolError(e));
      setPhase("idle");
    }
  }

  async function convertVideo() {
    if (!video) {
      dropResult();
      setError(null);
      setNeedInput(true);
      return;
    }
    const controller = restart();
    setProgress(0);
    setDownload(null);
    setPhase("downloading");
    try {
      const out = await convertYoutube({
        video,
        format,
        mp3Bitrate: bitrate,
        height: height ?? undefined,
        signal: controller.signal,
        onProgress: (p) => {
          if (controller.signal.aborted) return;
          setDownload(p);
          setPhase(p.stage);
          setProgress((p.fraction ?? 0) * 100);
        },
      });
      if (controller.signal.aborted) return;
      finish(out.blob, out.fileName);
    } catch (e) {
      if (controller.signal.aborted) return;
      setError(asToolError(e));
      setPhase("idle");
    }
  }

  function cancel() {
    abort.current?.abort();
    setPhase("idle");
  }

  function reset() {
    abort.current?.abort();
    setVideo(null);
    setYtText("");
    void pick(null);
  }

  const busy = phase === "fetching" || phase === "loadingEngine" || phase === "downloading" || phase === "converting";
  const youtube = source === "youtube";
  return (
    <section className="space-y-5 rounded-md border p-5">
      <p className="text-muted-foreground border-l-2 pl-3 text-sm">{t("rightsNote")}</p>
      {renderSource()}
      {youtube ? renderVideoInfo() : renderInfo()}
      {renderOptions()}
      {renderActions()}
      {renderStatus()}
    </section>
  );

  function renderSource() {
    const labels: Record<Source, string> = { file: t("modeFile"), url: t("modeUrl"), youtube: t("modeYoutube") };
    return (
      <div className="space-y-3">
        <div>
          <span className={labelClass} id="media-source">{t("source")}</span>
          <div role="radiogroup" aria-labelledby="media-source" className="flex flex-wrap gap-1">
            {(["file", "url", "youtube"] as const).map((s) => (
              <Button
                key={s}
                type="button"
                role="radio"
                aria-checked={source === s}
                disabled={busy}
                variant={source === s ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setSource(s);
                  setError(null);
                  setNeedInput(false);
                  dropResult();
                }}
              >
                {labels[s]}
              </Button>
            ))}
          </div>
        </div>
        {source === "file" ? (
          <div>
            <label className={labelClass} htmlFor="media-file">{t("fileLabel")}</label>
            <input id="media-file" type="file" accept="video/*,audio/*,.mkv,.mov,.flac,.opus" disabled={busy} className="block w-full text-sm file:mr-3 file:rounded-md file:border file:bg-transparent file:px-3 file:py-1.5 file:text-sm" onChange={(e) => void pick(e.target.files?.[0] ?? null)} />
          </div>
        ) : source === "url" ? (
          <div>
            <label className={labelClass} htmlFor="media-url">{t("urlLabel")}</label>
            <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (urlText.trim()) void loadUrl(); }}>
              <input id="media-url" type="url" inputMode="url" value={urlText} disabled={busy} placeholder={t("urlPlaceholder")} className={inputClass} onChange={(e) => setUrlText(e.target.value)} />
              <Button type="submit" variant="outline" disabled={busy || urlText.trim() === ""}>
                {phase === "fetching" ? t("fetching") : t("loadUrl")}
              </Button>
            </form>
            <p className="text-muted-foreground mt-1.5 text-xs">{t("urlNote")}</p>
          </div>
        ) : (
          <div>
            <label className={labelClass} htmlFor="media-youtube">{t("youtubeLabel")}</label>
            <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (ytText.trim()) void loadYoutube(); }}>
              <input id="media-youtube" type="url" inputMode="url" value={ytText} disabled={busy} placeholder={t("youtubePlaceholder")} className={inputClass} onChange={(e) => setYtText(e.target.value)} />
              <Button type="submit" variant="outline" disabled={busy || ytText.trim() === ""}>
                {phase === "fetching" ? t("youtubeFetching") : t("youtubeLoad")}
              </Button>
            </form>
            <p className="text-muted-foreground mt-1.5 text-xs">{t("youtubeNote")}</p>
          </div>
        )}
      </div>
    );
  }

  function renderRows(rows: [string, string][]) {
    return rows.map(([k, v]) => (
      <React.Fragment key={k}>
        <dt className="label-mono self-center">{k}</dt>
        <dd className="font-mono break-all">{v}</dd>
      </React.Fragment>
    ));
  }

  function renderInfo() {
    if (!file) return <p className="text-sm">{t("fileNone")}</p>;
    const rows: [string, string][] = [
      [t("infoName"), file.name],
      [t("infoSize"), formatBytes(file.size)],
    ];
    if (info?.duration != null) rows.push([t("infoDuration"), formatDuration(info.duration)]);
    if (info?.width && info.height) rows.push([t("infoResolution"), `${info.width}×${info.height}`]);
    return (
      <dl data-testid="media-info" className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-md border p-3 text-sm">
        {renderRows(rows)}
      </dl>
    );
  }

  function renderVideoInfo() {
    if (!video) return <p className="text-sm">{t("youtubeNone")}</p>;
    const rows: [string, string][] = [[t("infoTitle"), video.title]];
    if (video.channel) rows.push([t("infoChannel"), video.channel]);
    if (video.duration != null) rows.push([t("infoDuration"), formatDuration(video.duration)]);
    return (
      <div data-testid="media-info" className="flex flex-col gap-3 rounded-md border p-3 text-sm sm:flex-row">
        {video.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element -- remote YouTube thumbnail, not worth the image optimizer
          <img src={video.thumbnail} alt="" referrerPolicy="no-referrer" className="aspect-video w-full rounded-sm object-cover sm:w-40" />
        ) : null}
        <dl className="grid min-w-0 flex-1 grid-cols-[auto_1fr] content-start gap-x-4 gap-y-1">{renderRows(rows)}</dl>
      </div>
    );
  }

  function renderOptions() {
    const canMp3 = !youtube || !video || video.audio != null;
    const canMp4 = !youtube || !video || video.videos.length > 0;
    return (
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className={labelClass} htmlFor="media-format">{t("format")}</label>
          <select id="media-format" className={selectClass} value={format} disabled={busy} onChange={(e) => { setFormat(e.target.value as OutputFormat); dropResult(); }}>
            <option value="mp3" disabled={!canMp3}>{t("mp3")}</option>
            <option value="mp4" disabled={!canMp4}>{t("mp4")}</option>
          </select>
        </div>
        {format === "mp3" ? (
          <div>
            <label className={labelClass} htmlFor="media-bitrate">{t("bitrate")}</label>
            <select id="media-bitrate" className={selectClass} value={bitrate} disabled={busy} onChange={(e) => setBitrate(Number(e.target.value) as Mp3Bitrate)}>
              {mp3Bitrates.map((b) => (
                <option key={b} value={b}>{t("bitrateOption", { kbps: b })}</option>
              ))}
            </select>
          </div>
        ) : youtube ? (
          <div>
            <label className={labelClass} htmlFor="media-resolution">{t("resolution")}</label>
            <select id="media-resolution" className={selectClass} value={height ?? ""} disabled={busy || !video} onChange={(e) => setHeight(Number(e.target.value))}>
              {video?.videos.length ? (
                video.videos.map((v) => (
                  <option key={v.height} value={v.height}>
                    {v.size != null ? t("resolutionOption", { height: v.height, size: formatBytes(v.size) }) : `${v.height}p`}
                  </option>
                ))
              ) : (
                <option value="">{t("resolutionAuto")}</option>
              )}
            </select>
          </div>
        ) : (
          <div>
            <label className={labelClass} htmlFor="media-quality">{t("quality")}</label>
            <select id="media-quality" className={selectClass} value={quality} disabled={busy} onChange={(e) => setQuality(e.target.value as Mp4Quality)}>
              <option value="standard">{t("qualityStandard")}</option>
              <option value="high">{t("qualityHigh")}</option>
            </select>
          </div>
        )}
      </div>
    );
  }

  function renderActions() {
    const hasInput = youtube ? video != null : file != null;
    return (
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="accent" disabled={busy} onClick={() => void (youtube ? convertVideo() : convertFile())}>
          {youtube ? t("youtubeConvert", { format: format.toUpperCase() }) : t("convert")}
        </Button>
        {busy ? (
          <Button type="button" variant="outline" onClick={cancel}>{t("cancel")}</Button>
        ) : null}
        {phase === "done" || hasInput ? (
          <Button type="button" variant="ghost" disabled={busy} onClick={reset}>{t("again")}</Button>
        ) : null}
      </div>
    );
  }

  function renderDownload() {
    if (!download) return <p className="text-sm">{t("youtubeConnecting")}</p>;
    const bytes = download.expected
      ? `${formatBytes(download.received)} / ${formatBytes(download.expected)}`
      : formatBytes(download.received);
    return (
      <div className="space-y-1">
        <ToolProgress value={progress} label={t("youtubeDownloading")} />
        <p className="text-muted-foreground font-mono text-xs" data-testid="media-download-bytes">{bytes}</p>
      </div>
    );
  }

  function renderStatus() {
    return (
      <div aria-live="polite" className="space-y-3">
        <p className="text-muted-foreground text-xs">{youtube ? t("youtubeEngineNote") : t("engineNote")}</p>
        {needInput ? <ToolErrorBox title={youtube ? t("needVideo") : t("needFile")} /> : null}
        {error ? <ErrorFromKey messageKey={error.messageKey} /> : null}
        {phase === "loadingEngine" ? <p className="text-sm" data-testid="media-loading">{t("loadingEngine")}</p> : null}
        {phase === "downloading" ? renderDownload() : null}
        {phase === "converting" ? <ToolProgress value={progress} label={t("converting")} /> : null}
        {result ? (
          <div className="space-y-3 rounded-md border p-4" data-testid="media-result">
            <p className="font-medium">{t("done")}</p>
            {result.format === "mp3" ? (
              <audio controls src={result.url} className="w-full" />
            ) : (
              <video controls src={result.url} className="max-h-72 w-full rounded-sm" />
            )}
            <Button asChild variant="default">
              <a href={result.url} download={result.name}>
                {t("download", { name: result.name })} · {formatBytes(result.size)}
              </a>
            </Button>
          </div>
        ) : null}
      </div>
    );
  }
}
