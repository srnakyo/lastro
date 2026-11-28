import { afterAll, beforeEach, describe, expect, it } from "bun:test";
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { lifecycleService, requirementsService, runsService, sourcesService, tokensService } from "@lastro/core";
import { database } from "@lastro/database";
import { projectConfigSchema } from "@lastro/shared";
import { lastro, startApi, tempRepo } from "../helpers/cli";
import { resetDatabase } from "../helpers/db";
import { agent, createBriefSource, createProject, discountRequirement } from "../helpers/fixtures";

const api = startApi();
afterAll(() => api.stop());
beforeEach(resetDatabase);

const REF = "check.sh::calc works";
const git = (cwd: string, ...args: string[]) => execFileSync("git", ["-c", "user.email=t@t.test", "-c", "user.name=t", ...args], { cwd, encoding: "utf8" }).trim();
/** A "test" that passes when the code (calc.txt) is there, or always when `vacuous`. */
const check = (vacuous = false) =>
  `if [ -f calc.txt ] || ${vacuous ? "true" : "false"}; then c='<testcase name="calc works"/>'; else c='<testcase name="calc works"><failure message="no calc"/></testcase>'; fi\nprintf '<testsuites><testsuite name="check.sh" file="check.sh">%s</testsuite></testsuites>' "$c" > junit.xml\n`;

/** A repository whose first commit has no code, then a requirement in building with its criterion locked. */
async function setup(vacuous = false) {
  const ctx = await createProject();
  const config = projectConfigSchema.parse({
    project: "billing", tests: { red_first: true, red_first_since: "2020-01-01T00:00:00.000Z" },
    commands: { unit: { run: "sh check.sh", report: { junit: "junit.xml" } } }, types: { calculation: { required: [], flow: ["unit"] } },
  });
  await database().project.update({ where: { id: ctx.project.id }, data: { config } });
  const source = await createBriefSource(ctx.project.id, ctx.actor, true);
  const req = await requirementsService.create(ctx.project.id, ctx.actor, { ...discountRequirement(source.code), criteria: [{ code: "AC-1", text: "calc works", tests: [REF] }] });
  await sourcesService.markFinal(ctx.project.id, ctx.actor, source.code).catch(() => undefined);
  await lifecycleService.approve(ctx.project.id, ctx.actor, req.code);
  await lifecycleService.start(ctx.project.id, agent, req.code, null);
  const repo = tempRepo();
  git(repo, "init", "-q");
  writeFileSync(join(repo, "README.md"), "start\n");
  git(repo, "add", ".");
  git(repo, "commit", "-qm", "before the code");
  const before = git(repo, "rev-parse", "--short", "HEAD");
  writeFileSync(join(repo, "calc.txt"), "the code\n");
  writeFileSync(join(repo, "check.sh"), check(vacuous));
  git(repo, "add", ".");
  git(repo, "commit", "-qm", "code and test together");
  const token = (await tokensService.create(ctx.workspace.id, ctx.actor, { name: "agent", kind: "agent" })).token;
  const run = (args: string[]) => lastro(args, { cwd: repo, url: api.url, token });
  await run(["init", "billing"]);
  return { ...ctx, code: req.code, before, run };
}

describe("lastro req prove", () => {
  it("records the red of tests written with their code, by running them on the commit before the code", async () => {
    const { project, code, before, run } = await setup();
    const res = await run(["req", "prove", code, "AC-1", "--at", before]);
    expect(res.stdout).toContain(`${code} AC-1: 1 test(s) fail at ${before}: their red is recorded`);
    expect(res.code).toBe(0);
    const proof = await database().run.findFirstOrThrow({ where: { projectId: project.id, commit: before } });
    expect(proof.status).toBe("failed");
    expect((await requirementsService.get(project.id, code)).status).toBe("building");
    const green = await runsService.record(project.id, agent, {
      trigger: "agent", commit: "head", branch: null, dirty: false, environment: {}, startedAt: new Date().toISOString(), durationMs: 1, trees: { [code]: "sha256:t" },
      stages: [{ requirement: code, stage: "unit", condition: null, command: "sh check.sh", exitCode: 0, status: "passed", durationMs: 1, output: "", findings: [], results: [{ ref: REF, file: "check.sh", name: "calc works", status: "passed", durationMs: 1, message: null }] }],
    });
    expect(green.gates[code]?.agentCanFix.join(" ")).not.toContain("never failed");
  });

  it("proves on this commit with the behavior's file taken out, when the code and its tests came in together", async () => {
    const { project, code, run } = await setup();
    const res = await run(["req", "prove", code, "AC-1", "--without", "calc.txt"]);
    expect(res.stdout).toContain("1 test(s) fail at");
    expect(res.stdout).toContain("without calc.txt: their red is recorded");
    const audit = await database().auditEvent.findFirstOrThrow({ where: { projectId: project.id, action: "run.proof" } });
    expect(audit.data).toMatchObject({ requirement: code, criterion: "AC-1", without: ["calc.txt"] });
  });

  it("says when the tests pass even before the code, so they do not check it", async () => {
    const { code, before, run } = await setup(true);
    const res = await run(["req", "prove", code, "AC-1", "--at", before]);
    expect(res.code).toBe(1);
    expect(res.stdout).toContain(`these pass at ${before} too, so they may not check that code`);
  });
});
