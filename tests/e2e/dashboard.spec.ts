import { expect, test } from "@playwright/test";
import { DEV_USER, signIn } from "./helpers";

test("signing in lands on the projects of the workspace", async ({ page }) => {
  await signIn(page);
  await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Lastro/ }).first()).toBeVisible();
  await expect(page.getByText("billing-demo")).toBeVisible();
});

test("a wrong password says so under the field and stays on sign-in", async ({ page }) => {
  await page.goto("/sign-in");
  await page.waitForLoadState("networkidle");
  await page.fill("#email", "dev@lastro.local");
  await page.fill("#password", "not-the-password");
  await page.click("button[type=submit]");
  await expect(page.getByRole("alert")).toHaveText(/did not match/);
  await expect(page).toHaveURL(/sign-in/);
});

test("the overview shows the KPI cards, distribution, runs and quality per module", async ({ page }) => {
  await signIn(page);
  await page.goto("/projects/lastro");
  for (const name of ["Covered by tests", "Tests run", "Passed", "Failed"]) await expect(page.getByText(name, { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Test results" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Latest runs" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Quality per module" })).toBeVisible();
});

test("the project switcher moves between projects and keeps the page", async ({ page, isMobile }) => {
  test.skip(isMobile, "the switcher sits in the top bar on desktop");
  await signIn(page);
  await page.goto("/projects/lastro");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Find a project" }).click();
  await page.getByRole("option", { name: /Billing demo/ }).click();
  await expect(page).toHaveURL(/\/projects\/billing-demo$/);
  await expect(page.getByRole("heading", { name: "Billing demo", level: 1 })).toBeVisible();
});

test("protected pages send signed-out people to sign-in", async ({ page }) => {
  await page.goto("/projects/lastro");
  await expect(page).toHaveURL(/sign-in/);
});

test("signing in from a project URL returns to that URL (REQ-J8M1T)", async ({ page }) => {
  await page.goto("/projects/shop-demo/tests");
  await page.waitForLoadState("networkidle");
  await expect(page).toHaveURL(/\/sign-in\?redirect=/);
  await page.fill("#email", DEV_USER.email);
  await page.fill("#password", DEV_USER.password);
  await page.click("button[type=submit]");
  await expect(page).toHaveURL(/\/projects\/shop-demo\/tests$/);
});

test("a project outside the person's workspaces answers as not found (REQ-J8M1T)", async ({ page }) => {
  await signIn(page);
  await page.goto("/projects/someone-elses-project");
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
});
