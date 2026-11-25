import { decisionsService, incidentsService, lifecycleService, markdownPassages, projectsService, questionsService, requirementsService, runsService, sourcesService } from "@lastro/core";
import { database } from "@lastro/database";
import { projectConfigSchema, type Actor } from "@lastro/shared";
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
  for (const run of SHOP_RUNS) await runsService.record(projectId, AGENT, shopReport(run));
  const incident = await incidentsService.report(projectId, actor, { reported: "Customer says the free shipping did not apply to an order of R$ 305 to Porto Alegre.", sourceRef: "support ticket #4127", requirement: "REQ-SHP01" });
  await incidentsService.triage(projectId, actor, incident.code, { triage: "bug", cause: "implementation", billing: "fix", regressionTest: "tests/shipping.test.ts::free above 300 in the south" });
  await incidentsService.report(projectId, actor, { reported: "The coupon field is hard to find on the phone.", sourceRef: "client call 2026-11-20" });
}

/** Recreates the shop-demo project with a full history. */
export async function seedShop(workspaceId: string, actor: Actor) {
  const project = await freshProject(workspaceId, actor);
  await spec(project.id, actor);
  await build(project.id, actor);
  return project;
}
