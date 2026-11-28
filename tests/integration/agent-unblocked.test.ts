import { beforeEach, describe, expect, it } from "bun:test";
import { addTouches, decisionsService, exportSnapshot, lifecycleService, lockedTestFiles, packagesService, requirementsService, runsService, setTouches, sourcesService, criteriaService } from "@lastro/core";
import { planImport } from "../../packages/core/src/snapshot/plan";
import { criterionHash } from "@lastro/shared";
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
    expect(await lockedTestFiles(project.id)).toMatchObject([{ file: "tests/discount.test.ts", criteria: [`${code} AC-1`] }]);
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

describe("a negative test that passed against a stub", () => {
  it("counts as red once it fails after being made stronger, without anyone unlocking it", async () => {
    const { project, code } = await building();
    // The worker was an empty stub, so "a suspended tenant sends nothing" passed on the first run.
    const stub = await runsService.record(project.id, agent, run(code, "passed", "sha256:one", ["l1", "l2"]));
    expect(stub.gates[code]?.agentCanFix.join(" ")).toContain("never failed");
    // The agent adds a positive control to the same test (lines added only, so the seal holds): it fails on the stub.
    const stronger = await runsService.record(project.id, agent, run(code, "failed", "sha256:two", ["l1", "a tenant not suspended sends", "l2"]));
    expect(stronger.gates[code]?.agentCanFix.join(" ")).not.toContain("locked test changed");
    const built = await runsService.record(project.id, agent, run(code, "passed", "sha256:two", ["l1", "a tenant not suspended sends", "l2"]));
    expect(built.gates[code]?.agentCanFix.join(" ")).not.toContain("never failed");
    expect(built.gates[code]?.pass).toBe(true);
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
  it("go only to the requirement the agent names, and to none when several are in building and nothing tells", async () => {
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
    expect(await touches("REQ-BBBB2")).toEqual([]);
    expect(await touches("REQ-AAAA1")).toEqual(["backend/limite.go"]);
  });

  it("go to the requirement the branch is named after, or to the only one in building, and never include test files", async () => {
    const first = await building("REQ-AAAA1");
    const source = await createBriefSource(first.project.id, first.actor, true);
    const other = await requirementsService.create(first.project.id, first.actor, { ...discountRequirement(source.code), code: "REQ-BBBB2", criteria: [{ code: "AC-1", text: "x", tests: ["tests/other.test.ts::other"] }] });
    await lifecycleService.approve(first.project.id, first.actor, other.code).catch(() => undefined);
    await lifecycleService.start(first.project.id, agent, other.code, null).catch(() => undefined);
    const touches = async (code: string) => (await database().requirement.findFirstOrThrow({ where: { projectId: first.project.id, code } })).touches;
    await addTouches(first.project.id, agent, ["backend/a.go"], "feat/REQ-AAAA1-limite", null);
    expect(await touches("REQ-AAAA1")).toEqual(["backend/a.go"]);
    expect(await touches("REQ-BBBB2")).toEqual([]);
    // A changed test file of one requirement does not hand it every file of the turn.
    await addTouches(first.project.id, agent, ["tests/other.test.ts", "backend/b.go"], "main", null);
    expect(await touches("REQ-BBBB2")).toEqual([]);
    expect(await touches("REQ-AAAA1")).toEqual(["backend/a.go"]);
    await lifecycleService.drop(first.project.id, first.actor, other.code, "split").catch(() => undefined);
    await database().requirement.update({ where: { projectId_code: { projectId: first.project.id, code: other.code } }, data: { status: "dropped" } });
    await addTouches(first.project.id, agent, ["tests/discount.test.ts", "backend/c.go"], "main", null);
    expect(await touches("REQ-AAAA1")).toEqual(["backend/a.go", "backend/c.go"]);
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

describe("planning an import of what the server already has", () => {
  it("plans nothing for a package with the same title, report and sources", async () => {
    const { project, actor } = await createProject();
    const source = await createBriefSource(project.id, actor, true);
    await packagesService.create(project.id, actor, { title: "Round 1", sources: [source.code] });
    const snapshot = await exportSnapshot(project.id);
    expect(snapshot.packages).toHaveLength(1);
    const plan = await planImport(project.id, snapshot);
    expect(plan.packages).toEqual([]);
    const renamed = await planImport(project.id, { ...snapshot, packages: snapshot.packages.map((p) => ({ ...p, title: "Round 2" })) });
    expect(renamed.packages).toEqual(snapshot.packages.map((p) => p.code));
  });
});

describe("the latest evidence", () => {
  it("is the latest run's, even when an earlier run shared a long suite among many requirements", async () => {
    const { project, code } = await building();
    // An earlier run: the same 18-minute suite listed for 30 requirements, this one last and failing.
    const earlier = run(code, "failed", "sha256:one");
    const failing = earlier.stages[0];
    if (!failing) throw new Error("no stage");
    earlier.stages = [...Array.from({ length: 29 }, () => ({ ...failing, requirement: null, durationMs: 18 * 60_000 })), { ...failing, durationMs: 18 * 60_000 }];
    await runsService.record(project.id, agent, earlier);
    await new Promise((resolve) => setTimeout(resolve, 5));
    const now = await runsService.record(project.id, agent, run(code, "passed", "sha256:one"));
    expect(now.gates[code]?.agentCanFix).toEqual([]);
    expect(now.gates[code]?.pass).toBe(true);
    const stages = await database().runStage.findMany({ where: { run: { projectId: project.id } }, include: { run: true } });
    expect(stages.every((s) => !s.run.finishedAt || s.startedAt <= s.run.finishedAt)).toBe(true);
  });
});

describe("a seal on each test's own lines", () => {
  const OTHER = "tests/discount.test.ts::shows the 8% line for 61 seats";
  async function twoTests() {
    const ctx = await building();
    await criteriaService.linkTest(ctx.project.id, agent, ctx.code, "AC-1", OTHER);
    return ctx;
  }
  const report = (code: string, blocks: Record<string, string[]>, fileLines: string[]) => {
    const r = run(code, "passed", `sha256:${fileLines.join("")}`, fileLines);
    const stage = r.stages[0];
    if (stage) stage.results = [TEST_REF, OTHER].map((ref) => ({ ref, file: "tests/discount.test.ts", name: ref.split("::")[1] ?? "", status: "passed" as const, durationMs: 1, message: null }));
    return { ...r, testBlocks: blocks };
  };

  it("is left alone by a change in another test of the same file, and caught when its own lines change", async () => {
    const { project, code } = await twoTests();
    await runsService.record(project.id, agent, report(code, { [TEST_REF]: ["a1", "a2"], [OTHER]: ["b1", "b2"] }, ["imp", "a1", "a2", "b1", "b2"]));
    // The other test is rewritten and an import goes away: this one's lines did not change.
    const other = await runsService.record(project.id, agent, report(code, { [TEST_REF]: ["a1", "a2"], [OTHER]: ["b1", "b2", "b3"] }, ["a1", "a2", "b1", "b2", "b3"]));
    expect(other.gates[code]?.agentCanFix.join(" ")).not.toContain("locked test changed");
    const own = await runsService.gate(project.id, { [code]: "sha256:tree" }, { testFiles: { "tests/discount.test.ts": "sha256:x" }, testBlocks: { [TEST_REF]: ["a1", "a2 weaker"], [OTHER]: ["b1", "b2", "b3"] } });
    expect(own.requirements[code]?.agentCanFix.join(" ")).toContain(`locked test changed: ${TEST_REF} (AC-1)`);
  });

  it("takes over a whole-file seal from before when the test's own lines are still in it", async () => {
    const { project, code } = await twoTests();
    await runsService.record(project.id, agent, run(code, "passed", "sha256:old", ["imp", "a1", "a2", "b1", "b2"]));
    await database().criterionTest.updateMany({ where: { testRef: TEST_REF }, data: { lockedHash: "sha256:old", sealedLines: ["imp", "a1", "a2", "b1", "b2"] } });
    const now = await runsService.record(project.id, agent, report(code, { [TEST_REF]: ["a1", "a2"], [OTHER]: ["b1", "b9"] }, ["a1", "a2", "b1", "b9"]));
    expect(now.gates[code]?.agentCanFix.join(" ")).not.toContain("locked test changed");
    expect((await database().criterionTest.findFirstOrThrow({ where: { testRef: TEST_REF } })).lockedHash).toStartWith("block:");
  });
});

describe("a proof run", () => {
  it("keeps only its criterion's tests and is never anyone's evidence", async () => {
    const { project, code } = await building();
    await runsService.record(project.id, agent, run(code, "passed", "sha256:one"));
    const proof = run(code, "failed", "sha256:one");
    const stage = proof.stages[0];
    if (stage) stage.results = [...stage.results, { ref: "tests/other.test.ts::a test of another requirement", file: "tests/other.test.ts", name: "x", status: "failed", durationMs: 1, message: null }];
    await runsService.record(project.id, agent, { ...proof, proof: { requirement: code, criterion: "AC-1", at: "abc1234", without: ["calc.sql"] } });
    const stored = await database().testResult.findMany({ where: { runStage: { run: { projectId: project.id, proof: true } } }, select: { test: { select: { ref: true } } } });
    expect(stored.map((r) => r.test.ref)).toEqual([TEST_REF]);
    // The passing run is still the evidence: the proof's red does not fail the gate.
    const gate = await runsService.gate(project.id, { [code]: "sha256:tree" }, { commit: "abc1234" });
    expect(gate.requirements[code]?.agentCanFix.join(" ")).not.toContain(`${TEST_REF} failed`);
  });
});

describe("taking a test off a criterion", () => {
  const MERGED = "tests/discount.test.ts::60 seats and 61 seats in one";
  it("lets the agent take off a test that never passed once another covers the criterion, sealed again, and refuses one that passed", async () => {
    const { project, actor, code } = await building();
    await expect(criteriaService.unlinkTest(project.id, agent, code, "AC-1", TEST_REF)).rejects.toThrow("would have no test left");
    await criteriaService.linkTest(project.id, agent, code, "AC-1", MERGED);
    await criteriaService.unlinkTest(project.id, agent, code, "AC-1", TEST_REF);
    const criterion = await database().criterion.findFirstOrThrow({ where: { code: "AC-1", requirement: { projectId: project.id, code } }, include: { tests: true } });
    expect(criterion.tests.map((t) => t.testRef)).toEqual([MERGED]);
    expect(criterion.lockedHash).toBe(await criterionHash(criterion.text, [MERGED]));
    expect(await database().auditEvent.count({ where: { projectId: project.id, action: "criterion.unlink_test" } })).toBe(1);

    await criteriaService.linkTest(project.id, agent, code, "AC-1", TEST_REF);
    await runsService.record(project.id, agent, run(code, "passed", "sha256:one"));
    await expect(criteriaService.unlinkTest(project.id, agent, code, "AC-1", TEST_REF)).rejects.toThrow("passed already");
    await criteriaService.unlinkTest(project.id, actor, code, "AC-1", TEST_REF);
  });
});

describe("a test that is no longer in its file", () => {
  it("is not sealed on the whole file, when the file's other tests are found one by one", async () => {
    const { project, code } = await building();
    const MERGED = "tests/discount.test.ts::60 seats and 61 seats in one";
    await criteriaService.linkTest(project.id, agent, code, "AC-1", MERGED);
    const r = run(code, "passed", "sha256:file", ["m1", "m2"]);
    const stage = r.stages[0];
    if (stage) stage.results = [...stage.results, { ref: MERGED, file: "tests/discount.test.ts", name: "merged", status: "passed", durationMs: 1, message: null }];
    // TEST_REF passed once before it was merged; the file now holds only the merged test.
    await runsService.record(project.id, agent, { ...r, testBlocks: { [MERGED]: ["m1", "m2"] } });
    const old = await database().criterionTest.findFirstOrThrow({ where: { testRef: TEST_REF } });
    expect(old.lockedHash).toBeNull();
    expect((await database().criterionTest.findFirstOrThrow({ where: { testRef: MERGED } })).lockedHash).toStartWith("block:");
  });
});
