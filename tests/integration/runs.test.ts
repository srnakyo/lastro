import { beforeEach, describe, expect, it } from "bun:test";
import { lifecycleService, requirementsService, runsService, sourcesService, testCatalog } from "@lastro/core";
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
    expect(catalog.find((t) => t.ref === TEST_REF)).toMatchObject({ flaky: true, orphan: false, last: "passed" });
    expect(catalog.find((t) => t.ref === "tests/other.test.ts::x")?.orphan).toBe(true);
    const detail = await runsService.get(project.id, second.runId);
    expect(detail.previousId).toBe(first.runId);
    expect(detail.changed).toEqual([{ ref: TEST_REF, from: "failed", to: "passed" }]);
  });
});
