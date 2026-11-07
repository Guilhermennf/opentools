import { describe, expect, it } from "vitest";
import { EXAMPLE_JSON, formatJson, minifyJson } from "./json";

const BS = String.fromCharCode(92);
const NL = String.fromCharCode(10);
const TAB = String.fromCharCode(9);

function fmt(text: string, indent: "2" | "4" | "tab" = "2") {
  const r = formatJson(text, indent);
  if (!r.ok) throw new Error(`unexpected error ${r.error.code}`);
  return r.output;
}

describe("formatJson", () => {
  it("indents nested structures", () => {
    expect(fmt('{"a":[1,2],"b":{"c":null}}')).toBe(
      ["{", '  "a": [', "    1,", "    2", "  ],", '  "b": {', '    "c": null', "  }", "}"].join(NL),
    );
  });
  it("supports 4 spaces and tabs", () => {
    expect(fmt("[1]", "4")).toBe(["[", "    1", "]"].join(NL));
    expect(fmt("[1]", "tab")).toBe(["[", TAB + "1", "]"].join(NL));
  });
  it("keeps empty containers compact and handles scalars", () => {
    expect(fmt('{"a":{},"b":[]}')).toBe(["{", '  "a": {},', '  "b": []', "}"].join(NL));
    for (const s of ["1", "-0.5e+3", "true", "false", "null", '"x"']) expect(fmt(s)).toBe(s);
  });
  it("preserves big numbers, key order and duplicate keys verbatim", () => {
    const out = fmt('{"id":12345678901234567890,"z":1,"a":2,"z":3,"f":1.0e5}');
    expect(out).toContain("12345678901234567890");
    expect(out).toContain("1.0e5");
    expect(out.indexOf('"z"')).toBeLessThan(out.indexOf('"a"'));
    expect(out.match(/"z"/g)).toHaveLength(2);
  });
  it("keeps string escapes and unicode untouched", () => {
    const s = `{"k":"a${BS}"b${BS}n${BS}u00e9 ação 🚀"}`;
    const r = minifyJson(s);
    expect(r.ok && r.output).toBe(s);
  });
  it("is idempotent and round-trips with minify", () => {
    const once = fmt(EXAMPLE_JSON);
    expect(fmt(once)).toBe(once);
    const min = minifyJson(once);
    expect(min.ok && min.output).toBe(EXAMPLE_JSON);
  });
  it("ignores surrounding whitespace, CRLF and a BOM", () => {
    const text = String.fromCharCode(0xfeff) + "  [1," + String.fromCharCode(13) + NL + "2]  ";
    expect(fmt(text)).toBe(["[", "  1,", "  2", "]"].join(NL));
  });
  it("reports stats", () => {
    const r = formatJson('{"a":[[1]]}');
    expect(r.ok && r.stats.depth).toBe(3);
  });
});
