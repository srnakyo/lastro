import { expect, test, type Page } from "@playwright/test";
import { signIn } from "./helpers";

test.skip(({ isMobile }) => isMobile, "runs once, on desktop");

async function open(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
}

/** A Mermaid node of a diagram, by the text it shows. */
const node = (page: Page, region: string, text: string | RegExp) => page.getByRole("region", { name: region }).locator("g.node").filter({ hasText: text });

test("the traceability diagram draws a criterion without a test in red, labelled 'no test' (REQ-M4R7W)", async ({ page }) => {
  await signIn(page);
  await open(page, "/projects/shop-demo/diagrams");
  await page.getByRole("region", { name: "Traceability" }).getByRole("combobox").selectOption("REQ-HST01");
  const gap = node(page, "Traceability", "AC-1 · no test");
  await expect(gap).toHaveCount(1, { timeout: 15_000 });
  await expect(gap).toHaveClass(/\bfailed\b/);
  await expect(node(page, "Traceability", "REQ-HST01")).toHaveCount(1);
});

test("the lifecycle diagram counts the requirements in each state and marks a blocked move with its reasons (REQ-N7T0X)", async ({ page }) => {
  await signIn(page);
  await open(page, "/projects/shop-demo/diagrams");
  const lifecycle = page.getByRole("region", { name: "Lifecycle" });
  await expect(lifecycle.getByText(/^captured \([1-9]\d*\)$/)).toBeVisible({ timeout: 15_000 });
  await expect(lifecycle.getByText(/^verified \(\d+\)$/)).toBeVisible();
  await expect(lifecycle.getByText("blocked: open question, missing field")).toBeVisible();
});

test("the QA flow of a requirement colors each stage by its latest result (REQ-R6Y9A)", async ({ page }) => {
  await signIn(page);
  await open(page, "/projects/shop-demo/requirements/REQ-PAY01");
  const flow = page.getByRole("region", { name: "QA flow" });
  await expect(flow.locator("g.node.failed")).not.toHaveCount(0, { timeout: 15_000 });
  await expect(flow.locator("g.node.passed")).not.toHaveCount(0);
  await expect(node(page, "QA flow", /mobile/)).toHaveClass(/\bfailed\b/);
});
