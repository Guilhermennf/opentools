export type JsonErrorCode =
  | "unexpectedEnd"
  | "unexpectedToken"
  | "expectedPropertyName"
  | "expectedColon"
  | "expectedCommaOrEnd"
  | "trailingComma"
  | "invalidNumber"
  | "invalidEscape"
  | "controlCharacter"
  | "unterminatedString"
  | "extraContent"
  | "tooDeep";

export interface JsonSyntaxError {
  code: JsonErrorCode;
  /** 0-based character offset. */
  position: number;
  /** 1-based. */
  line: number;
  /** 1-based. */
  column: number;
  /** The offending character, or null at end of input. */
  found: string | null;
  /** The full text of the offending line, for context display. */
  lineText: string;
}

export type JsonIndent = "2" | "4" | "tab";
export const indentUnits: Record<JsonIndent, string> = {
  "2": "  ",
  "4": "    ",
  tab: String.fromCharCode(9),
};

export interface JsonStats {
  size: number;
  depth: number;
}

export type JsonResult =
  | { ok: true; output: string; stats: JsonStats }
  | { ok: false; error: JsonSyntaxError };

export const NL = String.fromCharCode(10);
export const EXAMPLE_JSON =
  '{"name":"OpenTools","version":1,"tags":["json","formatter"],"nested":{"free":true,"price":0,"notes":null,"ratio":1.5e-3},"id":12345678901234567890,"empty":{},"list":[]}';
