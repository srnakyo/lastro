import { defineConfig, devices } from "@playwright/test";

/** E2E against a running dashboard with the dev seed (bun scripts/seed-dev.ts). */
export default defineConfig({
  testDir: "tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  timeout: 60_000,
  fullyParallel: false,
  reporter: [["list"], ["junit", { outputFile: ".lastro/.out/e2e.xml" }]],
  use: { baseURL: process.env.E2E_BASE_URL ?? "http://localhost:4317", trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "phone", use: { ...devices["Pixel 7"] } },
  ],
});
