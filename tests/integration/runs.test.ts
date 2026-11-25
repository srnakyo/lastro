import { beforeEach, describe, expect, it } from "bun:test";
import { criteriaService, glossaryService, incidentsService, lifecycleService, requirementsService, runsService, sourcesService, testCatalog } from "@lastro/core";
import { database } from "@lastro/database";
import { projectConfigSchema, type RunReportInput } from "@lastro/shared";
import { resetDatabase } from "../helpers/db";
import { agent, createBriefSource, createProject, discountRequirement } from "../helpers/fixtures";

beforeEach(resetDatabase);

const TEST_REF = "tests/discount.test.ts::60 seats";

async function building(flow: unknown[] = ["unit"]) {
  const ctx = await createProject();
  const config = projectConfigSchema.parse({
    project: "billing",
    commands: { unit: { run: "bun test", report: { junit: "junit.xml" } } },
    types: { calculation: { required: [], flow } },
  });
  await database().project.update({ where: { id: ctx.project.id }, data: { config } });
  const source = await createBriefSource(ctx.project.id, ctx.actor, true);
  const input = discountRequirement(source.code);
  const req = await requirementsService.create(ctx.project.id, ctx.actor, { ...input, criteria: [{ code: "AC-1", text: input.criteria[0]?.text ?? "", tests: [TEST_REF] }] });
  await sourcesService.markFinal(ctx.project.id, ctx.actor, source.code).catch(() => undefined);
  await lifecycleService.approve(ctx.project.id, ctx.actor, req.code);
  await lifecycleService.start(ctx.project.id, agent, req.code, "feat/discount");
  return { ...ctx, code: req.code };
}

const report = (code: string, status: "passed" | "failed", tree = "sha256:a"): RunReportInput => ({
  trigger: "agent",
  commit: "abc1234",
  branch: "feat/discount",
  dirty: false,
  environment: { node: "v22" },
  startedAt: new Date().toISOString(),
  durationMs: 1200,
  trees: { [code]: tree },
  stages: [
    {
      requirement: code, stage: "unit", condition: null, command: "bun test", exitCode: status === "passed" ? 0 : 1, status, durationMs: 1100, output: "",
      results: [{ ref: TEST_REF, file: "tests/discount.test.ts", name: "60 seats", status, durationMs: 12, message: status === "failed" ? "expected 8%" : null }],
      findings: [],
    },
  ],
});

describe("runs and the gate", () => {
  it("moves building to verified only on a run where every stage and linked test passed", async () => {
    const { project, code } = await building();
    const failed = await runsService.record(project.id, agent, report(code, "failed"));
    expect(failed.gates[code]?.pass).toBe(false);
    expect(failed.gates[code]?.agentCanFix.join(" ")).toContain("unit failed");
    expect((await requirementsService.get(project.id, code)).status).toBe("building");

    const passed = await runsService.record(project.id, agent, report(code, "passed"));
    expect(passed.gates[code]?.pass).toBe(true);
    expect((await requirementsService.get(project.id, code)).status).toBe("verified");
  });

  it("sends verified back to building when the touched files change (stale evidence)", async () => {
    const { project, code } = await building();
    await runsService.record(project.id, agent, report(code, "passed", "sha256:a"));
    expect((await runsService.gate(project.id, { [code]: "sha256:a" })).pass).toBe(true);
    const stale = await runsService.gate(project.id, { [code]: "sha256:b" });
    expect(stale.pass).toBe(false);
    expect((await requirementsService.get(project.id, code)).status).toBe("building");
  });

  it("holds a manual stage until a person signs it, and refuses an agent's signature", async () => {
    const { project, actor, code } = await building(["unit", { check: "preview", manual: true, by: "client" }]);
    const run = await runsService.record(project.id, agent, report(code, "passed"));
    expect(run.gates[code]?.needsPerson).toEqual(["manual stage preview not signed"]);
    await expect(runsService.signManual(project.id, agent, code, { stage: "preview", status: "passed", reference: "msg 42" })).rejects.toThrow("needs a person");
    const signed = await runsService.signManual(project.id, actor, code, { stage: "preview", status: "passed", reference: "msg 42" });
    expect(signed.pass).toBe(true);
    expect((await requirementsService.get(project.id, code)).status).toBe("verified");
  });

  it("builds the test catalog with flaky and orphan tests and compares a run with the previous one", async () => {
    const { project, code } = await building();
    const first = await runsService.record(project.id, agent, report(code, "failed"));
    const extra = report(code, "passed");
    extra.stages[0]?.results.push({ ref: "tests/other.test.ts::x", file: "tests/other.test.ts", name: "x", status: "passed", durationMs: 1, message: null });
    const second = await runsService.record(project.id, agent, extra);
    const catalog = await testCatalog(project.id);
    // Failed then passed with the same fingerprint of the bound files: nothing changed, so it is flaky.
    expect(catalog.find((t) => t.ref === TEST_REF)).toMatchObject({ flaky: true, orphan: false, last: "passed" });
    expect(catalog.find((t) => t.ref === "tests/other.test.ts::x")?.orphan).toBe(true);
    const detail = await runsService.get(project.id, second.runId);
    expect(detail.comparisons).toEqual([{ requirement: code, previousId: first.runId, previousCommit: "abc1234", newlyFailing: [], newlyPassing: [TEST_REF] }]);
  });
});

describe("gate rules beyond stages and tests", () => {
  it("fails naming a locked test whose file changed after it was sealed, until a person unlocks", async () => {
    const { project, actor, code } = await building();
    const sealed = { ...report(code, "passed"), testFiles: { "tests/discount.test.ts": "sha256:one" } };
    expect((await runsService.record(project.id, agent, sealed)).gates[code]?.pass).toBe(true);
    const edited = await runsService.gate(project.id, { [code]: "sha256:a" }, { testFiles: { "tests/discount.test.ts": "sha256:two" } });
    expect(edited.requirements[code]?.agentCanFix.join(" ")).toContain("locked test changed: tests/discount.test.ts (AC-1)");
    await criteriaService.unlock(project.id, actor, code);
    const after = await runsService.gate(project.id, { [code]: "sha256:a" }, { testFiles: { "tests/discount.test.ts": "sha256:two" } });
    expect(after.requirements[code]?.agentCanFix.join(" ")).not.toContain("locked test changed");
  });

  it("names the stale evidence with exactly that reason", async () => {
    const { project, code } = await building();
    await runsService.record(project.id, agent, report(code, "passed", "sha256:a"));
    await runsService.gate(project.id, { [code]: "sha256:b" });
    const view = await requirementsService.get(project.id, code);
    expect(view.history.at(-1)?.reason).toBe("stale evidence");
  });

  it("requires the invariant tests that run in the requirement's stages to pass", async () => {
    const { project, actor, code } = await building();
    await glossaryService.upsertInvariant(project.id, actor, { code: "INV-1", text: "Totals are never negative", testRefs: ["tests/totals.test.ts::never negative", "tests/other.test.ts::not in this suite"] });
    const base = report(code, "passed");
    const stage = base.stages[0];
    if (!stage) throw new Error("no stage");
    const failing = { ...base, stages: [{ ...stage, results: [...stage.results, { ref: "tests/totals.test.ts::never negative", file: "tests/totals.test.ts", name: "never negative", status: "failed" as const, durationMs: 1, message: "-1" }] }] };
    const result = await runsService.record(project.id, agent, failing);
    expect(result.gates[code]?.agentCanFix).toEqual(["invariant INV-1: tests/totals.test.ts::never negative failed"]);
  });

  it("requires the regression test of an incident on the requirement", async () => {
    const { project, actor, code } = await building();
    await runsService.record(project.id, agent, report(code, "passed"));
    const incident = await incidentsService.report(project.id, actor, { reported: "8% missing on the annual plan", requirement: code });
    await incidentsService.triage(project.id, actor, incident.code, { triage: "bug", cause: "implementation", billing: "fix", regressionTest: "tests/discount.test.ts::annual plan" });
    await lifecycleService.start(project.id, agent, code, null);
    const result = await runsService.record(project.id, agent, report(code, "passed"));
    expect(result.gates[code]?.agentCanFix).toEqual([`regression test of ${incident.code}: tests/discount.test.ts::annual plan not run`]);
  });

  it("counts only results of the commit under evaluation for what is still building", async () => {
    const { project, code } = await building(["unit", { check: "preview", manual: true }]);
    await runsService.record(project.id, agent, report(code, "passed"));
    const other = await runsService.gate(project.id, {}, { commit: "def5678" });
    expect(other.requirements[code]?.agentCanFix).toContain("unit not run");
  });
});

describe("evidence per condition (REQ-8X1MF)", () => {
  it("stores each condition's run with its env and result", async () => {
    const { project, code } = await building([{ run: "unit", conditions: ["dark", "light"] }]);
    const base = report(code, "passed");
    const stage = base.stages[0];
    if (!stage) throw new Error("no stage");
    await runsService.record(project.id, agent, { ...base, stages: [{ ...stage, condition: "dark", env: { THEME: "dark" } }, { ...stage, condition: "light", env: { THEME: "light" }, status: "failed" }] });
    const stages = await database().runStage.findMany({ where: { requirement: { code } }, orderBy: { condition: "asc" }, select: { condition: true, env: true, status: true } });
    expect(stages).toEqual([{ condition: "dark", env: { THEME: "dark" }, status: "passed" }, { condition: "light", env: { THEME: "light" }, status: "failed" }]);
  });
});

describe("flaky tests (REQ-Q3W6Z)", () => {
  it("flags a test that failed and passed on two commits when its files did not change, and not when they did", async () => {
    const { project, code } = await building();
    await runsService.record(project.id, agent, { ...report(code, "failed", "sha256:same"), commit: "1111111" });
    await runsService.record(project.id, agent, { ...report(code, "passed", "sha256:same"), commit: "2222222" });
    expect((await testCatalog(project.id)).find((t) => t.ref === TEST_REF)?.flaky).toBe(true);
    await resetDatabase();
    const again = await building();
    await runsService.record(again.project.id, agent, { ...report(again.code, "failed", "sha256:before"), commit: "1111111" });
    await runsService.record(again.project.id, agent, { ...report(again.code, "passed", "sha256:after"), commit: "2222222" });
    expect((await testCatalog(again.project.id)).find((t) => t.ref === TEST_REF)?.flaky).toBe(false);
  });
});

describe("automatic checks and run comparison", () => {
  it("passes the examples check only when every example of the requester has a passing linked test", async () => {
    const { project, code } = await building(["unit", { check: "examples" }]);
    const result = await runsService.record(project.id, agent, report(code, "passed"));
    expect(result.gates[code]?.pass).toBe(true);
  });

  it("hands a check Lastro does not know to a person instead of failing it silently", async () => {
    const unknown = await building(["unit", { check: "screenshot_diff" }]);
    const held = await runsService.record(unknown.project.id, agent, report(unknown.code, "passed"));
    expect(held.gates[unknown.code]?.needsPerson).toEqual(["check screenshot_diff has no automatic implementation: make it manual (signed) or a command"]);
  });

  it("lists the tests that started failing and those passing again in separate lists (REQ-S9A2B)", async () => {
    const { project, code } = await building();
    const two = (a: "passed" | "failed", b: "passed" | "failed") => {
      const r = report(code, "passed");
      const stage = r.stages[0];
      if (!stage) throw new Error("no stage");
      const result = (ref: string, status: "passed" | "failed") => ({ ref, file: ref.split("::")[0] ?? ref, name: ref.split("::")[1] ?? ref, status, durationMs: 1, message: null });
      return { ...r, stages: [{ ...stage, status: "failed" as const, results: [result(TEST_REF, a), result("tests/discount.test.ts::annual plan", b)] }] };
    };
    await runsService.record(project.id, agent, two("passed", "failed"));
    const second = await runsService.record(project.id, agent, two("failed", "passed"));
    const detail = await runsService.get(project.id, second.runId);
    expect(detail.comparisons[0]).toMatchObject({ newlyFailing: [TEST_REF], newlyPassing: ["tests/discount.test.ts::annual plan"] });
  });
});

describe("tests under several conditions", () => {
  it("passes a test that passed under one condition and was skipped where it does not apply", async () => {
    const { project, code } = await building([{ run: "unit", conditions: ["desktop", "phone"] }]);
    const base = report(code, "passed");
    const stage = base.stages[0];
    const passed = stage?.results[0];
    if (!stage || !passed) throw new Error("no stage");
    const result = await runsService.record(project.id, agent, {
      ...base,
      stages: [{ ...stage, condition: "desktop" }, { ...stage, condition: "phone", results: [{ ...passed, status: "skipped" }] }],
    });
    expect(result.gates[code]?.pass).toBe(true);
  });
});
