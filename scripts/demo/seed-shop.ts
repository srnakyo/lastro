import { decisionsService, glossaryService, incidentsService, lifecycleService, markdownPassages, projectsService, questionsService, requirementsService, runsService, sourcesService } from "@lastro/core";
import { database } from "@lastro/database";
import { projectConfigSchema, type Actor } from "@lastro/shared";
import { seedAgentSessions } from "./agents";
import { SHOP_BRIEF, SHOP_CONFIG } from "./brief";
import { shopRequirements } from "./requirements";
import { SHOP_RUNS, shopReport } from "./runs";

const AGENT: Actor = { type: "agent", id: "claude-code" };

async function freshProject(workspaceId: string, actor: Actor) {
  const old = await database().project.findFirst({ where: { workspaceId, key: "shop-demo" } });
  if (old) {
    await database().requirement.deleteMany({ where: { projectId: old.id } });
    await database().project.delete({ where: { id: old.id } });
  }
  return projectsService.create(workspaceId, actor, {
    key: "shop-demo", name: "Shop demo", description: "A fictional store: requirements, runs and gates to explore the dashboard.",
    config: projectConfigSchema.parse(SHOP_CONFIG),
  });
}

async function spec(projectId: string, actor: Actor) {
  const passages = markdownPassages([{ name: "brief.md", content: SHOP_BRIEF }]).map((p) => ({ anchor: p.anchor, text: p.text, heading: p.heading ?? undefined }));
  const source = await sourcesService.create(projectId, actor, { kind: "text", title: "brief.md", from: "client", hash: "sha256:shop-brief-v1", final: false, machineTranscript: false, passages });
  for (const input of shopRequirements(source.code)) await requirementsService.create(projectId, AGENT, input);
  await sourcesService.markFinal(projectId, actor, source.code);
  await questionsService.ask(projectId, AGENT, { code: "Q-HST01", text: "Should cancelled orders show in the history?", askedTo: "client", blocks: true, requirements: ["REQ-HST01"] });
  await decisionsService.record(projectId, AGENT, { code: "DEC-SHP01", kind: "assumption", text: "\"Above R$ 300\" is the subtotal after the coupon, before shipping.", reason: "The brief does not say; this keeps the coupon and the threshold consistent.", decidedBy: "dev", requirements: ["REQ-SHP01"] });
  await decisionsService.record(projectId, AGENT, { code: "DEC-CPN01", kind: "decision", text: "Coupons apply before the free-shipping check.", decidedBy: "team", requirements: ["REQ-CPN01", "REQ-SHP01"] });
}

async function build(projectId: string, actor: Actor) {
  for (const code of ["REQ-CRT01", "REQ-SHP01", "REQ-PAY01", "REQ-CPN01", "REQ-STK01", "REQ-DRK01"]) await lifecycleService.approve(projectId, actor, code);
  for (const code of ["REQ-CRT01", "REQ-SHP01", "REQ-PAY01", "REQ-CPN01", "REQ-STK01"]) await lifecycleService.start(projectId, AGENT, code, "feat/checkout");
  // The history happened over days: date the state changes so far before the first run.
  await database().stateEvent.updateMany({ where: { projectId }, data: { createdAt: new Date(Date.now() - 150 * 3_600_000) } });
  for (const run of SHOP_RUNS) {
    const before = new Date();
    const report = shopReport(run);
    await runsService.record(projectId, AGENT, report);
    await database().stateEvent.updateMany({ where: { projectId, createdAt: { gte: before } }, data: { createdAt: new Date(String(report.startedAt)) } });
  }
  const incident = await incidentsService.report(projectId, actor, { reported: "Customer says the free shipping did not apply to an order of R$ 305 to Porto Alegre.", sourceRef: "support ticket #4127", requirement: "REQ-SHP01" });
  await incidentsService.triage(projectId, actor, incident.code, { triage: "bug", cause: "implementation", billing: "fix", regressionTest: "tests/shipping.test.ts::free above 300 in the south" });
  await incidentsService.report(projectId, actor, { reported: "The coupon field is hard to find on the phone.", sourceRef: "client call 2026-11-20" });
}

/** Recreates the shop-demo project with a full history. */
export async function seedShop(workspaceId: string, actor: Actor) {
  const project = await freshProject(workspaceId, actor);
  await spec(project.id, actor);
  await build(project.id, actor);
  await seedAgentSessions(project.id);
  await glossaryService.upsertTerm(project.id, actor, { term: "Southeast", means: "SP, RJ, MG and ES, by the ZIP code of the delivery address" });
  await glossaryService.upsertTerm(project.id, actor, { term: "Subtotal", means: "Items after the coupon, before shipping" });
  await glossaryService.upsertInvariant(project.id, actor, { code: "INV-1", text: "An order total is never below its shipping cost.", testRefs: ["tests/coupon.test.ts::floors the total at shipping"] });
  await glossaryService.setDesignContract(project.id, actor, { forbidden: ["Native alert or confirm dialogs", "Prices without the R$ prefix"], components: { Dialog: "every confirmation" }, palette: { primary: "#1d63d8", danger: "#e11d48" } });
  return project;
}
