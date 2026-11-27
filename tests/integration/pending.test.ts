import { beforeEach, describe, expect, it } from "bun:test";
import { lifecycleService, packagesService, pendingList, questionsService, requirementsService, runsService, sourcesService } from "@lastro/core";
import { database } from "@lastro/database";
import { projectConfigSchema, type RunReportInput } from "@lastro/shared";
import { resetDatabase } from "../helpers/db";
import { agent, createBriefSource, createProject, discountRequirement } from "../helpers/fixtures";

beforeEach(resetDatabase);

async function projectWithSource() {
  const ctx = await createProject();
  const source = await createBriefSource(ctx.project.id, ctx.actor);
  return { ...ctx, source };
}

describe("pending list (REQ-7V6KE)", () => {
  it("names the missing fields of a captured requirement", async () => {
    const { project, actor, source } = await projectWithSource();
    const input = discountRequirement(source.code);
    const req = await requirementsService.create(project.id, actor, { ...input, dataSource: undefined });
    const [item] = await pendingList(project.id);
    expect(item).toMatchObject({ code: req.code, reason: "missing_fields", details: ["data_source"] });
  });

  it("says where a quote was not found in its source", async () => {
    const { project, actor, source } = await projectWithSource();
    const input = discountRequirement(source.code);
    const citations = input.citations.map((c) => ({ ...c, quote: "text that the brief never had" }));
    await requirementsService.create(project.id, actor, { ...input, citations });
    const [item] = await pendingList(project.id);
    expect(item?.reason).toBe("missing_fields");
    expect(item?.details[0]).toStartWith("quote not found at");
  });

  it("puts a requirement with a blocking open question under open_question, with the question code", async () => {
    const { project, actor, source } = await projectWithSource();
    const req = await requirementsService.create(project.id, actor, discountRequirement(source.code));
    const q = await questionsService.ask(project.id, agent, { text: "Does it show on the e-mail?", blocks: true, askedTo: "client", requirements: [req.code] });
    const [item] = await pendingList(project.id);
    expect(item).toMatchObject({ reason: "open_question", details: [q.code] });
  });

  it("puts a specified requirement under awaiting_approval, naming what holds the approval", async () => {
    const { project, actor, source } = await projectWithSource();
    await sourcesService.markFinal(project.id, actor, source.code);
    const noTests = { ...discountRequirement(source.code), criteria: [{ code: "AC-1", text: "Given 60 seats, then 8%.", tests: [] }] };
    await requirementsService.create(project.id, actor, noTests);
    const [item] = await pendingList(project.id);
    expect(item).toMatchObject({ reason: "awaiting_approval", details: ["criterion_without_test AC-1"] });
  });

  it("keeps only the requirements of the asked package", async () => {
    const { project, actor, source } = await projectWithSource();
    const pkg = await packagesService.create(project.id, actor, { title: "Release" });
    const inPackage = await requirementsService.create(project.id, actor, { ...discountRequirement(source.code), package: pkg.code });
    await requirementsService.create(project.id, actor, { ...discountRequirement(source.code), title: "Another one" });
    const items = await pendingList(project.id, pkg.code);
    expect(items.map((i) => i.code)).toEqual([inPackage.code]);
  });

  it("calls an approved requirement that nobody started building", async () => {
    const { project, actor, source } = await projectWithSource();
    const req = await requirementsService.create(project.id, actor, discountRequirement(source.code));
    await sourcesService.markFinal(project.id, actor, source.code);
    await lifecycleService.approve(project.id, actor, req.code);
    const [item] = await pendingList(project.id);
    expect(item).toMatchObject({ status: "approved", reason: "building", details: [] });
  });

  it("calls a building requirement whose latest run failed gate_red", async () => {
    const { project, actor, source } = await projectWithSource();
    const config = projectConfigSchema.parse({ project: "billing", commands: { unit: { run: "bun test", report: { junit: "junit.xml" } } }, types: { calculation: { required: [], flow: ["unit"] } } });
    await database().project.update({ where: { id: project.id }, data: { config } });
    const req = await requirementsService.create(project.id, actor, discountRequirement(source.code));
    await lifecycleService.approve(project.id, actor, req.code);
    await lifecycleService.start(project.id, agent, req.code, "feat/x");
    const run: RunReportInput = {
      trigger: "agent", commit: "abc1234", branch: "feat/x", dirty: false, environment: {}, startedAt: new Date().toISOString(), durationMs: 5, trees: { [req.code]: "sha256:a" },
      stages: [{ requirement: req.code, stage: "unit", condition: null, command: "bun test", exitCode: 1, status: "failed", durationMs: 4, output: "", results: [], findings: [] }],
    };
    await runsService.record(project.id, agent, run);
    const [item] = await pendingList(project.id);
    expect(item).toMatchObject({ status: "building", reason: "gate_red" });
  });
});
