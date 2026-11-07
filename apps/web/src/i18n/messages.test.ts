import { describe, expect, it } from "vitest";
import { locales } from "@opentools/shared";
import en from "./messages/en.json";
import ptBR from "./messages/pt-BR.json";
import { registry } from "@/tools/registry";

function flatten(obj: unknown, prefix = ""): [string, unknown][] {
  if (Array.isArray(obj)) return obj.flatMap((v, i) => flatten(v, `${prefix}[${i}]`));
  if (obj && typeof obj === "object") {
    return Object.entries(obj).flatMap(([k, v]) => flatten(v, prefix ? `${prefix}.${k}` : k));
  }
  return [[prefix, obj]];
}

const keys = (o: unknown) => flatten(o).map(([k]) => k).sort();

describe("message parity", () => {
  it("app messages have identical keys and no empty values", () => {
    expect(keys(ptBR)).toEqual(keys(en));
    for (const dict of [en, ptBR]) {
      for (const [k, v] of flatten(dict)) expect(v, k).not.toBe("");
    }
  });
  it("every tool has equivalent, non-empty messages in all locales", () => {
    for (const tool of registry.all()) {
      const [first, ...rest] = locales.map((l) => tool.messages[l]);
      for (const other of rest) expect(keys(other)).toEqual(keys(first));
      for (const l of locales) {
        for (const [k, v] of flatten(tool.messages[l])) expect(v, `${tool.meta.id}.${l}.${k}`).not.toBe("");
        expect(tool.asciiLabel[l]).toBeTruthy();
      }
    }
  });
});
