"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { runTool, type ToolError } from "@opentools/core";
import {
  algorithms,
  hashModule,
  isLegacy,
  outputBits,
  type Algorithm,
} from "@opentools/tool-hash-generator/client";
import { Button, CopyButton, ResultPanel, ToolErrorBox } from "@opentools/ui";
import { ErrorFromKey, fieldClass, formatBytes, labelClass, selectClass } from "./shared";

type Mode = "text" | "file";
interface Result {
  hex: string;
  algorithm: Algorithm;
}

export default function HashGenerator() {
  const t = useTranslations("toolUi.hash");
  const c = useTranslations("common");
  const [mode, setMode] = React.useState<Mode>("text");
  const [algorithm, setAlgorithm] = React.useState<Algorithm>("SHA-256");
  const [text, setText] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [result, setResult] = React.useState<Result | null>(null);
  const [error, setError] = React.useState<ToolError | null>(null);
  const [needsFile, setNeedsFile] = React.useState(false);
  const abort = React.useRef<AbortController | null>(null);
  React.useEffect(() => () => abort.current?.abort(), []);

  const reset = () => {
    setResult(null);
    setError(null);
    setNeedsFile(false);
  };

  async function generate() {
    reset();
    if (mode === "file" && !file) {
      setNeedsFile(true);
      return;
    }
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setBusy(true);
    const input =
      mode === "file" && file
        ? { kind: "file" as const, file, algorithm }
        : { kind: "text" as const, text, algorithm };
    const outcome = await runTool(hashModule, input, { signal: controller.signal });
    if (controller.signal.aborted) return;
    setBusy(false);
    if (outcome.ok) setResult({ hex: outcome.value, algorithm });
    else setError(outcome.error);
  }

  function clearAll() {
    abort.current?.abort();
    setBusy(false);
    setText("");
    setFile(null);
    reset();
  }

  return (
    <section className="space-y-5 rounded-md border p-5" aria-label={t("generate")}>
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <span className={labelClass} id="hash-mode">{t("tabs")}</span>
          <div role="radiogroup" aria-labelledby="hash-mode" className="flex gap-1">
            {(["text", "file"] as const).map((m) => (
              <Button key={m} type="button" role="radio" aria-checked={mode === m} variant={mode === m ? "default" : "outline"} size="sm" onClick={() => { setMode(m); reset(); }}>
                {m === "text" ? t("tabText") : t("tabFile")}
              </Button>
            ))}
          </div>
        </div>
        <div>
          <label className={labelClass} htmlFor="hash-algorithm">{t("algorithm")}</label>
          <select id="hash-algorithm" className={selectClass} value={algorithm} onChange={(e) => { setAlgorithm(e.target.value as Algorithm); reset(); }}>
            {algorithms.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
      </div>

      {mode === "text" ? (
        <div>
          <label className={labelClass} htmlFor="hash-text">{t("textLabel")}</label>
          <textarea id="hash-text" rows={6} className={fieldClass} value={text} placeholder={t("textPlaceholder")} onChange={(e) => { setText(e.target.value); reset(); }} />
          <p className="text-muted-foreground mt-1.5 text-xs">{t("textNote")}</p>
        </div>
      ) : (
        <div>
          <label className={labelClass} htmlFor="hash-file">{t("fileLabel")}</label>
          <input id="hash-file" type="file" className="block w-full text-sm file:mr-3 file:rounded-md file:border file:bg-transparent file:px-3 file:py-1.5 file:text-sm" onChange={(e) => { setFile(e.target.files?.[0] ?? null); reset(); }} />
          <p className="mt-1.5 text-sm">{file ? t("fileSelected", { name: file.name, size: formatBytes(file.size) }) : t("fileNone")}</p>
          <p className="text-muted-foreground mt-1 text-xs">{t("fileNote")}</p>
        </div>
      )}

      {isLegacy(algorithm) ? <p className="text-muted-foreground border-l-2 pl-3 text-sm">{t("legacyWarning", { algorithm })}</p> : null}

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="accent" onClick={generate} disabled={busy}>
          {busy ? t("hashing") : t("generate")}
        </Button>
        <Button type="button" variant="outline" onClick={clearAll}>{c("clear")}</Button>
      </div>

      <div aria-live="polite" className="space-y-3">
        {needsFile ? <ToolErrorBox title={t("emptyFile")} /> : null}
        {error ? <ErrorFromKey messageKey={error.messageKey} /> : null}
        {result ? (
          <ResultPanel
            title={`${t("result", { algorithm: result.algorithm })} · ${t("bits", { bits: outputBits[result.algorithm] })}`}
            actions={<CopyButton value={result.hex} label={t("copyHash")} copiedLabel={c("copied")} />}
          >
            <output data-testid="hash-output">{result.hex}</output>
          </ResultPanel>
        ) : null}
      </div>
    </section>
  );
}
