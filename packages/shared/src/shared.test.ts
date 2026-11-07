import { describe, expect, it } from "vitest";
import { matchLocale, normalizeSearch, parseAcceptLanguage } from "./index";

describe("matchLocale (spec §2.2)", () => {
  it.each([
    [["pt-BR"], "pt-BR"],
    [["pt-PT"], "pt-BR"],
    [["pt"], "pt-BR"],
    [["en-US"], "en"],
    [["en-GB"], "en"],
    [["es-ES"], "en"],
    [[], "en"],
    [["es-ES", "pt-PT"], "pt-BR"],
    [["fr", "en-US", "pt-BR"], "en"],
  ])("%j -> %s", (langs, expected) => {
    expect(matchLocale(langs)).toBe(expected);
  });
});

describe("parseAcceptLanguage", () => {
  it("orders by q-value", () => {
    expect(parseAcceptLanguage("en;q=0.5, pt-BR, es;q=0.8")).toEqual(["pt-BR", "es", "en"]);
  });
  it("handles empty, wildcard and q=0", () => {
    expect(parseAcceptLanguage("")).toEqual([]);
    expect(parseAcceptLanguage(null)).toEqual([]);
    expect(parseAcceptLanguage("*, en;q=0")).toEqual([]);
  });
});

describe("normalizeSearch", () => {
  it("strips accents and case", () => {
    expect(normalizeSearch("Codificação")).toBe("codificacao");
  });
});
