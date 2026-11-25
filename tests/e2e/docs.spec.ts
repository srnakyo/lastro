import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

test.skip(({ isMobile }) => isMobile, "generates documents: runs once, on desktop");

test("a person generates the documents, reads one with its diagrams and downloads the PDF", async ({ page }) => {
  test.setTimeout(90_000);
  await signIn(page);
  await page.goto("/projects/shop-demo/docs");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Generate documents" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Generate documents" }).click();
  await expect(page.getByText("Documents generated")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole("link", { name: "pdf" }).first()).toBeVisible();
  await page.goto("/projects/shop-demo/docs/test-plan");
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("heading", { name: "Test plan: Shop demo" })).toBeVisible();
  await expect(page.locator("svg[id^=m]").first()).toBeVisible({ timeout: 15_000 });
  const pdf = await page.request.get("/api/projects/shop-demo/docs/test-plan.pdf");
  expect(pdf.headers()["content-type"]).toBe("application/pdf");
  expect((await pdf.body()).subarray(0, 5).toString()).toBe("%PDF-");
  await page.screenshot({ path: ".lastro/.out/screens/doc-test-plan.png", fullPage: true });
});
