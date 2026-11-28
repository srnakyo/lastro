import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { projectConfigSchema, testFile, type ProjectConfig } from "@lastro/shared";
import { mergeResults, verify } from "@lastro/runner";
import type { LastroClient } from "../api/client";

interface Plan {
  config: unknown;
  requirements: { code: string; type: string }[];
}

const git = (cwd: string, args: string[]) => execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();

/** Only the stages that run tests (they write a JUnit report): lint or a build on the old commit proves nothing. */
function testStagesOnly(config: ProjectConfig, type: string): ProjectConfig {
  const runsTests = (stage: unknown) => {
    const name = typeof stage === "string" ? stage : (stage as { run?: string }).run;
    return !!name && !!config.commands[name]?.report?.junit;
  };
  const flow = (config.types[type]?.flow ?? []).filter(runsTests);
  return { ...config, global_flow: config.global_flow.filter(runsTests), types: { ...config.types, [type]: { ...config.types[type], required: [], flow, tests: { levels: [] } } } };
}

export interface Proof {
  commit: string;
  failed: string[];
  passed: string[];
  notRun: string[];
  runId: string | null;
}

/** Where to prove: an earlier commit, or this one with the files of the behavior taken out (back to `at`, or deleted). */
export interface ProofTarget {
  at?: string;
  without?: string[];
}

/** Takes the behavior out of the worktree: each file back to its version at `at`, or deleted when it was not there. */
function takeOut(root: string, dir: string, files: string[], at: string | undefined) {
  for (const file of files) {
    const path = join(dir, file);
    let before: string | null = null;
    if (at) {
      try {
        before = execFileSync("git", ["show", `${at}:${file}`], { cwd: root, stdio: ["ignore", "pipe", "ignore"] }).toString();
      } catch {
        before = null;
      }
    }
    if (before === null) rmSync(path, { force: true, recursive: true });
    else writeFileSync(path, before);
  }
}

/**
 * Runs a criterion's tests, as they are now, without the code they test, in a throwaway git worktree: on an
 * earlier commit where that code did not exist yet, or on this commit with the files of that behavior taken
 * out (`without`), when the code and its tests came in together. Failing there is the red those tests could not
 * show first, recorded as a proof run; passing there means they do not check that code.
 */
export async function proveAtCommit(client: LastroClient, root: string, project: string, code: string, criterion: string, target: ProofTarget): Promise<Proof> {
  const without = target.without ?? [];
  if (!target.at && without.length === 0) throw new Error("say where to prove: --at <commit before the code>, or --without <files of the behavior>");
  const plan = await client.get<Plan>(`/projects/${project}/verify-plan?code=${encodeURIComponent(code)}`);
  const view = await client.get<{ type: string; criteria: { code: string; tests: { testRef: string }[] }[] }>(`/projects/${project}/requirements/${code}`);
  const tests = view.criteria.find((c) => c.code === criterion)?.tests.map((t) => t.testRef) ?? [];
  if (tests.length === 0) throw new Error(`${code} ${criterion} has no linked test to prove`);
  const commit = git(root, ["rev-parse", "--short", without.length ? "HEAD" : (target.at ?? "HEAD")]);
  const dir = mkdtempSync(join(tmpdir(), "lastro-proof-"));
  git(root, ["worktree", "add", "--detach", dir, commit]);
  try {
    const files = [...new Set(tests.map(testFile))];
    for (const file of files) {
      if (!existsSync(join(root, file))) continue;
      mkdirSync(dirname(join(dir, file)), { recursive: true });
      copyFileSync(join(root, file), join(dir, file));
    }
    takeOut(root, dir, without, target.at);
    const config = testStagesOnly(projectConfigSchema.parse(plan.config), view.type);
    const report = await verify(dir, config, [{ code, type: view.type, touches: [], testFiles: files, tests }], "agent");
    const ran = report.stages.filter((s) => s.results.length > 0 || s.status !== "passed");
    // A suite that could not even build fails every test it holds: that is the code missing, which is the point.
    const broken = ran.some((s) => s.status !== "passed" && s.results.length === 0);
    // Only the criterion's tests: the suite may run others (a script that adds packages), which are nobody's red.
    const stages = ran.map((s) => ({ ...s, results: s.results.filter((r) => tests.includes(r.ref)) }));
    const results = new Map(mergeResults(stages.flatMap((s) => s.results)).map((r) => [r.ref, r.status] as const));
    const failed = tests.filter((t) => results.get(t) === "failed" || results.get(t) === "error");
    const notRun = tests.filter((t) => !results.has(t));
    const red = broken ? [...failed, ...notRun] : failed;
    let runId: string | null = null;
    if (red.length) {
      const saved = await client.post<{ runId: string }>(`/projects/${project}/runs`, {
        ...report, commit, branch: null, dirty: true, trees: {}, stages: stages.map((s) => ({ ...s, results: broken && s.results.length === 0 && s.status !== "passed" ? notRun.map((ref) => ({ ref, file: testFile(ref), name: ref.split("::").slice(1).join("::"), status: "failed" as const, durationMs: 0, message: `did not build at ${commit}` })) : s.results })),
        proof: { requirement: code, criterion, at: commit, without },
      });
      runId = saved.runId;
    }
    return { commit, failed: red, passed: tests.filter((t) => results.get(t) === "passed"), notRun: broken ? [] : notRun, runId };
  } finally {
    git(root, ["worktree", "remove", "--force", dir]);
  }
}
