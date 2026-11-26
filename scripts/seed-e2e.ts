/**
 * Recreates, in the dev workspace: "e2e-demo" (review mode, a known source, requirements and a question),
 * "e2e-auto" (automatic mode, a requirement still missing its end-to-end test) and "shop-demo" (with runs).
 */
import { markdownPassages, projectsService, questionsService, requirementsService, sourcesService, workspacesService } from "@lastro/core";
import { database } from "@lastro/database";
import { projectConfigSchema } from "@lastro/shared";
import { seedShop } from "./demo/seed-shop";

const BRIEF = `# Invoices\n\n## Volume discount\n\nThe volume discount has to show on the invoice, including the **annual plan**.\n\nAbove 50 seats the discount is 8%.\n`;

const user = await database().user.findUniqueOrThrow({ where: { email: "dev@lastro.local" } });
const actor = { type: "user" as const, id: user.id };
const workspace = (await workspacesService.listForUser(user.id)).find((w) => w.slug === "lastro-dev");
if (!workspace) throw new Error("run bun scripts/seed-dev.ts first");
// Citations protect their sources from deletion, so requirements go first.
await database().requirement.deleteMany({ where: { project: { workspaceId: workspace.id, key: "e2e-demo" } } });
await database().project.deleteMany({ where: { workspaceId: workspace.id, key: "e2e-demo" } });
const project = await projectsService.create(workspace.id, actor, {
  key: "e2e-demo",
  name: "E2E demo",
  config: projectConfigSchema.parse({ project: "e2e-demo", autonomy: "review", approval: { require_final_source: true }, types: { calculation: { required: ["data_source"] } } }),
});
const source = await sourcesService.create(project.id, actor, {
  kind: "text", title: "brief.md", from: "client", hash: "sha256:e2e-brief", final: false, machineTranscript: false,
  passages: markdownPassages([{ name: "brief.md", content: BRIEF }]).map((p) => ({ anchor: p.anchor, text: p.text, heading: p.heading ?? undefined })),
});
const base = {
  type: "calculation", statement: "The invoice shows the volume discount line.", dataSource: "discount table",
  citations: [{ source: source.code, anchor: "@brief.md#volume-discount", quote: "The volume discount has to show on the invoice, including the annual plan." }],
  criteria: [{ code: "AC-1", text: "Given 60 seats, then the invoice shows an 8% discount line.", tests: ["tests/unit/invoice.test.ts::shows the 8% line for 60 seats"] }],
};
await requirementsService.create(project.id, actor, { ...base, code: "REQ-E2E01", title: "Volume discount on the invoice" });
await requirementsService.create(project.id, actor, { ...base, code: "REQ-E2E02", title: "Discount on the annual plan" });
await questionsService.ask(project.id, actor, { code: "Q-E2E01", text: "Does the discount show on the billing e-mail?", blocks: true, askedTo: "client", requirements: ["REQ-E2E02"] });
await seedAuto();
await seedShop(workspace.id, actor);
console.log(`e2e projects ready: ${source.code}, shop-demo`);
process.exit(0);

/** An automatic project whose only requirement has a unit test but still needs the end-to-end one its type asks for. */
async function seedAuto() {
  if (!workspace) return;
  await database().requirement.deleteMany({ where: { project: { workspaceId: workspace.id, key: "e2e-auto" } } });
  await database().project.deleteMany({ where: { workspaceId: workspace.id, key: "e2e-auto" } });
  const auto = await projectsService.create(workspace.id, actor, {
    key: "e2e-auto",
    name: "E2E automatic",
    config: projectConfigSchema.parse({ project: "e2e-auto", autonomy: "auto", types: { calculation: { required: ["data_source"], tests: { levels: ["unit", "e2e"] } } } }),
  });
  const brief = await sourcesService.create(auto.id, actor, {
    kind: "text", title: "brief.md", from: "client", hash: "sha256:e2e-auto-brief", final: false, machineTranscript: false,
    passages: markdownPassages([{ name: "brief.md", content: BRIEF }]).map((p) => ({ anchor: p.anchor, text: p.text, heading: p.heading ?? undefined })),
  });
  await requirementsService.create(auto.id, actor, {
    code: "REQ-AT001", title: "Volume discount on the invoice", type: "calculation", statement: "The invoice shows the volume discount line.", dataSource: "discount table",
    citations: [{ source: brief.code, anchor: "@brief.md#volume-discount", quote: "The volume discount has to show on the invoice, including the annual plan." }],
    criteria: [{ code: "AC-1", text: "Given 60 seats, then the invoice shows an 8% discount line.", tests: ["tests/unit/invoice.test.ts::shows the 8% line for 60 seats"] }],
  });
}
