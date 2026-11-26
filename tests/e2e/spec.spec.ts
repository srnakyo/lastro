import { expect, test, type Page } from "@playwright/test";
import { signIn } from "./helpers";

test.describe.configure({ mode: "serial" });
test.skip(({ isMobile }) => isMobile, "spec flows run once, on desktop");

async function open(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
}

test("the requirements list says what unlocks them, and the requirement says its next step", async ({ page }) => {
  await signIn(page);
  await open(page, "/projects/e2e-demo/requirements");
  const unlock = page.locator("div").filter({ has: page.getByText("What unlocks these requirements") }).first();
  await expect(unlock.getByText(/is not marked final: it holds 2 requirement\(s\) back from approval/)).toBeVisible();
  await expect(unlock.getByRole("button", { name: /^Mark SRC-\w+ final$/ })).toBeVisible();
  await open(page, "/projects/e2e-demo/requirements/REQ-E2E01");
  await expect(page.getByText(/Before approving, mark the source SRC-\w+ as final/)).toBeVisible();
});

test("a requirement shows its quote next to the source and what holds it back", async ({ page }) => {
  await signIn(page);
  await open(page, "/projects/e2e-demo/requirements/REQ-E2E01");
  await expect(page.getByRole("heading", { name: "Volume discount on the invoice" })).toBeVisible();
  await expect(page.getByText("Found in the source")).toBeVisible();
  await expect(page.getByText("Source not marked final")).toBeVisible();
  await expect(page.getByRole("button", { name: "Approve" })).toBeDisabled();
});

test("marking the source final lets a person approve, and approval locks the criteria", async ({ page }) => {
  await signIn(page);
  await open(page, "/projects/e2e-demo/sources");
  await page.getByRole("link", { name: /brief\.md/ }).click();
  await page.getByRole("button", { name: "Mark as final" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Mark as final" }).click();
  await expect(page.getByRole("button", { name: "Mark as final" })).toHaveCount(0);
  await open(page, "/projects/e2e-demo/requirements/REQ-E2E01");
  await page.getByRole("button", { name: "Approve" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Approve" }).click();
  await expect(page.getByText("Approved", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Locked", { exact: true })).toBeVisible();
});

test("a blocking question holds its requirement until a person records the answer", async ({ page }) => {
  await signIn(page);
  await open(page, "/projects/e2e-demo/requirements/REQ-E2E02");
  await expect(page.getByText("Blocking question open")).toBeVisible();
  await open(page, "/projects/e2e-demo/requirements/questions");
  await page.getByRole("button", { name: "Record answer" }).click();
  await page.getByRole("dialog").getByRole("textbox").first().fill("Yes, same as the PDF.");
  await page.getByRole("dialog").getByRole("button", { name: "Save" }).click();
  // The dialog closes only once the server saved the answer; the typed text alone is already on screen in the textarea.
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.getByText("Yes, same as the PDF.")).toBeVisible();
  await open(page, "/projects/e2e-demo/requirements/REQ-E2E02");
  await expect(page.getByText("Blocking question open")).toHaveCount(0);
  await expect(page.getByText("Requester's answer")).toHaveCount(0);
});

test("dropping needs a reason, written in a dialog", async ({ page }) => {
  await signIn(page);
  await open(page, "/projects/e2e-demo/requirements/REQ-E2E02");
  await page.getByRole("button", { name: "Drop" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("button", { name: "Drop" })).toBeDisabled();
  await dialog.getByRole("textbox").fill("Out of this round.");
  await dialog.getByRole("button", { name: "Drop" }).click();
  await expect(page.getByText("Dropped", { exact: true }).first()).toBeVisible();
});

test("an incident is reported and triaged with cause and billing", async ({ page }) => {
  await signIn(page);
  await open(page, "/projects/e2e-demo/bugs");
  await page.getByRole("button", { name: "Report incident" }).first().click();
  const report = page.getByRole("dialog");
  await report.getByRole("textbox").first().fill("The discount is missing on the PDF.");
  await report.getByRole("button", { name: "Save" }).click();
  await expect(report).toBeHidden();
  await expect(page.getByText("The discount is missing on the PDF.")).toBeVisible();
  await page.getByRole("button", { name: "Triage" }).click();
  const triage = page.getByRole("dialog");
  await triage.getByLabel("Is it a defect?").selectOption("improvement");
  await triage.getByLabel("Billing").selectOption("quote");
  await triage.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Improvement").first()).toBeVisible();
  await expect(page.getByText("Quote", { exact: true }).first()).toBeVisible();
});

test("uploading a file turns it into a source with anchored passages", async ({ page }) => {
  await signIn(page);
  await open(page, "/projects/e2e-demo/sources");
  await page.getByRole("button", { name: "Upload source" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.locator('input[type="file"]').setInputFiles({ name: "checkout.md", mimeType: "text/markdown", buffer: Buffer.from("# Checkout\n\n## Payment\n\nThe checkout accepts PIX and card.\n") });
  await dialog.getByRole("button", { name: "Upload source" }).click();
  await expect(dialog).toHaveCount(0);
  await page.getByRole("link", { name: /checkout\.md/ }).click();
  await expect(page.getByText("The checkout accepts PIX and card.")).toBeVisible();
  await expect(page.getByText("@checkout.md#payment").first()).toBeVisible();
});

test("decisions wait in groups, and 'I decided this' confirms one as the person's own", async ({ page }) => {
  await signIn(page);
  await open(page, "/projects/shop-demo/requirements/decisions");
  await expect(page.getByRole("heading", { name: /The agent decided on its own/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /The agent assumed/ })).toBeVisible();
  const card = page.locator("li#DEC-CPN01");
  await card.getByRole("button", { name: "I decided this" }).click();
  await expect(card).toHaveCount(0);
  await page.getByRole("tab", { name: /Confirmed/ }).click();
  const row = page.locator("li#DEC-CPN01");
  await expect(row).toBeVisible();
  await expect(row.getByText("Your decision")).toBeVisible();
});
