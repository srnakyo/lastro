import { expect, test, type Page } from "@playwright/test";
import { signIn } from "./helpers";

test.skip(({ isMobile }) => isMobile, "runs once, on desktop");

async function open(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
}

test("a run says which tests passed again since the previous run, and links to it (REQ-S9A2B)", async ({ page }) => {
  await signIn(page);
  await open(page, "/projects/shop-demo/runs");
  await page.getByRole("link", { name: "b2c3d4e" }).click();
  await page.waitForLoadState("networkidle");
  const changes = page.getByRole("region", { name: "Since the previous run" });
  await expect(changes.getByRole("link", { name: "compared with run a1b2c3d" }).first()).toBeVisible();
  await expect(changes.getByText("Passing again").first()).toBeVisible();
  await expect(changes.getByText(/drops items after 7 days/)).toBeVisible();
});
