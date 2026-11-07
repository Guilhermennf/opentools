import { describe, expect, it } from "vitest";
import { runTool } from "@opentools/core";
import { validateJson } from "./json";
import { jsonModule } from "./json-module";

const BS = String.fromCharCode(92);
const NL = String.fromCharCode(10);

const errorOf = (text: string) => {
  const r = validateJson(text);
  if (r.ok) throw new Error("expected an error");
  return r.error;
};

describe("syntax errors", () => {
  it.each([
    ["", "unexpectedEnd", 1, 1],
    ["{", "unexpectedEnd", 1, 2],
    ['{"a"', "unexpectedEnd", 1, 5],
    ['{"a" 1}', "expectedColon", 1, 6],
    ["{a:1}", "expectedPropertyName", 1, 2],
    ["{'a':1}", "expectedPropertyName", 1, 2],
    ['{"a":1 "b":2}', "expectedCommaOrEnd", 1, 8],
    ['{"a":1,}', "trailingComma", 1, 8],
    ["[1,2,]", "trailingComma", 1, 6],
    ["[1 2]", "expectedCommaOrEnd", 1, 4],
    ["[01]", "expectedCommaOrEnd", 1, 3],
    ["[1.]", "invalidNumber", 1, 4],
    ["[-]", "invalidNumber", 1, 3],
    ["[1e]", "invalidNumber", 1, 4],
    ['"abc', "unterminatedString", 1, 1],
    [`"a${BS}x"`, "invalidEscape", 1, 4],
    [`"a${BS}u12G4"`, "invalidEscape", 1, 7],
    ["[nul]", "unexpectedToken", 1, 5],
    ["[tru", "unexpectedEnd", 1, 5],
    ["[1] x", "extraContent", 1, 5],
    ["undefined", "unexpectedToken", 1, 1],
    ["[NaN]", "unexpectedToken", 1, 2],
  ])("%j -> %s at %i:%i", (text, code, line, column) => {
    expect(errorOf(text)).toMatchObject({ code, line, column });
  });

  it("locates errors on later lines and returns the line text", () => {
    const text = ["{", '  "a": 1,', '  "b": ,', "}"].join(NL);
    expect(errorOf(text)).toMatchObject({ code: "unexpectedToken", line: 3, column: 8, lineText: '  "b": ,' });
  });
  it("rejects raw control characters inside strings", () => {
    expect(errorOf('"a' + NL + 'b"')).toMatchObject({ code: "controlCharacter", line: 1, column: 3 });
  });
  it("fails safely on very deep nesting", () => {
    expect(errorOf("[".repeat(5000)).code).toBe("tooDeep");
  });
  it("agrees with JSON.parse on a mixed corpus", () => {
    const corpus = ["{}", "[]", "[1,[2,[3]]]", '{"a":{"b":[true,false,null]}}', "[1,]", "{,}", "[}", '{"a":}', "[1e5]", "[.5]", "[+1]", `"${BS}u00e9"`, "01", "-01", "[0]", "[-0]", "1 2", "'a'"];
    for (const s of corpus) {
      let valid = true;
      try {
        JSON.parse(s);
      } catch {
        valid = false;
      }
      expect(validateJson(s).ok, s).toBe(valid);
    }
  });
});

describe("jsonModule", () => {
  it("formats, minifies and validates", async () => {
    const f = await runTool(jsonModule, { text: "[1]", mode: "format" });
    expect(f.ok && f.value.output).toBe(["[", "  1", "]"].join(NL));
    const m = await runTool(jsonModule, { text: " [ 1 ] ", mode: "minify" });
    expect(m.ok && m.value.output).toBe("[1]");
    const v = await runTool(jsonModule, { text: " [ 1 ] ", mode: "validate" });
    expect(v.ok && v.value.output).toBe(" [ 1 ] ");
  });
  it("returns a ToolError carrying the syntax error", async () => {
    const r = await runTool(jsonModule, { text: "[1,]", mode: "format" });
    expect(!r.ok && r.error).toMatchObject({ code: "VALIDATION", messageKey: "json.syntaxError" });
    expect(!r.ok && r.error.details).toMatchObject({ code: "trailingComma" });
  });
  it("rejects bad modes", async () => {
    const r = await runTool(jsonModule, { text: "[]", mode: "nope" });
    expect(!r.ok && r.error.code).toBe("VALIDATION");
  });
});
