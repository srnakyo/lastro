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

test("the overview says where the project stands and each next step opens the place where it is done", async ({ page }) => {
  await signIn(page);
  await page.goto("/projects/shop-demo");
  await expect(page.getByRole("heading", { name: "What to do now" })).toBeVisible();
  const steps = page.getByRole("list", { name: "What to do now" }).getByRole("link");
  await expect(steps.first()).toBeVisible();
  await steps.first().click();
  await expect(page).toHaveURL(/\/projects\/shop-demo\/.+/);
});

test("the guide explains the path and the words, and opens inside the project", async ({ page }) => {
  await signIn(page);
  await page.goto("/projects/shop-demo");
  await page.getByRole("link", { name: "How Lastro works" }).click();
  await expect(page).toHaveURL(/\/projects\/shop-demo\/guide$/);
  await expect(page.getByRole("heading", { name: "How Lastro works", level: 1 })).toBeVisible();
  for (const name of ["The path of a requirement", "The four proofs", "Who does what", "Words you will see"]) await expect(page.getByRole("heading", { name })).toBeVisible();
});

test("the language switch in the top bar changes every page, and back", async ({ page, isMobile }) => {
  await signIn(page);
  await page.goto("/projects/shop-demo");
  await page.waitForLoadState("networkidle");
  await page.getByRole("radio", { name: "Português (Brasil)" }).click();
  await expect(page.getByRole("heading", { name: "O que fazer agora" })).toBeVisible();
  if (!isMobile) {
    await page.locator("aside").getByRole("link", { name: "Requisitos" }).click();
    await expect(page.getByRole("heading", { name: "Requisitos", level: 1 })).toBeVisible();
  }
  await page.getByRole("radio", { name: "English" }).click();
  await expect(page.getByRole("heading", { name: isMobile ? "What to do now" : "Requirements", level: isMobile ? 2 : 1 })).toBeVisible();
});

test("with no language picked, the screens follow the browser's language", async ({ browser }) => {
  const context = await browser.newContext({ locale: "pt-BR" });
  const page = await context.newPage();
  await page.goto("/sign-in");
  await expect(page.getByRole("heading", { name: "Entrar no Lastro" })).toBeVisible();
  await context.close();
});
