"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { runTool, ToolError } from "@opentools/core";
import {
  convertModule,
  fetchMediaFile,
  loadEngine,
  mp3Bitrates,
  probeMedia,
  type MediaInfo,
  type Mp3Bitrate,
  type Mp4Quality,
  type OutputFormat,
} from "@opentools/tool-media-converter/client";
import { Button, ToolErrorBox, ToolProgress } from "@opentools/ui";
import { ErrorFromKey, formatBytes, labelClass, selectClass } from "./shared";

type Source = "file" | "url";
type Phase = "idle" | "fetching" | "loadingEngine" | "converting" | "done";
interface Result {
  url: string;
  name: string;
  size: number;
  format: OutputFormat;
}

const formatDuration = (s: number) => {
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
};

export default function MediaConverter() {
  const t = useTranslations("toolUi.media");
  const [source, setSource] = React.useState<Source>("file");
  const [file, setFile] = React.useState<File | null>(null);
  const [info, setInfo] = React.useState<MediaInfo | null>(null);
  const [urlText, setUrlText] = React.useState("");
  const [format, setFormat] = React.useState<OutputFormat>("mp3");
  const [bitrate, setBitrate] = React.useState<Mp3Bitrate>(192);
  const [quality, setQuality] = React.useState<Mp4Quality>("standard");
  const [phase, setPhase] = React.useState<Phase>("idle");
  const [progress, setProgress] = React.useState(0);
  const [result, setResult] = React.useState<Result | null>(null);
  const [error, setError] = React.useState<ToolError | null>(null);
  const [needFile, setNeedFile] = React.useState(false);
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

  async function pick(next: File | null) {
    dropResult();
    setError(null);
    setNeedFile(false);
    setFile(next);
    setInfo(null);
    setPhase("idle");
    if (next) setInfo(await probeMedia(next));
  }

  const asToolError = (e: unknown) =>
    e instanceof ToolError ? e : new ToolError("EXECUTION", "errors.unexpected");

  async function loadUrl() {
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    dropResult();
    setError(null);
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

  async function convert() {
    dropResult();
    setError(null);
    if (!file) {
      setNeedFile(true);
      return;
    }
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
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
      const url = URL.createObjectURL(outcome.value.blob);
      resultUrl.current = url;
      setResult({ url, name: outcome.value.fileName, size: outcome.value.blob.size, format });
      setPhase("done");
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

  const busy = phase === "fetching" || phase === "loadingEngine" || phase === "converting";
  return (
    <section className="space-y-5 rounded-md border p-5">
      <p className="text-muted-foreground border-l-2 pl-3 text-sm">{t("rightsNote")}</p>
      {renderSource()}
      {renderInfo()}
      {renderOptions()}
      {renderActions()}
      {renderStatus()}
    </section>
  );

  function renderSource() {
    return (
      <div className="space-y-3">
        <div>
          <span className={labelClass} id="media-source">{t("source")}</span>
          <div role="radiogroup" aria-labelledby="media-source" className="flex gap-1">
            {(["file", "url"] as const).map((s) => (
              <Button key={s} type="button" role="radio" aria-checked={source === s} disabled={busy} variant={source === s ? "default" : "outline"} size="sm" onClick={() => setSource(s)}>
                {s === "file" ? t("modeFile") : t("modeUrl")}
              </Button>
            ))}
          </div>
        </div>
        {source === "file" ? (
          <div>
            <label className={labelClass} htmlFor="media-file">{t("fileLabel")}</label>
            <input id="media-file" type="file" accept="video/*,audio/*,.mkv,.mov,.flac,.opus" disabled={busy} className="block w-full text-sm file:mr-3 file:rounded-md file:border file:bg-transparent file:px-3 file:py-1.5 file:text-sm" onChange={(e) => void pick(e.target.files?.[0] ?? null)} />
          </div>
        ) : (
          <div>
            <label className={labelClass} htmlFor="media-url">{t("urlLabel")}</label>
            <div className="flex gap-2">
              <input id="media-url" type="url" inputMode="url" value={urlText} disabled={busy} placeholder={t("urlPlaceholder")} className="bg-background h-9 min-w-0 flex-1 rounded-md border px-3 font-mono text-sm" onChange={(e) => setUrlText(e.target.value)} />
              <Button type="button" variant="outline" disabled={busy || urlText.trim() === ""} onClick={() => void loadUrl()}>
                {phase === "fetching" ? t("fetching") : t("loadUrl")}
              </Button>
            </div>
            <p className="text-muted-foreground mt-1.5 text-xs">{t("urlNote")}</p>
          </div>
        )}
      </div>
    );
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
        {rows.map(([k, v]) => (
          <React.Fragment key={k}>
            <dt className="label-mono self-center">{k}</dt>
            <dd className="font-mono break-all">{v}</dd>
          </React.Fragment>
        ))}
      </dl>
    );
  }

  function renderOptions() {
    return (
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className={labelClass} htmlFor="media-format">{t("format")}</label>
          <select id="media-format" className={selectClass} value={format} disabled={busy} onChange={(e) => { setFormat(e.target.value as OutputFormat); dropResult(); }}>
            <option value="mp3">{t("mp3")}</option>
            <option value="mp4">{t("mp4")}</option>
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
    return (
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="accent" disabled={busy} onClick={() => void convert()}>
          {t("convert")}
        </Button>
        {busy ? (
          <Button type="button" variant="outline" onClick={cancel}>{t("cancel")}</Button>
        ) : null}
        {phase === "done" || file ? (
          <Button type="button" variant="ghost" disabled={busy} onClick={() => void pick(null)}>{t("again")}</Button>
        ) : null}
      </div>
    );
  }

  function renderStatus() {
    return (
      <div aria-live="polite" className="space-y-3">
        <p className="text-muted-foreground text-xs">{t("engineNote")}</p>
        {needFile ? <ToolErrorBox title={t("needFile")} /> : null}
        {error ? <ErrorFromKey messageKey={error.messageKey} /> : null}
        {phase === "loadingEngine" ? <p className="text-sm" data-testid="media-loading">{t("loadingEngine")}</p> : null}
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
