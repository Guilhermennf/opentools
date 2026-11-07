import { expect, test } from "@playwright/test";

const SHA256_ABC = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";
const MD5_ABC = "900150983cd24fb0d6963f7d28e17f72";

test.describe("hash generator", () => {
  test("hashes text with SHA-256 by default", async ({ page }) => {
    await page.goto("/en/tools/hash-generator");
    await page.getByLabel("Text to hash").fill("abc");
    await page.getByRole("button", { name: "Generate hash" }).click();
    await expect(page.getByTestId("hash-output")).toHaveText(SHA256_ABC);
  });

  test("supports MD5 and warns that it is legacy", async ({ page }) => {
    await page.goto("/en/tools/hash-generator");
    await page.getByLabel("Algorithm").selectOption("MD5");
    await expect(page.getByText("MD5 is not secure against collisions")).toBeVisible();
    await page.getByLabel("Text to hash").fill("abc");
    await page.getByRole("button", { name: "Generate hash" }).click();
    await expect(page.getByTestId("hash-output")).toHaveText(MD5_ABC);
  });

  test("clears a stale result when the input changes", async ({ page }) => {
    await page.goto("/en/tools/hash-generator");
    await page.getByLabel("Text to hash").fill("abc");
    await page.getByRole("button", { name: "Generate hash" }).click();
    await expect(page.getByTestId("hash-output")).toBeVisible();
    await page.getByLabel("Text to hash").fill("abcd");
    await expect(page.getByTestId("hash-output")).toHaveCount(0);
  });

  test("hashes a file and asks for one when missing", async ({ page }) => {
    await page.goto("/pt-BR/tools/hash-generator");
    await page.getByRole("radio", { name: "Arquivo" }).click();
    await page.getByRole("button", { name: "Gerar hash" }).click();
    await expect(page.getByText("Escolha um arquivo primeiro.")).toBeVisible();
    await page.getByLabel("Arquivo para gerar o hash").setInputFiles({ name: "a.txt", mimeType: "text/plain", buffer: Buffer.from("abc") });
    await page.getByRole("button", { name: "Gerar hash" }).click();
    await expect(page.getByTestId("hash-output")).toHaveText(SHA256_ABC);
  });

  test("hashes a large file in a worker", async ({ page }) => {
    await page.goto("/en/tools/hash-generator");
    await page.getByRole("radio", { name: "File" }).click();
    const big = Buffer.alloc(3 * 1024 * 1024, 97);
    await page.getByLabel("File to hash").setInputFiles({ name: "big.bin", mimeType: "application/octet-stream", buffer: big });
    await page.getByLabel("Algorithm").selectOption("SHA-1");
    await page.getByRole("button", { name: "Generate hash" }).click();
    const { createHash } = await import("node:crypto");
    await expect(page.getByTestId("hash-output")).toHaveText(createHash("sha1").update(big).digest("hex"));
  });

  test("renders FAQ and FAQPage JSON-LD", async ({ page }) => {
    await page.goto("/en/tools/hash-generator");
    await expect(page.getByRole("heading", { name: "Frequently asked questions" })).toBeVisible();
    const types = await page.$$eval('script[type="application/ld+json"]', (nodes) => nodes.flatMap((n) => JSON.parse(n.textContent ?? "[]")).map((d: { "@type": string }) => d["@type"]));
    expect(types).toContain("FAQPage");
  });
});

test.describe("json formatter", () => {
  test("formats the example and preserves big numbers", async ({ page }) => {
    await page.goto("/en/tools/json-formatter");
    await page.getByRole("button", { name: "Example" }).click();
    await page.getByRole("button", { name: "Format" }).click();
    const out = page.getByLabel("Output");
    await expect(out).toHaveValue(/"name": "OpenTools"/);
    await expect(out).toHaveValue(/12345678901234567890/);
    await expect(page.getByTestId("json-valid")).toContainText("Valid JSON");
  });

  test("minifies and honours the indentation setting", async ({ page }) => {
    await page.goto("/en/tools/json-formatter");
    await page.getByLabel("JSON input").fill('{"a":[1,2]}');
    await page.getByLabel("Indentation").selectOption("4");
    await page.getByRole("button", { name: "Format" }).click();
    await expect(page.getByLabel("Output")).toHaveValue(/\n {4}"a": \[/);
    await page.getByRole("button", { name: "Minify" }).click();
    await expect(page.getByLabel("Output")).toHaveValue('{"a":[1,2]}');
  });

  test("reports line and column in Portuguese", async ({ page }) => {
    await page.goto("/pt-BR/tools/json-formatter");
    await page.getByLabel("Entrada JSON").fill('{\n  "a": 1,\n  "b": ,\n}');
    await page.getByRole("button", { name: "Validar" }).click();
    const alert = page.getByRole("alert").filter({ hasText: "JSON" });
    await expect(alert).toContainText("JSON inválido");
    await expect(alert).toContainText("Linha 3, coluna 8");
    await expect(page.getByLabel("Entrada JSON")).toHaveAttribute("aria-invalid", "true");
  });

  test("asks for input when empty", async ({ page }) => {
    await page.goto("/en/tools/json-formatter");
    await page.getByRole("button", { name: "Validate" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Paste some JSON first." })).toBeVisible();
  });
});

test.describe("tools page", () => {
  test("groups tools by category and hides empty categories while searching", async ({ page }) => {
    await page.goto("/en/tools");
    await expect(page.getByRole("heading", { level: 2, name: "Developer" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Media" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Developer" }).getByRole("link")).toHaveAttribute("href", "/en/categories/developer");
    await page.getByLabel("Search tools").fill("mp3");
    await expect(page.getByRole("heading", { level: 2, name: "Media" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Developer" })).toHaveCount(0);
  });
});
