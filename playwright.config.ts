import { defineConfig, devices } from "@playwright/test";

/**
 * The browsers to run: desktop and phone, or the single viewport of a lastro.yml condition
 * (E2E_VIEWPORT=390x844 runs as a phone, wider runs as a desktop).
 */
function projects() {
  const match = /^(\d+)x(\d+)$/.exec(process.env.E2E_VIEWPORT ?? "");
  if (!match) {
    return [
      { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
      { name: "phone", use: { ...devices["Pixel 7"] } },
    ];
  }
  const viewport = { width: Number(match[1]), height: Number(match[2]) };
  return [viewport.width < 600 ? { name: "phone", use: { ...devices["Pixel 7"], viewport } } : { name: "desktop", use: { ...devices["Desktop Chrome"], viewport } }];
}

/** E2E against a running dashboard with the dev seed (bun scripts/seed-dev.ts). */
export default defineConfig({
  testDir: "tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  timeout: 60_000,
  fullyParallel: false,
  reporter: [["list"], ["junit", { outputFile: ".lastro/.out/e2e.xml" }]],
  use: { baseURL: process.env.E2E_BASE_URL ?? "http://localhost:4317", trace: "retain-on-failure" },
  projects: projects(),
});
