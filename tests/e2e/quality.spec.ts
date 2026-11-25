import { expect, test, type Page } from "@playwright/test";
import { signIn } from "./helpers";

test.describe.configure({ mode: "serial" });

async function open(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
}

test("the test catalog shows flaky and orphan tests and the criteria without a test", async ({ page }) => {
  await signIn(page);
  await open(page, "/projects/shop-demo/tests");
  await expect(page.getByText("floors the total at shipping")).toBeVisible();
  const flaky = page.getByRole("tab", { name: /Flaky/ });
  await expect(async () => {
    await flaky.click();
    await expect(flaky).toHaveAttribute("aria-selected", "true", { timeout: 500 });
  }).toPass();
  await expect(page.locator("tbody tr")).toHaveCount(2);
  await page.getByRole("tab", { name: /Orphan/ }).click();
  await expect(page.getByText("formats money")).toBeVisible();
  await expect(page.getByText("Orders are listed newest first.")).toBeVisible();
});

test("a run opens with its stages, the failing test and its message", async ({ page }) => {
  await signIn(page);
  await open(page, "/projects/shop-demo/runs");
  await expect(page.getByText("Test results per run")).toBeVisible();
  await page.getByRole("link", { name: "f6a7b8c" }).click();
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("heading", { name: /Run f6a7b8c/ })).toBeVisible();
  await expect(page.getByText(/to hold on mobile/).first()).toBeVisible();
  await expect(page.getByText("Since the previous run")).toBeVisible();
});

test("the diagrams render from the project data", async ({ page }) => {
  await signIn(page);
  await open(page, "/projects/shop-demo/diagrams");
  await expect(page.locator("svg[id^=m]")).toHaveCount(4, { timeout: 15_000 });
  await expect(page.locator("svg[id^=m]").nth(1)).toContainText("REQ-PAY01");
});

test("a person signs the manual preview and the requirement becomes verified", async ({ page, isMobile }) => {
  test.skip(isMobile, "changes data: runs once, on desktop");
  await signIn(page);
  await open(page, "/projects/shop-demo/requirements/REQ-STK01");
  await expect(page.getByText("Gate red")).toBeVisible();
  await page.getByRole("button", { name: "Sign preview" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Reference").fill("client e-mail 2026-11-25");
  await dialog.getByRole("button", { name: "Sign" }).click();
  await expect(page.getByText("Gate green")).toBeVisible();
  await expect(page.getByText("Verified", { exact: true }).first()).toBeVisible();
});
