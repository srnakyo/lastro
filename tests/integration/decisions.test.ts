import { beforeEach, describe, expect, it } from "bun:test";
import { decisionsService, incidentsService, packagesService, questionsService, requirementsService } from "@lastro/core";
import { database } from "@lastro/database";
import { resetDatabase } from "../helpers/db";
import { agent, createBriefSource, createProject, discountRequirement } from "../helpers/fixtures";

beforeEach(resetDatabase);

async function withRequirement() {
  const ctx = await createProject();
  const source = await createBriefSource(ctx.project.id, ctx.actor);
  const req = await requirementsService.create(ctx.project.id, ctx.actor, discountRequirement(source.code));
  return { ...ctx, code: req.code };
}

const setStatus = (code: string, status: "verified" | "delivered") => database().requirement.updateMany({ where: { code }, data: { status } });

describe("questions", () => {
  it("a blocking question holds its requirement back until a person records the answer", async () => {
    const { project, actor, code } = await withRequirement();
    const q = await questionsService.ask(project.id, agent, { text: "Does the discount show on the e-mail?", blocks: true, askedTo: "client", requirements: [code] });
    expect((await requirementsService.get(project.id, code)).status).toBe("captured");
    await expect(questionsService.answer(project.id, agent, q.code, { answer: "yes" })).rejects.toThrow("needs a person");
    const decision = await questionsService.answer(project.id, actor, q.code, { answer: "Yes, same as the PDF", answerSource: "SRC-AAAAA @msg:1" });
    expect(decision.kind).toBe("client_answer");
    expect((await requirementsService.get(project.id, code)).status).toBe("specified");
  });
});

describe("decisions", () => {
  it("an agent writes down the person's decision only with where they said it, and it waits for them as theirs", async () => {
    const { project, code } = await withRequirement();
    await expect(decisionsService.record(project.id, agent, { kind: "decision", text: "Postgres is the source of truth", decidedBy: "dev", madeBy: "person", requirements: [code] })).rejects.toThrow("sourceRef");
    const d = await decisionsService.record(project.id, agent, { kind: "decision", text: "Postgres is the source of truth", decidedBy: "dev", madeBy: "person", sourceRef: "chat 2026-11-25", requirements: [code] });
    expect(d.decidedByAgent).toBe(false);
    expect(d.status).toBe("proposed");
    expect(d.sourceRef).toBe("chat 2026-11-25");
  });

  it("a person confirms many decisions at once, and can claim the agent's ones as their own", async () => {
    const { project, actor } = await withRequirement();
    const a = await decisionsService.record(project.id, agent, { kind: "decision", text: "TypeScript 6", decidedBy: "dev" });
    const b = await decisionsService.record(project.id, agent, { kind: "decision", text: "MIT license", decidedBy: "dev" });
    await expect(decisionsService.confirm(project.id, agent, [a.code, b.code])).rejects.toThrow("needs a person");
    await decisionsService.confirm(project.id, actor, [a.code, b.code], { mine: true });
    const rows = await database().decision.findMany({ where: { projectId: project.id }, orderBy: { code: "asc" } });
    expect(rows.map((r) => [r.status, r.decidedByAgent])).toEqual([["confirmed", false], ["confirmed", false]]);
  });

  it("merging a repeat moves its requirements and answers to the original and reopens nothing", async () => {
    const { project, actor, code } = await withRequirement();
    const original = await decisionsService.record(project.id, actor, { kind: "client_answer", text: "MIT", decidedBy: "client" });
    const repeat = await decisionsService.record(project.id, agent, { kind: "decision", text: "Lastro is licensed under MIT.", decidedBy: "dev", requirements: [code] });
    await setStatus(code, "verified");
    await expect(decisionsService.merge(project.id, agent, repeat.code, original.code)).rejects.toThrow("needs a person");
    await decisionsService.merge(project.id, actor, repeat.code, original.code);
    expect(await database().decision.findUnique({ where: { id: repeat.id } })).toBeNull();
    const links = await database().decisionRequirement.findMany({ where: { decisionId: original.id } });
    expect(links).toHaveLength(1);
    expect((await requirementsService.get(project.id, code)).status).toBe("verified");
  });

  it("records agent assumptions as proposed and reopens what was built on an overturned one", async () => {
    const { project, actor, code } = await withRequirement();
    const d = await decisionsService.record(project.id, agent, { kind: "assumption", text: "M-2 means M-1 or M-2", decidedBy: "dev", requirements: [code] });
    expect(d.status).toBe("proposed");
    expect(d.decidedByAgent).toBe(true);
    await setStatus(code, "verified");
    await expect(decisionsService.overturn(project.id, agent, d.code, "wrong")).rejects.toThrow("needs a person");
    await decisionsService.overturn(project.id, actor, d.code, "client said M-2 only");
    const view = await requirementsService.get(project.id, code);
    expect(view.status).toBe("building");
    expect(view.blockers.map((b) => b.kind)).toContain("decision_overturned");
    expect(view.history.at(-1)?.reason).toBe("decision overturned");
  });
});

describe("incidents", () => {
  it("reopens a delivered requirement and asks for a regression test when it is a bug", async () => {
    const { project, actor, code } = await withRequirement();
    await setStatus(code, "delivered");
    const incident = await incidentsService.report(project.id, agent, { reported: "Why is the discount missing on the PDF?", requirement: code });
    expect((await requirementsService.get(project.id, code)).status).toBe("reopened");
    await expect(incidentsService.triage(project.id, actor, incident.code, { triage: "bug", cause: "implementation", billing: "fix" })).rejects.toThrow("regression test");
    await incidentsService.triage(project.id, actor, incident.code, { triage: "bug", cause: "implementation", billing: "fix", regressionTest: "e2e/pdf.spec.ts::discount" });
    expect((await incidentsService.list(project.id))[0]?.cause).toBe("implementation");
  });
});

describe("packages", () => {
  it("does not close while something in it is pending", async () => {
    const { project, actor } = await withRequirement();
    const pkg = await packagesService.create(project.id, actor, { title: "Fixes v.4" });
    const source = await database().source.findFirstOrThrow();
    await requirementsService.create(project.id, actor, { ...discountRequirement(source.code), package: pkg.code });
    await expect(packagesService.close(project.id, actor, pkg.code)).rejects.toThrow("still has pending");
  });
});

describe("answers and overturned decisions (REQ-5R2HC, REQ-6T3JD)", () => {
  it("records an answer with its source as a client_answer decision and closes the question", async () => {
    const { project, actor } = await createProject();
    const question = await questionsService.ask(project.id, actor, { text: "Annual plan too?", askedTo: "client" });
    const decision = await questionsService.answer(project.id, actor, question.code, { answer: "Yes, annual too.", answerSource: "WhatsApp 2026-11-20 14:02" });
    expect(decision).toMatchObject({ kind: "client_answer", sourceRef: "WhatsApp 2026-11-20 14:02" });
    const closed = await database().question.findUniqueOrThrow({ where: { projectId_code: { projectId: project.id, code: question.code } } });
    expect(closed.answer).toBe("Yes, annual too.");
  });
});

describe("listing", () => {
  it("lists the questions of a project oldest first with the codes of their requirements", async () => {
    const { project, code } = await withRequirement();
    const first = await questionsService.ask(project.id, agent, { text: "First?", blocks: false, askedTo: "client", requirements: [code] });
    const second = await questionsService.ask(project.id, agent, { text: "Second?", blocks: false, askedTo: "client" });
    const rows = await questionsService.list(project.id);
    expect(rows.map((q) => q.code)).toEqual([first.code, second.code]);
    expect(rows[0]?.requirements.map((r) => r.requirement.code)).toEqual([code]);
  });

  it("lists the decisions of a project oldest first with the requirements they touch", async () => {
    const { project, actor, code } = await withRequirement();
    const a = await decisionsService.record(project.id, actor, { kind: "decision", text: "First", decidedBy: "dev", requirements: [code] });
    const b = await decisionsService.record(project.id, actor, { kind: "decision", text: "Second", decidedBy: "dev" });
    const rows = await decisionsService.list(project.id);
    expect(rows.map((d) => d.code)).toEqual([a.code, b.code]);
    expect(rows[0]?.requirements.map((r) => r.requirement.code)).toEqual([code]);
  });

  it("overturning a decision of an accepted requirement reopens it", async () => {
    const { project, actor, code } = await withRequirement();
    const d = await decisionsService.record(project.id, actor, { kind: "decision", text: "M-2 only", decidedBy: "dev", requirements: [code] });
    await database().requirement.updateMany({ where: { code }, data: { status: "accepted" } });
    await decisionsService.overturn(project.id, actor, d.code, "client changed their mind");
    expect((await requirementsService.get(project.id, code)).status).toBe("reopened");
  });

  it("merging a repeat that points at a requirement the original already has does not link it twice", async () => {
    const { project, actor, code } = await withRequirement();
    const original = await decisionsService.record(project.id, actor, { kind: "decision", text: "MIT", decidedBy: "dev", requirements: [code] });
    const repeat = await decisionsService.record(project.id, actor, { kind: "decision", text: "Lastro is MIT.", decidedBy: "dev", requirements: [code] });
    await decisionsService.merge(project.id, actor, repeat.code, original.code);
    expect(await database().decisionRequirement.count({ where: { decisionId: original.id } })).toBe(1);
  });
});
