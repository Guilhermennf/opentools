import { describe, expect, it } from "vitest";
import { buildMetadata } from "./metadata";

describe("buildMetadata", () => {
  it("gives each locale its own canonical and full hreflang set", () => {
    const pt = buildMetadata({ locale: "pt-BR", path: "/tools/hash-generator", title: "t", description: "d" });
    const en = buildMetadata({ locale: "en", path: "/tools/hash-generator", title: "t", description: "d" });
    expect(pt.alternates?.canonical).toMatch(/\/pt-BR\/tools\/hash-generator$/);
    expect(en.alternates?.canonical).toMatch(/\/en\/tools\/hash-generator$/);
    expect(pt.alternates?.canonical).not.toBe(en.alternates?.canonical);
    const langs = pt.alternates?.languages as Record<string, string>;
    expect(Object.keys(langs).sort()).toEqual(["en", "pt-BR", "x-default"]);
    expect(langs["x-default"]).toBe(langs["en"]);
  });
  it("sets noindex only when asked", () => {
    expect(buildMetadata({ locale: "en", path: "", title: "t", description: "d" }).robots).toBeUndefined();
    expect(buildMetadata({ locale: "en", path: "", title: "t", description: "d", noindex: true }).robots).toEqual({ index: false, follow: true });
  });
});
