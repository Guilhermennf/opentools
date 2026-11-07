import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  reporter: [["list"]],
  use: { baseURL: `http://localhost:${PORT}`, trace: "on-first-retry" },
  webServer: {
    command: `pnpm exec next start -p ${PORT}`,
    url: `http://localhost:${PORT}/en`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: { NEXT_PUBLIC_SITE_URL: `http://localhost:${PORT}` },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
