import { expect, test, type Page } from "@playwright/test";
import { signIn } from "./helpers";

test.describe.configure({ mode: "serial" });
test.skip(({ isMobile }) => isMobile, "admin flows run once, on desktop");

async function open(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
}

test("the QA flow editor adds a stage with a condition and saves it after a confirmation", async ({ page }) => {
  await signIn(page);
  await open(page, "/projects/e2e-demo/settings");
  await expect(page.getByRole("button", { name: "Save QA configuration" })).toBeDisabled();
  await page.getByRole("button", { name: "Add command" }).click();
  const command = page.getByLabel("Name").last();
  await command.fill("unit");
  await page.getByLabel("Command line").last().fill("bun test");
  await page.getByRole("button", { name: "Add condition" }).click();
  await page.getByLabel("Name").nth(-2).fill("dark");
  await page.getByRole("button", { name: "Add stage" }).first().click();
  await expect(page.getByText("Unsaved changes")).toBeVisible();
  await page.getByRole("button", { name: "Save QA configuration" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("QA configuration saved")).toBeVisible();
  await page.reload();
  await page.waitForLoadState("networkidle");
  await expect(page.getByLabel("Command line").first()).toHaveValue("bun test");
});

test("the glossary takes a new term and the audit log shows it", async ({ page }) => {
  await signIn(page);
  await open(page, "/projects/e2e-demo/glossary");
  await page.getByRole("button", { name: "Add term" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Term").fill("Seat");
  await dialog.getByLabel("Means").fill("An active user on the plan");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText("An active user on the plan")).toBeVisible();
  await open(page, "/projects/e2e-demo/audit");
  await expect(page.getByRole("cell", { name: "Changed a glossary term" }).first()).toBeVisible();
});

test("agent sessions show what the agent did, refused actions included", async ({ page }) => {
  await signIn(page);
  await open(page, "/projects/shop-demo/agents");
  await page.locator("summary").filter({ hasText: "demo-session-check" }).click();
  await expect(page.getByText(/holds tests of locked criteria/)).toBeVisible();
  await expect(page.getByText("Stop held by the gate")).toBeVisible();
});

test("members are listed with their roles, in the workspace settings", async ({ page }) => {
  await signIn(page);
  await open(page, "/settings");
  await page.getByRole("tab", { name: "Members" }).click();
  await expect(page.getByText("dev@lastro.local")).toBeVisible();
});
