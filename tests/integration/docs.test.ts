import { beforeEach, describe, expect, it } from "bun:test";
import { docBuildsService } from "@lastro/core";
import { storeFromEnv } from "@lastro/storage";
import { buildDocs } from "../../apps/web/src/server/docs";
import { seedShop } from "../../scripts/demo/seed-shop";
import { resetDatabase } from "../helpers/db";
import { createProject } from "../helpers/fixtures";

beforeEach(resetDatabase);

const text = (bytes: Uint8Array) => new TextDecoder().decode(bytes);

describe("documentation", () => {
  it("builds every document in Markdown, HTML with drawn diagrams and PDF, and keeps the latest build", async () => {
    const { workspace, actor } = await createProject();
    const shop = await seedShop(workspace.id, actor);
    const result = await buildDocs(shop.id, actor);
    expect(result).toEqual({ documents: 10, pdf: true });
    const latest = await docBuildsService.latest(shop.id);
    expect(latest).toHaveLength(30);

    const store = storeFromEnv();
    const report = text((await docBuildsService.read(shop.id, "client-report", "md", store)).bytes);
    expect(report).toContain("> The checkout accepts PIX and card, and shows the total before confirming.");
    const cases = text((await docBuildsService.read(shop.id, "test-cases", "md", store)).bytes);
    expect(cases).toContain("tests/coupon.test.ts::floors the total at shipping");
    const diagrams = text((await docBuildsService.read(shop.id, "diagrams", "html", store)).bytes);
    expect(diagrams).toContain("<svg");
    const pdf = (await docBuildsService.read(shop.id, "quality-report", "pdf", store)).bytes;
    expect(text(pdf.slice(0, 5))).toBe("%PDF-");
  }, 120_000);

  it("writes in the project's language", async () => {
    const { workspace, actor } = await createProject();
    const shop = await seedShop(workspace.id, actor);
    await buildDocs(shop.id, actor, { lang: "pt-BR", only: ["test-plan"], pdf: false });
    const plan = text((await docBuildsService.read(shop.id, "test-plan", "md", storeFromEnv())).bytes);
    expect(plan).toContain("# Plano de testes: Shop demo");
  }, 60_000);
});
