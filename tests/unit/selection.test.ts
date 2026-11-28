import { describe, expect, it } from "bun:test";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { projectConfigSchema } from "@lastro/shared";
import { fillCommand, selectionFor } from "../../packages/runner/src/selection";
import { verify } from "../../packages/runner/src/verify";

const levels = { unit: ["backend/internal/**", "tests/unit/**"], integration: ["backend/integracao/**"], e2e: ["tests/e2e/**"] };
const tests = [
  "backend/internal/limite/limite_test.go::TestPadraoPermite300",
  "backend/integracao/credenciais/credenciais_test.go::TestExcessoRecebe429",
  "backend/integracao/wabas/wabas_test.go::TestWabaRepetida",
  "tests/e2e/diagrams.spec.ts::draws a criterion without a test in red (REQ-M4R7W)",
];

describe("the tests a command runs for the requirements being verified", () => {
  it("takes the linked tests at the command's level, under its folder, relative to it", () => {
    expect(selectionFor({ run: "go test {dirs} -run '^({names})$'", dir: "backend", level: "integration" }, levels, tests)).toEqual({
      files: ["integracao/credenciais/credenciais_test.go", "integracao/wabas/wabas_test.go"],
      dirs: ["./integracao/credenciais", "./integracao/wabas"],
      names: ["TestExcessoRecebe429", "TestWabaRepetida"],
    });
  });

  it("fills the command with quoted paths and an escaped regex of the names", () => {
    const e2e = selectionFor({ run: "bunx playwright test {files} --grep '{names}'", level: "e2e" }, levels, tests);
    expect(fillCommand("bunx playwright test {files} --grep '{names}'", e2e)).toBe("bunx playwright test 'tests/e2e/diagrams.spec.ts' --grep 'draws a criterion without a test in red \\(REQ-M4R7W\\)'");
    expect(fillCommand("go test {dirs} -run '^({names})$'", { files: ["a/x_test.go"], dirs: ["./a"], names: ["TestA", "TestB"] })).toBe("go test './a' -run '^(TestA|TestB)$'");
  });

  it("runs a selecting command once for the requirements' tests, and does not run it for a requirement with none at its level", async () => {
    const root = mkdtempSync(join(tmpdir(), "lastro-select-"));
    const config = projectConfigSchema.parse({
      project: "waship",
      tests: { levels },
      commands: { integration: { run: "echo {files} > selected.txt", level: "integration" } },
      types: { behavior: { flow: ["integration"] } },
    });
    const report = await verify(root, config, [
      { code: "REQ-60KTK", type: "behavior", touches: [], tests: [tests[1] ?? ""] },
      { code: "REQ-DSZAN", type: "behavior", touches: [], tests: [tests[2] ?? ""] },
      { code: "REQ-UNIT1", type: "behavior", touches: [], tests: [tests[0] ?? ""] },
    ], "agent");
    expect(readFileSync(join(root, "selected.txt"), "utf8").trim()).toBe("backend/integracao/credenciais/credenciais_test.go backend/integracao/wabas/wabas_test.go");
    expect(report.stages.filter((s) => s.command?.startsWith("echo"))).toHaveLength(2);
    expect(report.stages.find((s) => s.requirement === "REQ-UNIT1")).toMatchObject({ status: "passed", command: null, output: "no linked test for this stage: not run" });
  });
});

describe("a test's name pointing to its criterion", () => {
  it("reads Go, Bun and Playwright styles, and each AC belongs to the requirement before it", async () => {
    const { mentionedCriteria } = await import("../../packages/core/src/runs/auto-link");
    expect(mentionedCriteria("TestExcesso_REQ60KTK_AC1")).toEqual([{ requirement: "REQ-60KTK", criterion: "AC-1" }]);
    expect(mentionedCriteria("draws a criterion without a test in red (REQ-M4R7W AC-1)")).toEqual([{ requirement: "REQ-M4R7W", criterion: "AC-1" }]);
    expect(mentionedCriteria("checks both (REQ-A2C7H AC-2 AC-3, REQ-0C4N1 AC-1)")).toEqual([
      { requirement: "REQ-A2C7H", criterion: "AC-2" }, { requirement: "REQ-A2C7H", criterion: "AC-3" }, { requirement: "REQ-0C4N1", criterion: "AC-1" },
    ]);
    expect(mentionedCriteria("a requirement code alone (REQ-60KTK) or REQ-60KTKX AC-1 links nothing")).toEqual([]);
  });
});
