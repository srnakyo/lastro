import { beforeEach, describe, expect, it } from "bun:test";
import { addTouches, decisionsService, lifecycleService, lockedTestFiles, requirementsService, runsService, setTouches, sourcesService, criteriaService } from "@lastro/core";
import { database } from "@lastro/database";
import { projectConfigSchema, type RunReportInput } from "@lastro/shared";
import { resetDatabase } from "../helpers/db";
import { agent, createBriefSource, createProject, discountRequirement } from "../helpers/fixtures";

beforeEach(resetDatabase);

const TEST_REF = "tests/discount.test.ts::60 seats";

/** A requirement in building whose criterion is locked, in a project that asks tests to fail first. */
async function building(code?: string) {
  const ctx = await createProject();
  const config = projectConfigSchema.parse({
    project: "billing",
    tests: { red_first: true, red_first_since: "2020-01-01T00:00:00.000Z" },
    commands: { unit: { run: "bun test", report: { junit: "junit.xml" } } },
    types: { calculation: { required: [], flow: ["unit"] } },
  });
  await database().project.update({ where: { id: ctx.project.id }, data: { config } });
  const source = await createBriefSource(ctx.project.id, ctx.actor, true);
  const input = discountRequirement(source.code);
  const req = await requirementsService.create(ctx.project.id, ctx.actor, { ...input, ...(code ? { code } : {}), criteria: [{ code: "AC-1", text: input.criteria[0]?.text ?? "", tests: [TEST_REF] }] });
  await sourcesService.markFinal(ctx.project.id, ctx.actor, source.code).catch(() => undefined);
  await lifecycleService.approve(ctx.project.id, ctx.actor, req.code);
  await lifecycleService.start(ctx.project.id, agent, req.code, null);
  return { ...ctx, code: req.code };
}

const run = (code: string, status: "passed" | "failed", fileHash: string, lines: string[] = ["l1", "l2"]): RunReportInput => ({
  trigger: "agent", commit: "abc1234", branch: "main", dirty: false, environment: {}, startedAt: new Date().toISOString(), durationMs: 10,
  trees: { [code]: "sha256:tree" }, testFiles: { "tests/discount.test.ts": fileHash }, testFileLines: { "tests/discount.test.ts": lines },
  stages: [{ requirement: code, stage: "unit", condition: null, command: "bun test", exitCode: status === "passed" ? 0 : 1, status, durationMs: 5, output: "", findings: [], results: [{ ref: TEST_REF, file: "tests/discount.test.ts", name: "60 seats", status, durationMs: 1, message: null }] }],
});

describe("the agent fixes its own test until the test proves itself", () => {
  it("leaves a failing locked test open for edits, and seals it on its first pass", async () => {
    const { project, code } = await building();
    await runsService.record(project.id, agent, run(code, "failed", "sha256:wrong"));
    expect(await lockedTestFiles(project.id)).toEqual([]);
    // The agent fixed its test: a new file, no "locked test changed".
    const fixed = await runsService.record(project.id, agent, run(code, "passed", "sha256:fixed"));
    expect(fixed.gates[code]?.agentCanFix.join(" ")).not.toContain("locked test changed");
    expect(fixed.gates[code]?.pass).toBe(true);
    expect(await lockedTestFiles(project.id)).toEqual([{ file: "tests/discount.test.ts", criteria: [`${code} AC-1`] }]);
    const edited = await runsService.gate(project.id, { [code]: "sha256:tree" }, { testFiles: { "tests/discount.test.ts": "sha256:weaker" } });
    expect(edited.requirements[code]?.agentCanFix.join(" ")).toContain("locked test changed: tests/discount.test.ts (AC-1)");
  });

  it("lifts a seal put on a test that never passed, under the earlier rule", async () => {
    const { project, code } = await building();
    await database().criterionTest.updateMany({ where: { testRef: TEST_REF }, data: { lockedHash: "sha256:wrong" } });
    expect(await lockedTestFiles(project.id)).toHaveLength(1);
    await runsService.record(project.id, agent, run(code, "failed", "sha256:wrong"));
    expect(await lockedTestFiles(project.id)).toEqual([]);
  });
});

describe("a sealed test file that gets another test", () => {
  it("keeps the seal when the file only grew, renewed and audited, and breaks it when a line changed", async () => {
    const { project, code } = await building();
    await runsService.record(project.id, agent, run(code, "passed", "sha256:one", ["import", "test 60 seats", "expect 8%"]));
    const grown = await runsService.record(project.id, agent, run(code, "passed", "sha256:two", ["import", "test 60 seats", "expect 8%", "test of another requirement"]));
    expect(grown.gates[code]?.agentCanFix.join(" ")).not.toContain("locked test changed");
    expect(await database().auditEvent.count({ where: { projectId: project.id, action: "test.reseal" } })).toBe(1);
    const weakened = await runsService.gate(project.id, { [code]: "sha256:tree" }, { testFiles: { "tests/discount.test.ts": "sha256:three" }, testFileLines: { "tests/discount.test.ts": ["import", "test 60 seats", "expect anything", "test of another requirement"] } });
    expect(weakened.requirements[code]?.agentCanFix.join(" ")).toContain("locked test changed: tests/discount.test.ts (AC-1)");
  });

  it("renews once a seal from before line fingerprints, on a passing run", async () => {
    const { project, code } = await building();
    await runsService.record(project.id, agent, run(code, "passed", "sha256:one"));
    await database().criterionTest.updateMany({ where: { testRef: TEST_REF }, data: { sealedLines: [] } });
    const renewed = await runsService.record(project.id, agent, run(code, "passed", "sha256:grown", ["l1", "l2", "l3"]));
    expect(renewed.gates[code]?.agentCanFix.join(" ")).not.toContain("locked test changed");
    expect((await database().criterionTest.findFirstOrThrow({ where: { testRef: TEST_REF } })).sealedLines).toEqual(["l1", "l2", "l3"]);
  });
});

describe("a behavior that already existed", () => {
  it("is recorded as a decision the person sees, and its tests are not asked to fail first, until the person overturns it", async () => {
    const { project, actor, code } = await building();
    const green = await runsService.record(project.id, agent, run(code, "passed", "sha256:one"));
    expect(green.gates[code]?.agentCanFix.join(" ")).toContain("never failed");

    const { decision } = await criteriaService.markPreexisting(project.id, agent, code, "AC-1", "the 409 on a repeated portfolio was already in the handler before this requirement");
    const recorded = await database().decision.findFirstOrThrow({ where: { projectId: project.id, code: decision } });
    expect(recorded).toMatchObject({ kind: "assumption", status: "proposed", decidedByAgent: true });
    expect(recorded.text).toContain(`${code} AC-1 checks a behavior that already existed`);
    const again = await runsService.record(project.id, agent, run(code, "passed", "sha256:one"));
    expect(again.gates[code]?.pass).toBe(true);
    expect((await requirementsService.get(project.id, code)).status).toBe("verified");

    await decisionsService.overturn(project.id, actor, decision, "this behavior is new");
    expect((await database().criterion.findFirstOrThrow({ where: { code: "AC-1", requirement: { projectId: project.id, code } } })).preexistingDecision).toBeNull();
    const after = await runsService.gate(project.id, { [code]: "sha256:tree" });
    expect(after.requirements[code]?.agentCanFix.join(" ")).toContain("never failed");
  });
});

describe("a test named after its criterion", () => {
  it("links itself when its run is recorded, audited as automatic", async () => {
    const { project, code } = await building();
    const named = `tests/discount.test.ts::shows the 8% line for 61 seats (${code} AC-1)`;
    const report = run(code, "passed", "sha256:one");
    const stage = report.stages[0];
    if (stage) stage.results = [...stage.results, { ref: named, file: "tests/discount.test.ts", name: named.split("::")[1] ?? "", status: "passed", durationMs: 1, message: null }];
    const recorded = await runsService.record(project.id, agent, report);
    expect(recorded.linked).toEqual([`${code} AC-1 ${named}`]);
    const view = await requirementsService.get(project.id, code);
    expect(view.criteria[0]?.tests.map((t) => t.testRef)).toContain(named);
    const audit = await database().auditEvent.findFirstOrThrow({ where: { projectId: project.id, action: "criterion.link_test" }, orderBy: { createdAt: "desc" } });
    expect(audit.data).toMatchObject({ testRef: named, auto: true, resealed: true });
  });
});

describe("the files of the requirement being worked on", () => {
  it("go only to that requirement when the agent says which one, and to every one in building when it does not", async () => {
    const first = await building("REQ-AAAA1");
    const source = await createBriefSource(first.project.id, first.actor, true);
    const other = await requirementsService.create(first.project.id, first.actor, { ...discountRequirement(source.code), code: "REQ-BBBB2" });
    await lifecycleService.approve(first.project.id, first.actor, other.code).catch(() => undefined);
    await lifecycleService.start(first.project.id, agent, other.code, null).catch(() => undefined);
    await addTouches(first.project.id, agent, ["backend/limite.go"], "main", "REQ-AAAA1");
    const touches = async (code: string) => (await database().requirement.findFirstOrThrow({ where: { projectId: first.project.id, code } })).touches;
    expect(await touches("REQ-AAAA1")).toEqual(["backend/limite.go"]);
    expect(await touches("REQ-BBBB2")).toEqual([]);
    await addTouches(first.project.id, agent, ["backend/shared.go"], "main", null);
    expect(await touches("REQ-BBBB2")).toEqual(["backend/shared.go"]);
  });

  it("go to the requirement the branch is named after, or whose test file changed, when the agent did not say", async () => {
    const first = await building("REQ-AAAA1");
    const source = await createBriefSource(first.project.id, first.actor, true);
    const other = await requirementsService.create(first.project.id, first.actor, { ...discountRequirement(source.code), code: "REQ-BBBB2", criteria: [{ code: "AC-1", text: "x", tests: ["tests/other.test.ts::other"] }] });
    await lifecycleService.approve(first.project.id, first.actor, other.code).catch(() => undefined);
    await lifecycleService.start(first.project.id, agent, other.code, null).catch(() => undefined);
    const touches = async (code: string) => (await database().requirement.findFirstOrThrow({ where: { projectId: first.project.id, code } })).touches;
    await addTouches(first.project.id, agent, ["backend/a.go"], "feat/REQ-AAAA1-limite", null);
    expect(await touches("REQ-AAAA1")).toEqual(["backend/a.go"]);
    expect(await touches("REQ-BBBB2")).toEqual([]);
    await addTouches(first.project.id, agent, ["tests/other.test.ts", "backend/b.go"], "main", null);
    expect(await touches("REQ-BBBB2")).toEqual(["backend/b.go", "tests/other.test.ts"]);
    expect(await touches("REQ-AAAA1")).toEqual(["backend/a.go"]);
  });

  it("can be replaced when a list got files of other requirements, and the audit keeps what changed", async () => {
    const { project, code } = await building();
    await addTouches(project.id, agent, ["backend/limite.go", "backend/wabas.go", "front/app.ts"], "main", null);
    const res = await setTouches(project.id, agent, code, ["backend/limite.go", "./backend/limite_extra.go"]);
    expect(res).toEqual({ touches: ["backend/limite.go", "backend/limite_extra.go"], removed: ["backend/wabas.go", "front/app.ts"], added: ["backend/limite_extra.go"] });
    const audit = await database().auditEvent.findFirstOrThrow({ where: { projectId: project.id, action: "requirement.touches.set" } });
    expect(audit).toMatchObject({ actorType: "agent", data: { removed: ["backend/wabas.go", "front/app.ts"], added: ["backend/limite_extra.go"] } });
  });
});
