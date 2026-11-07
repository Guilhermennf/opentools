import { describe, expect, it } from "vitest";
import { z } from "zod";
import { createRegistry, runTool, ToolError, type ToolDefinition, type ToolModule } from "./index";

const msg = (name: string) => ({
  name,
  tagline: `${name} tagline`,
  description: `${name} description`,
  seo: { title: name, description: name },
});

function def(id: string, over: Partial<ToolDefinition["meta"]> = {}): ToolDefinition {
  return {
    meta: {
      id,
      slug: id,
      category: "developer",
      icon: "box",
      keywords: { "pt-BR": ["codificação"], en: ["encode"] },
      runtime: "browser",
      version: "0.1.0",
      status: "coming-soon",
      related: [],
      ...over,
    },
    ascii: "x",
    asciiLabel: { "pt-BR": "x", en: "x" },
    messages: { "pt-BR": msg(id), en: msg(id) },
  };
}

describe("registry", () => {
  it("rejects duplicate slugs and ids", () => {
    expect(() => createRegistry([def("a"), def("a")])).toThrow(/Duplicate/);
    expect(() => createRegistry([def("a"), def("b", { slug: "a" })])).toThrow(/slug/);
  });
  it("rejects bad slug, bad related, missing locale", () => {
    expect(() => createRegistry([def("a", { slug: "Bad_Slug" })])).toThrow(/kebab/);
    expect(() => createRegistry([def("a", { related: ["nope"] })])).toThrow(/related/);
    const broken = def("a");
    const messages = broken.messages as Partial<ToolDefinition["messages"]>;
    delete messages.en;
    expect(() => createRegistry([broken])).toThrow(/missing messages/);
  });
  it("queries", () => {
    const r = createRegistry([def("a", { related: ["b"] }), def("b", { category: "media" })]);
    expect(r.getBySlug("a")?.meta.id).toBe("a");
    expect(r.byCategory("media").map((d) => d.meta.id)).toEqual(["b"]);
    expect(r.categories()).toEqual(["developer", "media"]);
    expect(r.related("a").map((d) => d.meta.id)).toEqual(["b"]);
  });
  it("search ignores accents", () => {
    const r = createRegistry([def("a")]);
    expect(r.search("codificacao", "pt-BR")).toHaveLength(1);
    expect(r.search("zzz", "en")).toHaveLength(0);
    expect(r.search("", "en")).toHaveLength(1);
  });
});

describe("runTool", () => {
  const tool: ToolModule<{ n: number }, number> = {
    inputSchema: z.object({ n: z.number() }),
    async execute({ n }) {
      if (n < 0) throw new Error("boom");
      if (n === 99) throw new ToolError("UNSUPPORTED", "errors.unsupported");
      return n * 2;
    },
  };
  it("runs valid input", async () => {
    expect(await runTool(tool, { n: 2 })).toEqual({ ok: true, value: 4 });
  });
  it("maps validation errors", async () => {
    const r = await runTool(tool, { n: "x" });
    expect(!r.ok && r.error.code).toBe("VALIDATION");
  });
  it("maps execution and ToolError", async () => {
    const a = await runTool(tool, { n: -1 });
    expect(!a.ok && a.error.code).toBe("EXECUTION");
    const b = await runTool(tool, { n: 99 });
    expect(!b.ok && b.error.code).toBe("UNSUPPORTED");
  });
  it("maps abort", async () => {
    const c = new AbortController();
    c.abort();
    const r = await runTool(tool, { n: 1 }, { signal: c.signal });
    expect(!r.ok && r.error.code).toBe("ABORTED");
  });
});
