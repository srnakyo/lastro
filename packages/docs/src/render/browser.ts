import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { Browser, Page } from "playwright";

const require = createRequire(import.meta.url);

export interface Rendered {
  /** The HTML with every Mermaid block already drawn as SVG: it opens anywhere, offline. */
  html: string;
  pdf: Uint8Array | null;
}

const MERMAID_BLOCK = /<pre class="mermaid">([\s\S]*?)<\/pre>/g;
const unescape = (s: string) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&amp;/g, "&");

async function launch(): Promise<Browser | null> {
  try {
    const { chromium } = await import("playwright");
    return await chromium.launch({ timeout: 30_000 });
  } catch {
    return null;
  }
}

/**
 * Opens a local page that loads Mermaid from disk. Chromium reads the file itself, so the 3 MB script
 * never travels through the automation pipe (which stalls under Bun on the second transfer).
 */
async function openMermaidPage(page: Page) {
  const dir = mkdtempSync(join(tmpdir(), "lastro-docs-"));
  const file = join(dir, "draw.html");
  const mermaid = process.env.LASTRO_MERMAID_JS || require.resolve("mermaid/dist/mermaid.min.js");
  writeFileSync(file, `<!doctype html><html><body><script src="${pathToFileURL(mermaid).href}"></script></body></html>`);
  try {
    await page.goto(pathToFileURL(file).href, { waitUntil: "load" });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** Draws every Mermaid source to SVG in one page, loading Mermaid once. */
async function drawAll(page: Page, sources: string[]): Promise<string[]> {
  if (sources.length === 0) return [];
  await openMermaidPage(page);
  return page.evaluate(async (list) => {
    const m = (globalThis as unknown as { mermaid: { initialize: (c: object) => void; render: (id: string, s: string) => Promise<{ svg: string }> } }).mermaid;
    m.initialize({ startOnLoad: false, securityLevel: "strict", theme: "default", fontFamily: "Inter, ui-sans-serif, system-ui" });
    const out: string[] = [];
    for (const [i, source] of list.entries()) {
      try {
        out.push((await m.render(`d${i}`, source)).svg);
      } catch (e) {
        out.push(`<p>diagram error: ${String(e).replace(/</g, "&lt;")}</p>`);
      }
    }
    return out;
  }, sources);
}

function inline(htmls: string[], svgs: string[]): string[] {
  let next = 0;
  return htmls.map((html) => html.replace(MERMAID_BLOCK, () => `<div class="mermaid">${svgs[next++] ?? ""}</div>`));
}

/**
 * Draws the Mermaid diagrams of every document as inline SVG and prints each one to PDF, in one
 * headless Chromium. Without a browser (`bunx playwright install chromium`), the HTML keeps the
 * Mermaid source and there is no PDF.
 */
export async function renderInBrowser(htmls: string[], options: { pdf: boolean }): Promise<Rendered[]> {
  const browser = await launch();
  if (!browser) return htmls.map((html) => ({ html, pdf: null }));
  try {
    const page = await browser.newPage();
    const sources = htmls.flatMap((html) => [...html.matchAll(MERMAID_BLOCK)].map((m) => unescape(m[1] ?? "")));
    const drawn = inline(htmls, await drawAll(page, sources));
    const out: Rendered[] = [];
    for (const html of drawn) {
      if (!options.pdf) {
        out.push({ html, pdf: null });
        continue;
      }
      await page.setContent(html, { waitUntil: "load" });
      out.push({ html, pdf: new Uint8Array(await page.pdf({ format: "A4", printBackground: true, margin: { top: "18mm", bottom: "18mm", left: "16mm", right: "16mm" } })) });
    }
    return out;
  } finally {
    await browser.close();
  }
}
