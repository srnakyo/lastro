import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

test.skip(({ isMobile }) => isMobile, "runs once, on desktop");

test("a person creates an agent token, sees it once, and revokes it in a dialog", async ({ page }) => {
  await signIn(page);
  await page.goto("/projects/e2e-demo/settings");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "New token" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Name").fill("e2e agent");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Copy it now: it will not be shown again.")).toBeVisible();
  await expect(page.getByRole("status").locator("code")).toHaveText(/^lst_/);
  const row = page.getByRole("listitem").filter({ hasText: "e2e agent" }).first();
  await expect(row.getByText("Agent (MCP)")).toBeVisible();
  await row.getByRole("button", { name: "Revoke" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Revoke" }).click();
  await expect(row.getByText("Revoked")).toBeVisible();
  await page.screenshot({ path: ".lastro/.out/screens/settings-tokens.png", fullPage: true });
});
