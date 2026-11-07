// Dependency-free JSON validator/formatter/minifier.
// Implemented as a parser (not JSON.parse + JSON.stringify) so that it can:
//  - report exact line/column with a machine-readable error code (browsers disagree on messages),
//  - preserve number literals (e.g. 12345678901234567890), key order and duplicate keys verbatim.
import { Fail, Parser } from "./json-parser";
import {
  indentUnits,
  NL,
  type JsonErrorCode,
  type JsonIndent,
  type JsonResult,
  type JsonSyntaxError,
} from "./json-types";

export * from "./json-types";

function describeError(text: string, code: JsonErrorCode, position: number): JsonSyntaxError {
  let line = 1;
  let lineStart = 0;
  for (let k = 0; k < position && k < text.length; k++) {
    if (text.charCodeAt(k) === 10) {
      line++;
      lineStart = k + 1;
    }
  }
  const lineEnd = text.indexOf(NL, lineStart);
  return {
    code,
    position,
    line,
    column: position - lineStart + 1,
    found: position < text.length ? text.charAt(position) : null,
    lineText: text.slice(lineStart, lineEnd === -1 ? text.length : lineEnd).replace(/\r$/, ""),
  };
}

function transform(text: string, unit: string | null): JsonResult {
  try {
    const { output, depth } = new Parser(text, unit).run();
    return { ok: true, output, stats: { size: new TextEncoder().encode(output).length, depth } };
  } catch (error) {
    if (error instanceof Fail) return { ok: false, error: describeError(text, error.code, error.position) };
    if (error instanceof RangeError) return { ok: false, error: describeError(text, "tooDeep", 0) };
    throw error;
  }
}

export const formatJson = (text: string, indent: JsonIndent = "2") => transform(text, indentUnits[indent]);
export const minifyJson = (text: string) => transform(text, null);
/** Validation reuses minify and discards the output. */
export const validateJson = (text: string) => minifyJson(text);
