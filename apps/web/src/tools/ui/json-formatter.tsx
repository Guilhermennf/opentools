"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { runTool, type ToolError } from "@opentools/core";
import {
  EXAMPLE_JSON,
  jsonModule,
  type JsonIndent,
  type JsonStats,
  type JsonSyntaxError,
} from "@opentools/tool-json-formatter/client";
import { Button, CopyButton, ToolErrorBox } from "@opentools/ui";
import { ErrorFromKey, fieldClass, labelClass, selectClass } from "./shared";

type Mode = "format" | "minify" | "validate";

function visible(char: string | null) {
  if (char === null) return null;
  return char.trim() === "" ? JSON.stringify(char).slice(1, -1) : char;
}

function SyntaxErrorBox({ error }: { error: JsonSyntaxError }) {
  const t = useTranslations("toolUi.json");
  const found = visible(error.found);
  // Keep the context line short around the error column.
  const start = Math.max(0, error.column - 1 - 40);
  const context = error.lineText.slice(start, start + 80);
  const caret = " ".repeat(Math.max(0, error.column - 1 - start)) + "^";
  return (
    <ToolErrorBox title={t("errorTitle")}>
      <p>{t(`codes.${error.code}`)}</p>
      <p className="mt-1 font-mono text-xs">
        {t("errorAt", { line: error.line, column: error.column })}
        {" · "}
        {found === null ? t("foundEnd") : t("found", { char: found })}
      </p>
      <pre className="bg-muted mt-2 overflow-x-auto rounded-sm p-2 font-mono text-xs" aria-hidden="true">
        {context}
        {"\n"}
        {caret}
      </pre>
    </ToolErrorBox>
  );
}

export default function JsonFormatter() {
  const t = useTranslations("toolUi.json");
  const c = useTranslations("common");
  const [text, setText] = React.useState("");
  const [indent, setIndent] = React.useState<JsonIndent>("2");
  const [output, setOutput] = React.useState<string | null>(null);
  const [stats, setStats] = React.useState<JsonStats | null>(null);
  const [error, setError] = React.useState<ToolError | null>(null);
  const [empty, setEmpty] = React.useState(false);

  const clearResult = () => {
    setOutput(null);
    setStats(null);
    setError(null);
    setEmpty(false);
  };

  async function run(mode: Mode) {
    clearResult();
    if (text.trim() === "") {
      setEmpty(true);
      return;
    }
    const outcome = await runTool(jsonModule, { text, mode, indent });
    if (outcome.ok) {
      setStats(outcome.value.stats);
      setOutput(mode === "validate" ? "" : outcome.value.output);
    } else {
      setError(outcome.error);
    }
  }

  const syntaxError = error?.messageKey === "json.syntaxError" ? (error.details as JsonSyntaxError) : null;
  const invalid = Boolean(syntaxError);

  return (
    <section className="space-y-5 rounded-md border p-5">
      <div className="flex flex-wrap items-end gap-2">
        <Button type="button" variant="accent" onClick={() => run("format")}>{t("format")}</Button>
        <Button type="button" variant="outline" onClick={() => run("minify")}>{t("minify")}</Button>
        <Button type="button" variant="outline" onClick={() => run("validate")}>{t("validate")}</Button>
        <Button type="button" variant="ghost" onClick={() => { setText(EXAMPLE_JSON); clearResult(); }}>{t("example")}</Button>
        <Button type="button" variant="ghost" onClick={() => { setText(""); clearResult(); }}>{c("clear")}</Button>
        <div className="ml-auto">
          <label className={labelClass} htmlFor="json-indent">{t("indentation")}</label>
          <select id="json-indent" className={selectClass} value={indent} onChange={(e) => setIndent(e.target.value as JsonIndent)}>
            <option value="2">{t("indent2")}</option>
            <option value="4">{t("indent4")}</option>
            <option value="tab">{t("indentTab")}</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="json-input">{t("input")}</label>
          <textarea
            id="json-input"
            rows={16}
            spellCheck={false}
            className={fieldClass}
            value={text}
            placeholder={t("placeholder")}
            aria-invalid={invalid}
            aria-describedby="json-status"
            onChange={(e) => { setText(e.target.value); clearResult(); }}
          />
        </div>
        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <label className="label-mono" htmlFor="json-output">{t("output")}</label>
            {output ? <CopyButton value={output} label={c("copy")} copiedLabel={c("copied")} /> : null}
          </div>
          <textarea id="json-output" rows={16} readOnly spellCheck={false} className={fieldClass} value={output ?? ""} />
        </div>
      </div>

      <div id="json-status" aria-live="polite" className="space-y-3">
        {empty ? <ToolErrorBox title={t("emptyInput")} /> : null}
        {syntaxError ? <SyntaxErrorBox error={syntaxError} /> : null}
        {error && !syntaxError ? <ErrorFromKey messageKey={error.messageKey} /> : null}
        {stats ? (
          <p className="text-sm" data-testid="json-valid">
            <strong>{t("valid")}</strong>
            <span className="text-muted-foreground"> · {t("stats", { size: stats.size, depth: stats.depth })}</span>
          </p>
        ) : null}
      </div>
    </section>
  );
}
