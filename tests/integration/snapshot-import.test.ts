import { beforeEach, describe, expect, it } from "bun:test";
import { decisionsService, exportSnapshot, glossaryService, incidentsService, questionsService, requirementsService, snapshotService } from "@lastro/core";
import { database } from "@lastro/database";
import { resetDatabase } from "../helpers/db";
import { agent, createBriefSource, createProject, discountRequirement } from "../helpers/fixtures";

beforeEach(resetDatabase);

async function withRecords() {
  const ctx = await createProject({ requireFinal: true });
  const source = await createBriefSource(ctx.project.id, ctx.actor);
  const req = await requirementsService.create(ctx.project.id, ctx.actor, discountRequirement(source.code));
  const second = await requirementsService.create(ctx.project.id, ctx.actor, { ...discountRequirement(source.code), title: "Second thing" });
  const keep = await decisionsService.record(ctx.project.id, agent, { kind: "decision", text: "Keep the PDF", decidedBy: "dev", requirements: [req.code] });
  const undo = await decisionsService.record(ctx.project.id, agent, { kind: "decision", text: "Drop the PDF", decidedBy: "dev" });
  const question = await questionsService.ask(ctx.project.id, agent, { text: "Which plan?", blocks: false, askedTo: "client" });
  const incident = await incidentsService.report(ctx.project.id, agent, { reported: "The discount is missing", requirement: req.code });
  const snapshot = await exportSnapshot(ctx.project.id);
  return { ...ctx, source, req, second, keep, undo, question, incident, snapshot };
}

describe("a person's import of human actions", () => {
  it("applies the design contract, an invariant, decision statuses, an answer, a drop and a triage, and lists them as applied", async () => {
    const c = await withRecords();
    const edited = {
      ...c.snapshot,
      design: { ...c.snapshot.design, components: { Button: "the shared button" } },
      glossary: { ...c.snapshot.glossary, invariants: [{ code: "INV-1", text: "Totals never go negative", testRefs: [] }] },
      decisions: c.snapshot.decisions.map((d) => ({ ...d, status: d.code === c.keep.code ? ("confirmed" as const) : ("overturned" as const) })),
      questions: c.snapshot.questions.map((q) => ({ ...q, answer: "The annual plan", answerSource: "chat" })),
      requirements: c.snapshot.requirements.map((r) => (r.code === c.second.code ? { ...r, status: "dropped" as const } : r)),
      incidents: c.snapshot.incidents.map((i) => ({ ...i, triage: "usage" as const, cause: "spec_gap" as const, billing: "fix" as const })),
    };
    const report = await snapshotService.import(c.project.id, c.actor, edited);
    expect(report.refused).toEqual([]);
    expect(report.applied.map((a) => a.kind).sort()).toEqual(["answer", "decision_confirm", "decision_overturn", "design", "drop", "invariant", "triage"]);
    const db = database();
    expect((await db.designContract.findUniqueOrThrow({ where: { projectId: c.project.id } })).components).toEqual({ Button: "the shared button" });
    expect((await db.decision.findUniqueOrThrow({ where: { projectId_code: { projectId: c.project.id, code: c.keep.code } } })).status).toBe("confirmed");
    expect((await db.decision.findUniqueOrThrow({ where: { projectId_code: { projectId: c.project.id, code: c.undo.code } } })).status).toBe("overturned");
    expect((await db.question.findUniqueOrThrow({ where: { projectId_code: { projectId: c.project.id, code: c.question.code } } })).answer).toBe("The annual plan");
    expect((await requirementsService.get(c.project.id, c.second.code)).status).toBe("dropped");
    expect((await db.incident.findUniqueOrThrow({ where: { projectId_code: { projectId: c.project.id, code: c.incident.code } } })).triage).toBe("usage");
  });

  it("returns an approval the lifecycle blocks as refused, with the reason", async () => {
    const c = await withRecords();
    const edited = { ...c.snapshot, requirements: c.snapshot.requirements.map((r) => (r.code === c.req.code ? { ...r, status: "approved" as const } : r)) };
    const report = await snapshotService.import(c.project.id, c.actor, edited);
    expect(report.refused).toEqual([expect.objectContaining({ kind: "approve", target: c.req.code, reason: expect.stringContaining("cannot be approved yet") })]);
  });
});

describe("importing records", () => {
  it("updates the text of an existing decision and the links to its requirements", async () => {
    const c = await withRecords();
    const edited = { ...c.snapshot, decisions: c.snapshot.decisions.map((d) => (d.code === c.keep.code ? { ...d, text: "Keep the PDF and the e-mail", requirements: [c.second.code] } : d)) };
    const report = await snapshotService.import(c.project.id, c.actor, edited);
    expect(report.plan.decisions).toEqual([{ code: c.keep.code, change: "updated" }]);
    const row = await database().decision.findUniqueOrThrow({ where: { projectId_code: { projectId: c.project.id, code: c.keep.code } }, include: { requirements: { include: { requirement: true } } } });
    expect([row.text, row.requirements.map((r) => r.requirement.code)]).toEqual(["Keep the PDF and the e-mail", [c.second.code]]);
  });

  it("updates the text of an existing question", async () => {
    const c = await withRecords();
    const edited = { ...c.snapshot, questions: c.snapshot.questions.map((q) => ({ ...q, text: "Which plan, monthly or annual?" })) };
    await snapshotService.import(c.project.id, c.actor, edited);
    const row = await database().question.findUniqueOrThrow({ where: { projectId_code: { projectId: c.project.id, code: c.question.code } } });
    expect(row.text).toBe("Which plan, monthly or annual?");
  });

  it("creates a new question keeping the date it was asked, and a new incident", async () => {
    const c = await withRecords();
    const askedAt = new Date("2026-01-05T10:00:00Z");
    const edited = {
      ...c.snapshot,
      questions: [...c.snapshot.questions, { code: "Q-AB234", text: "Round up?", blocks: false, askedTo: "client" as const, askedAt, answer: null, answerSource: null, requirements: [] }],
      incidents: [...c.snapshot.incidents, { code: "INC-AB234", reported: "Rounding is off" }],
    };
    await snapshotService.import(c.project.id, c.actor, edited);
    const question = await database().question.findUniqueOrThrow({ where: { projectId_code: { projectId: c.project.id, code: "Q-AB234" } } });
    expect(question.askedAt).toEqual(askedAt);
    expect(await database().incident.count({ where: { projectId: c.project.id, code: "INC-AB234" } })).toBe(1);
  });

  it("makes the decisions an agent imports proposed and by the agent, whatever the file says", async () => {
    const c = await withRecords();
    const edited = { ...c.snapshot, decisions: [...c.snapshot.decisions, { code: "DEC-AB234", kind: "decision" as const, text: "Round half up", decidedBy: "dev" as const, decidedByAgent: false, status: "confirmed" as const, showToClient: false, requirements: [] }] };
    await snapshotService.import(c.project.id, agent, edited);
    const row = await database().decision.findUniqueOrThrow({ where: { projectId_code: { projectId: c.project.id, code: "DEC-AB234" } } });
    expect([row.status, row.decidedByAgent]).toEqual(["proposed", true]);
  });
});

describe("importing as an agent", () => {
  it("previews the human actions as refused, without changing anything", async () => {
    const c = await withRecords();
    const edited = { ...c.snapshot, requirements: c.snapshot.requirements.map((r) => (r.code === c.second.code ? { ...r, status: "dropped" as const } : r)) };
    const preview = await snapshotService.import(c.project.id, agent, edited, { dryRun: true });
    expect(preview.refused).toEqual([expect.objectContaining({ kind: "drop", target: c.second.code, reason: "needs a person's token" })]);
    expect((await requirementsService.get(c.project.id, c.second.code)).status).not.toBe("dropped");
  });

  it("previews nothing as refused for a person", async () => {
    const c = await withRecords();
    const edited = { ...c.snapshot, requirements: c.snapshot.requirements.map((r) => (r.code === c.second.code ? { ...r, status: "dropped" as const } : r)) };
    const preview = await snapshotService.import(c.project.id, c.actor, edited, { dryRun: true });
    expect(preview.refused).toEqual([]);
    expect(preview.plan.human).toEqual([expect.objectContaining({ kind: "drop" })]);
  });
});

describe("exporting incidents", () => {
  it("writes the triage of an incident with its requirement code", async () => {
    const c = await withRecords();
    await incidentsService.triage(c.project.id, c.actor, c.incident.code, { triage: "bug", cause: "implementation", billing: "fix", regressionTest: "tests/pdf.test.ts::discount" });
    const snapshot = await exportSnapshot(c.project.id);
    expect(snapshot.incidents).toEqual([expect.objectContaining({ code: c.incident.code, requirement: c.req.code, triage: "bug", cause: "implementation", billing: "fix", regressionTest: "tests/pdf.test.ts::discount" })]);
  });

  it("an invariant added through the service shows in the export", async () => {
    const { project, actor } = await createProject();
    await glossaryService.upsertInvariant(project.id, actor, { code: "INV-1", text: "Totals never go negative", testRefs: [] });
    expect((await exportSnapshot(project.id)).glossary.invariants).toEqual([{ code: "INV-1", text: "Totals never go negative", testRefs: [] }]);
  });
});
