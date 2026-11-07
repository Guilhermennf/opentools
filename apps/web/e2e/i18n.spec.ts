import { expect, test, type APIRequestContext } from "@playwright/test";

async function redirectFor(request: APIRequestContext, headers: Record<string, string>, path = "/") {
  const res = await request.get(path, { headers, maxRedirects: 0 });
  return { status: res.status(), location: res.headers()["location"] ?? "" };
}

test.describe("root redirect by browser language (spec 2.2)", () => {
  const cases: [string, string][] = [
    ["pt-BR", "/pt-BR"],
    ["pt-PT", "/pt-BR"],
    ["en-US", "/en"],
    ["en-GB", "/en"],
    ["es-ES", "/en"],
    ["", "/en"],
  ];
  for (const [lang, expected] of cases) {
    test(`Accept-Language "${lang}" -> ${expected}`, async ({ request }) => {
      const { status, location } = await redirectFor(request, lang ? { "Accept-Language": lang } : {});
      expect(status).toBe(307);
      expect(new URL(location, "http://x").pathname).toBe(expected);
    });
  }

  test("saved cookie beats Accept-Language", async ({ request }) => {
    const { location } = await redirectFor(request, { "Accept-Language": "pt-BR", Cookie: "NEXT_LOCALE=en" });
    expect(new URL(location, "http://x").pathname).toBe("/en");
  });

  test("unprefixed deep path keeps path", async ({ request }) => {
    const { location } = await redirectFor(request, { "Accept-Language": "pt-BR" }, "/tools/hash-generator");
    expect(new URL(location, "http://x").pathname).toBe("/pt-BR/tools/hash-generator");
  });

  test("localized URL is never overridden by browser language", async ({ request }) => {
    const res = await request.get("/en/tools", { headers: { "Accept-Language": "pt-BR" }, maxRedirects: 0 });
    expect(res.status()).toBe(200);
  });
});

test.describe("routes and SEO", () => {
  const paths = ["", "/tools", "/about", "/community", "/categories/developer", "/categories/media", "/tools/hash-generator", "/tools/json-formatter", "/tools/media-converter"];
  for (const locale of ["pt-BR", "en"]) {
    for (const p of paths) {
      test(`${locale}${p || "/"} responds 200 with matching lang, canonical and hreflang`, async ({ page }) => {
        const res = await page.goto(`/${locale}${p}`);
        expect(res?.status()).toBe(200);
        await expect(page.locator("html")).toHaveAttribute("lang", locale);
        await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", new RegExp(`/${locale}${p}$`));
        for (const l of ["pt-BR", "en", "x-default"]) {
          await expect(page.locator(`link[rel="alternate"][hreflang="${l}"]`)).toHaveCount(1);
        }
        await expect(page.locator("h1")).toHaveCount(1);
      });
    }
  }

  test("unreleased tool pages are noindex", async ({ page }) => {
    await page.goto("/en/tools/hash-generator");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  });

  test("unknown tool slug is 404", async ({ request }) => {
    expect((await request.get("/en/tools/nope")).status()).toBe(404);
  });
});

test.describe("language switcher", () => {
  test("keeps the current tool, sets cookie, persists on /", async ({ page, context }) => {
    await page.goto("/en/tools/hash-generator");
    await page.getByRole("button", { name: "Language" }).click();
    await page.getByRole("menuitemradio", { name: "Português (Brasil)" }).click();
    await expect(page).toHaveURL(/\/pt-BR\/tools\/hash-generator$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
    const cookies = await context.cookies();
    expect(cookies.find((c) => c.name === "NEXT_LOCALE")?.value).toBe("pt-BR");
    await page.goto("/");
    await expect(page).toHaveURL(/\/pt-BR$/);
  });

  test("navigation links keep the locale", async ({ page }) => {
    await page.goto("/pt-BR");
    await page.getByRole("navigation", { name: "Navegação principal" }).getByRole("link", { name: "Ferramentas" }).click();
    await expect(page).toHaveURL(/\/pt-BR\/tools$/);
  });
});

test.describe("search, theme and layout", () => {
  test("search ignores accents", async ({ page }) => {
    await page.goto("/pt-BR/tools");
    await page.getByLabel("Buscar ferramentas").fill("conversao midia");
    await expect(page.getByRole("heading", { level: 3 })).toHaveCount(0);
    await page.getByLabel("Buscar ferramentas").fill("formatador");
    await expect(page.getByRole("heading", { level: 3, name: "Formatador de JSON" })).toBeVisible();
  });

  test("theme persists after reload", async ({ page }) => {
    await page.goto("/en");
    await page.getByRole("button", { name: "Theme" }).click();
    await page.getByRole("menuitemradio", { name: "Dark" }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await page.reload();
    await expect(page.locator("html")).toHaveClass(/dark/);
  });

  test("no horizontal scroll at 375px", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    for (const p of ["/en", "/en/tools/media-converter", "/pt-BR/tools/hash-generator"]) {
      await page.goto(p);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
      expect(overflow, p).toBe(false);
    }
  });
});
