import { expect, test, type Page } from "@playwright/test";
import { signIn } from "./helpers";

test.describe.configure({ mode: "serial" });
test.skip(({ isMobile }) => isMobile, "runs once, on desktop");

const REQ = "/projects/e2e-auto/requirements/REQ-AT001";

async function open(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
}

test("a requirement shows its tests by level and waits for the level its type still asks", async ({ page }) => {
  await signIn(page);
  await open(page, REQ);
  const levels = page.getByRole("region", { name: "Tests by level" });
  await expect(levels.getByText("This type asks for:")).toBeVisible();
  await expect(levels.getByText("tests/unit/invoice.test.ts::shows the 8% line for 60 seats")).toBeVisible();
  await expect(levels.getByText("missing", { exact: true })).toBeVisible();
  await expect(page.getByText(/The agent writes and links a test for every criterion \(missing level: End to end \(Playwright\)\)\. Then Lastro approves it by itself\./)).toBeVisible();
  await expect(page.getByRole("button", { name: "Approve" })).toHaveCount(0);
  await page.screenshot({ path: ".lastro/.out/screens/requirement-test-levels.png", fullPage: true });
});

test("in automatic mode, dropping the level the type asked for lets Lastro approve the requirement by itself", async ({ page }) => {
  await signIn(page);
  await open(page, "/projects/e2e-auto/settings");
  await page.getByRole("tab", { name: "QA flows" }).click();
  await expect(page.getByRole("radio", { name: /Automatic/ })).toHaveAttribute("aria-checked", "true");
  await page.getByRole("button", { name: "End to end (Playwright)", pressed: true }).click();
  await page.getByRole("button", { name: "Save QA configuration" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await page.screenshot({ path: ".lastro/.out/screens/settings-test-rules.png", fullPage: true });

  await open(page, REQ);
  await expect(page.getByText("Approved", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Locked", { exact: true })).toBeVisible();
});
