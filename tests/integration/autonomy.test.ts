import { beforeEach, describe, expect, it } from "bun:test";
import { criteriaService, lifecycleService, requirementsService, runsService } from "@lastro/core";
import { database } from "@lastro/database";
import { projectConfigSchema, type RunReportInput } from "@lastro/shared";
import { resetDatabase } from "../helpers/db";
import { agent, createBriefSource, createProject, discountRequirement } from "../helpers/fixtures";

beforeEach(resetDatabase);

const UNIT = "tests/unit/discount.test.ts::60 seats";
const E2E = "tests/e2e/invoice.spec.ts::shows the discount line";

/** A project in automatic mode, with the type's test levels and the project's test rules given. */
async function auto(types: Record<string, unknown> = { calculation: { required: [], flow: ["unit"] } }, tests: Record<string, unknown> = {}) {
  const ctx = await createProject({ autonomy: "auto", requireFinal: true });
  const config = projectConfigSchema.parse({ project: "billing", autonomy: "auto", approval: { require_final_source: true }, commands: { unit: { run: "bun test" } }, types, tests });
  await database().project.update({ where: { id: ctx.project.id }, data: { config } });
  const source = await createBriefSource(ctx.project.id, ctx.actor);
  return { ...ctx, source };
}

const withTests = (source: string, tests: string[]) => {
  const input = discountRequirement(source);
  return { ...input, criteria: [{ code: "AC-1", text: input.criteria[0]?.text ?? "", tests }] };
};

const run = (code: string, status: "passed" | "failed", stages: string[] = ["unit"]): RunReportInput => ({
  trigger: "agent", commit: "abc1234", branch: "feat/discount", dirty: false, environment: {}, startedAt: new Date().toISOString(), durationMs: 10,
  trees: { [code]: "sha256:a" },
  stages: stages.map((stage) => ({
    requirement: code, stage, condition: null, command: stage === "unit" ? "bun test" : null, exitCode: null, status, durationMs: 5, output: "",
    results: stage === "unit" ? [{ ref: UNIT, file: "tests/unit/discount.test.ts", name: "60 seats", status, durationMs: 1, message: null }] : [],
    findings: [],
  })),
});

describe("automatic mode", () => {
  it("approves and locks a complete requirement by itself, even on a draft source", async () => {
    const { project, actor, source } = await auto();
    const req = await requirementsService.create(project.id, actor, withTests(source.code, [UNIT]));
    const view = await requirementsService.get(project.id, req.code);
    expect(view.status).toBe("approved");
    expect(view.criteria.every((c) => c.lockedHash)).toBe(true);
    const event = await database().stateEvent.findFirst({ where: { requirementId: view.id, toStatus: "approved" } });
    expect([event?.actorType, event?.reason]).toEqual(["system", "approved automatically"]);
  });

  it("waits for a test on every criterion, and approves once the agent links the last one", async () => {
    const { project, actor, source } = await auto();
    const req = await requirementsService.create(project.id, actor, withTests(source.code, []));
    expect((await requirementsService.get(project.id, req.code)).status).toBe("specified");
    await criteriaService.linkTest(project.id, agent, req.code, "AC-1", UNIT);
    expect((await requirementsService.get(project.id, req.code)).status).toBe("approved");
  });

  it("waits for a test at every level the type asks for", async () => {
    const { project, actor, source } = await auto({ calculation: { required: [], flow: ["unit"], tests: { levels: ["unit", "e2e"] } } });
    const req = await requirementsService.create(project.id, actor, withTests(source.code, [UNIT]));
    const view = await requirementsService.get(project.id, req.code);
    expect(view.status).toBe("specified");
    expect(view.blockers).toContainEqual({ kind: "missing_test_level", detail: "e2e", blocks: "approved" });
    await criteriaService.linkTest(project.id, agent, req.code, "AC-1", E2E);
    expect((await requirementsService.get(project.id, req.code)).status).toBe("approved");
  });

  it("still refuses approvals, acceptance and unlocks to agents", async () => {
    const { project, actor, source } = await auto();
    const req = await requirementsService.create(project.id, actor, withTests(source.code, []));
    await expect(lifecycleService.approve(project.id, agent, req.code)).rejects.toThrow("needs a person");
    await expect(criteriaService.unlock(project.id, agent, req.code)).rejects.toThrow("needs a person");
  });
});

describe("test rules at the gate", () => {
  it("red first: a test that only ever passed holds verification; one seen failing first does not", async () => {
    const { project, actor, source } = await auto({ calculation: { required: [], flow: ["unit"] } }, { red_first: true });
    const req = await requirementsService.create(project.id, actor, withTests(source.code, [UNIT]));
    await lifecycleService.start(project.id, agent, req.code, "feat/discount");
    const green = await runsService.record(project.id, agent, run(req.code, "passed"));
    expect(green.gates[req.code]?.pass).toBe(false);
    expect(green.gates[req.code]?.fixItems).toContainEqual({ kind: "never_red", test: UNIT });

    const other = await requirementsService.create(project.id, actor, { ...withTests(source.code, [UNIT]), title: "Second" });
    await database().criterion.updateMany({ where: { requirement: { code: other.code } }, data: { lockedAt: new Date() } });
    await lifecycleService.start(project.id, agent, other.code, "feat/discount");
    await runsService.record(project.id, agent, run(other.code, "failed"));
    const after = await runsService.record(project.id, agent, run(other.code, "passed"));
    expect(after.gates[other.code]?.fixItems.some((i) => i.kind === "never_red")).toBe(false);
  });

  it("asks for the test-quality stage when the type has coverage rules", async () => {
    const { project, actor, source } = await auto({ calculation: { required: [], flow: ["unit"], tests: { levels: [], coverage: { functions: 100 } } } });
    const req = await requirementsService.create(project.id, actor, withTests(source.code, [UNIT]));
    await lifecycleService.start(project.id, agent, req.code, "feat/discount");
    const without = await runsService.record(project.id, agent, run(req.code, "passed"));
    expect(without.gates[req.code]?.fixItems).toContainEqual({ kind: "stage", stage: "test-quality", status: "not run" });
    const withIt = await runsService.record(project.id, agent, run(req.code, "passed", ["unit", "test-quality"]));
    expect(withIt.gates[req.code]?.pass).toBe(true);
  });
});
