import { describe, expect, it } from "bun:test";
import { stageFor, type StageRun } from "../../packages/runner/src/verify";
import { changedThisTurn } from "../../packages/cli/src/hooks/changed-files";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const result = (ref: string, status: "passed" | "failed") => ({ ref, file: ref.split("::")[0] ?? ref, name: ref.split("::")[1] ?? ref, status, durationMs: 1, message: null });
const suite = (results: ReturnType<typeof result>[], exitCode = 1): Omit<StageRun, "requirement"> => ({
  stage: "integration", condition: null, command: "go test ./...", exitCode, status: "failed", durationMs: 10, output: "", env: {}, results, findings: [],
});

describe("a suite several requirements share", () => {
  const shared = suite([result("limite_test.go::TestRecusaO301", "failed"), result("wabas_test.go::TestWabaRepetida", "passed")]);

  it("fails only the requirement whose own test failed, not the other 17", () => {
    expect(stageFor(shared, { code: "REQ-DSZAN", type: "behavior", touches: [], tests: ["wabas_test.go::TestWabaRepetida"] }).status).toBe("passed");
    expect(stageFor(shared, { code: "REQ-60KTK", type: "behavior", touches: [], tests: ["limite_test.go::TestRecusaO301"] }).status).toBe("failed");
  });

  it("goes by the exit code when the suite wrote no test results, or the requirement links no test", () => {
    expect(stageFor(suite([]), { code: "REQ-A", type: "behavior", touches: [], tests: ["x::y"] }).status).toBe("failed");
    expect(stageFor(shared, { code: "REQ-B", type: "behavior", touches: [] }).status).toBe("failed");
  });

  it("fails on an error finding even when the requirement's tests passed", () => {
    const linted = { ...shared, findings: [{ tool: "eslint", ruleId: "no-unused-vars", level: "error" as const, file: "a.ts", line: 3, message: "x" }] };
    expect(stageFor(linted, { code: "REQ-DSZAN", type: "behavior", touches: [], tests: ["wabas_test.go::TestWabaRepetida"] }).status).toBe("failed");
  });
});

describe("the files a turn changed", () => {
  it("counts a file again only when its content changed since the last turn", () => {
    const root = mkdtempSync(join(tmpdir(), "lastro-turn-"));
    writeFileSync(join(root, "a.go"), "v1");
    writeFileSync(join(root, "b.go"), "v1");
    const first = changedThisTurn(root, ["a.go", "b.go"], {});
    expect(first.changed).toEqual(["a.go", "b.go"]);
    writeFileSync(join(root, "b.go"), "v2");
    const second = changedThisTurn(root, ["a.go", "b.go", "gone.go"], first.seen);
    expect(second.changed).toEqual(["b.go", "gone.go"]);
    expect(second.seen["gone.go"]).toBe("deleted");
  });
});

describe("a sealed test file", () => {
  it("only grew when every sealed line is still there, in order", async () => {
    const { onlyGrew } = await import("../../packages/core/src/runs/gate");
    expect(onlyGrew(["a", "b", "c"], ["a", "x", "b", "c", "y"])).toBe(true);
    expect(onlyGrew(["a", "b", "c"], ["a", "c", "b"])).toBe(false);
    expect(onlyGrew(["a", "b", "c"], ["a", "b"])).toBe(false);
    expect(onlyGrew([], ["a"])).toBe(true);
  });
});
