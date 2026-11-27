/**
 * The README screenshots, taken from the running dashboard with the demo data (bun scripts/seed-dev.ts, then
 * the e2e seed): bun scripts/screenshots.ts [base URL]. Writes docs/screenshots/*.png at 1440 × 900.
 */
import { chromium, type Page } from "@playwright/test";
import { fileURLToPath } from "node:url";

const BASE = process.argv[2] ?? process.env.E2E_BASE_URL ?? "http://localhost:4317";
const OUT = fileURLToPath(new URL("../docs/screenshots/", import.meta.url));
const USER = { email: "dev@lastro.local", password: "lastro-dev-password" };
const P = "/projects/shop-demo";

interface Shot {
  name: string;
  path: string;
  full?: boolean;
  /** What to wait for or do before the picture. */
  before?: (page: Page) => Promise<void>;
}

const diagrams = async (page: Page) => {
  await page.locator("svg[id^=m]").first().waitFor({ timeout: 20_000 });
  await page.waitForTimeout(800);
};

const SHOTS: Shot[] = [
  { name: "overview", path: P },
  { name: "requirement", path: `${P}/requirements/REQ-STK01`, full: true, before: diagrams },
  { name: "tests", path: `${P}/tests` },
  { name: "run", path: `${P}/runs`, before: async (page) => {
    await page.getByRole("link", { name: "f6a7b8c" }).click();
    await page.waitForLoadState("networkidle");
  } },
  { name: "diagrams", path: `${P}/diagrams`, before: diagrams },
  { name: "flow-editor", path: `${P}/settings` },
  { name: "agents", path: `${P}/agents` },
  { name: "docs", path: `${P}/docs/test-plan`, before: diagrams },
];

const LIGHT = new Set(["overview", "requirement", "diagrams"]);

async function signIn(page: Page, theme: "dark" | "light") {
  await page.context().addCookies([{ name: "lastro_lang", value: "en", url: BASE }, { name: "lastro_theme", value: theme, url: BASE }]);
  await page.goto(`${BASE}/sign-in`);
  await page.waitForLoadState("networkidle");
  await page.fill("#email", USER.email);
  await page.fill("#password", USER.password);
  await page.click("button[type=submit]");
  await page.waitForURL(`${BASE}/`);
}

/** The documents exist only once generated; the test plan is one of them. */
async function ensureDocuments(page: Page) {
  const doc = await page.request.get(`${BASE}/api/projects/shop-demo/docs/test-plan.pdf`);
  if (doc.ok()) return;
  await page.goto(`${BASE}${P}/docs`);
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Generate documents" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Generate documents" }).click();
  await page.getByText("Documents generated").waitFor({ timeout: 60_000 });
}

const browser = await chromium.launch();
for (const theme of ["dark", "light"] as const) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await signIn(page, theme);
  await ensureDocuments(page);
  for (const shot of SHOTS) {
    if (theme === "light" && !LIGHT.has(shot.name)) continue;
    await page.goto(`${BASE}${shot.path}`);
    await page.waitForLoadState("networkidle");
    await shot.before?.(page);
    const file = `${OUT}${shot.name}${theme === "light" ? "-light" : ""}.png`;
    await page.screenshot({ path: file, fullPage: shot.full ?? false });
    console.log(file);
  }
  await page.close();
}
await browser.close();
