import { expect, test, type APIRequestContext } from "@playwright/test";
import { BASE_URL, signIn } from "./helpers";

test.skip(({ isMobile }) => isMobile, "runs once, on desktop");

/** What `lastro login` does in the terminal: asks for a login, then collects it with its secret. */
async function startLogin(request: APIRequestContext, host: string) {
  const res = await request.post(`${BASE_URL}/api/v1/cli/login`, { data: { host } });
  expect(res.ok()).toBe(true);
  return (await res.json()) as { id: string; code: string; secret: string };
}

const collect = async (request: APIRequestContext, login: { id: string; secret: string }) =>
  (await (await request.post(`${BASE_URL}/api/v1/cli/login/${login.id}`, { data: { secret: login.secret } })).json()) as { status: string; token?: string };

test("a person authorizes their terminal in the browser after comparing the code, and the terminal gets an agent token", async ({ page, request }) => {
  const login = await startLogin(request, "e2e-laptop");
  await signIn(page);
  await page.goto(`/cli/authorize/${login.id}`);
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("heading", { name: "Authorize the terminal" })).toBeVisible();
  await expect(page.getByText("e2e-laptop")).toBeVisible();
  await expect(page.getByLabel("Check that the terminal shows the same code")).toHaveText(login.code);
  await expect(page.getByText("Approving, unlocking and answering stay with you")).toBeVisible();
  await page.screenshot({ path: ".lastro/.out/screens/cli-authorize.png", fullPage: true });
  expect((await collect(request, login)).status).toBe("pending");

  await page.getByRole("button", { name: "Authorize" }).click();
  await expect(page.getByRole("heading", { name: "Terminal connected" })).toBeVisible();
  const done = await collect(request, login);
  expect(done.status).toBe("approved");
  expect(done.token).toMatch(/^lst_/);

  await page.getByRole("link", { name: "See the access tokens" }).click();
  await expect(page.getByRole("listitem").filter({ hasText: "CLI · e2e-laptop" }).first()).toContainText("every project");
});

test("refusing leaves the terminal without access", async ({ page, request }) => {
  const login = await startLogin(request, "unknown-box");
  await signIn(page);
  await page.goto(`/cli/authorize/${login.id}`);
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Refuse" }).click();
  await expect(page.getByRole("heading", { name: "Refused" })).toBeVisible();
  expect((await collect(request, login)).status).toBe("denied");
});

test("the workspace settings are one click from the projects page, with the tokens for every project and the members", async ({ page }) => {
  await signIn(page);
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.getByRole("link", { name: "Workspace settings" }).click();
  await expect(page).toHaveURL(/\/settings$/);
  await expect(page.getByRole("tab", { name: "Access tokens" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByText(`lastro login --url ${BASE_URL}`)).toBeVisible();
  await page.getByRole("tab", { name: "Members" }).click();
  await expect(page.getByRole("tab", { name: "Members" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByText("dev@lastro.local")).toBeVisible();
  await page.waitForTimeout(300); // the tab colors fade for 150 ms
  await page.screenshot({ path: ".lastro/.out/screens/workspace-settings.png", fullPage: true });
});
