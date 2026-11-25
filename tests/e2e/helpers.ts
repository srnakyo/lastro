import { expect, type Page } from "@playwright/test";

export const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:4317";

export const DEV_USER = { email: "dev@lastro.local", password: "lastro-dev-password" };

/** The theme of the condition under test (lastro.yml: light-theme, dark-theme set E2E_THEME). */
const THEME = process.env.E2E_THEME === "light" || process.env.E2E_THEME === "dark" ? process.env.E2E_THEME : null;

export async function signIn(page: Page, lang: "en" | "pt-BR" = "en") {
  await page.context().addCookies([{ name: "lastro_lang", value: lang, url: BASE_URL }, ...(THEME ? [{ name: "lastro_theme", value: THEME, url: BASE_URL }] : [])]);
  await page.goto("/sign-in");
  await page.waitForLoadState("networkidle");
  await page.fill("#email", DEV_USER.email);
  await page.fill("#password", DEV_USER.password);
  await page.click("button[type=submit]");
  await expect(page).toHaveURL(/\/$/);
}
