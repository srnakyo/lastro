import { expect, test } from "@playwright/test";
import { BASE_URL, signIn } from "./helpers";

test.skip(({ isMobile }) => isMobile, "runs once, on desktop");

test("a project's own token is made in its settings, shown once with the commands that connect the repository, and revoked in a dialog", async ({ page }) => {
  await signIn(page);
  await page.goto("/projects/e2e-demo/settings");
  await page.waitForLoadState("networkidle");
  await page.getByRole("tab", { name: "Access tokens" }).click();
  await page.getByRole("button", { name: "New token" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Name").fill("e2e agent");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Copy it now: it will not be shown again.")).toBeVisible();
  const token = await page.getByRole("status").locator("code").textContent();
  expect(token).toMatch(/^lst_/);
  const commands = page.getByLabel(/^Then, in your terminal/);
  await expect(commands).toContainText(`lastro login --url ${BASE_URL} --token ${token}`);
  await expect(commands).toContainText("lastro init e2e-demo");
  const row = page.getByRole("listitem").filter({ hasText: "e2e agent" }).first();
  await expect(row.getByText("Agent", { exact: true })).toBeVisible();
  await row.getByRole("button", { name: "Revoke" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Revoke" }).click();
  await expect(row.getByText("Revoked")).toBeVisible();
  await page.screenshot({ path: ".lastro/.out/screens/settings-tokens.png", fullPage: true });
});

test("an empty project starts with connecting the repository, which opens the workspace tokens with the login command", async ({ page }) => {
  await signIn(page);
  await page.goto("/projects/billing-demo");
  await page.waitForLoadState("networkidle");
  const first = page.getByRole("link", { name: /Connect the repository/ });
  await expect(first).toBeVisible();
  await first.click();
  await expect(page).toHaveURL(/\/settings\?tab=tokens$/);
  await expect(page.getByRole("tab", { name: "Access tokens" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByText(`lastro login --url ${BASE_URL}`)).toBeVisible();
});
