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
