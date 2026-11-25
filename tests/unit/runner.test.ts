import { describe, expect, it } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseJunit, parseSarif, planStages, treeHash, verify } from "@lastro/runner";
import { projectConfigSchema } from "@lastro/shared";

const JUNIT = `<?xml version="1.0"?>
<testsuites><testsuite name="tests/discount.test.ts" file="tests/discount.test.ts">
  <testcase name="60 seats" time="0.012"/>
  <testcase name="annual plan" time="0.2"><failure message="expected 8%">stack</failure></testcase>
  <testcase name="later"><skipped/></testcase>
</testsuite></testsuites>`;

const SARIF = JSON.stringify({ runs: [{ tool: { driver: { name: "ESLint" } }, results: [{ ruleId: "no-unused-vars", level: "error", message: { text: "x is unused" }, locations: [{ physicalLocation: { artifactLocation: { uri: "src/a.ts" }, region: { startLine: 3 } } }] }] }] });

describe("runner", () => {
  it("reads JUnit into file::name refs with status and duration", () => {
    expect(parseJunit(JUNIT)).toEqual([
      { ref: "tests/discount.test.ts::60 seats", file: "tests/discount.test.ts", name: "60 seats", status: "passed", durationMs: 12, message: null },
      { ref: "tests/discount.test.ts::annual plan", file: "tests/discount.test.ts", name: "annual plan", status: "failed", durationMs: 200, message: "expected 8%" },
      { ref: "tests/discount.test.ts::later", file: "tests/discount.test.ts", name: "later", status: "skipped", durationMs: 0, message: null },
    ]);
  });

  it("reads SARIF findings", () => {
    expect(parseSarif(SARIF)).toEqual([{ tool: "ESLint", ruleId: "no-unused-vars", level: "error", file: "src/a.ts", line: 3, message: "x is unused" }]);
  });

  it("plans the global flow then the type flow, once per stage and condition", () => {
    const config = projectConfigSchema.parse({ project: "p", global_flow: ["lint"], types: { ui: { flow: ["lint", { run: "e2e", conditions: ["dark", "mobile"] }, { check: "preview", manual: true }] } } });
    expect(planStages(config, "ui").map((s) => `${s.kind}:${s.stage}:${s.condition ?? "-"}`)).toEqual(["command:lint:-", "command:e2e:dark", "command:e2e:mobile", "manual:preview:-"]);
  });

  it("runs each command once per condition, with the condition's env, and reads its report", async () => {
    const dir = mkdtempSync(join(tmpdir(), "lastro-runner-"));
    writeFileSync(join(dir, "report.sh"), `echo "$LASTRO_CONDITION:$THEME" >> calls.txt\ncat > junit.xml <<'X'\n${JUNIT}\nX\n`);
    const config = projectConfigSchema.parse({
      project: "p",
      commands: { e2e: { run: "sh report.sh", report: { junit: "junit.xml" } } },
      conditions: { dark: { env: { THEME: "dark" } }, light: { env: { THEME: "light" } } },
      types: { ui: { flow: [{ run: "e2e", conditions: ["dark", "light"] }] } },
    });
    const result = await verify(dir, config, [{ code: "REQ-A", type: "ui", touches: [] }, { code: "REQ-B", type: "ui", touches: [] }], "dev");
    expect(result.stages.map((s) => `${s.requirement}:${s.condition}:${s.status}`)).toEqual(["REQ-A:dark:failed", "REQ-A:light:failed", "REQ-B:dark:failed", "REQ-B:light:failed"]);
    expect(result.stages[0]?.results).toHaveLength(3);
    expect(await Bun.file(join(dir, "calls.txt")).text()).toBe("dark:dark\nlight:light\n");
  });

  it("fingerprints touched files so a change makes the evidence stale", () => {
    const dir = mkdtempSync(join(tmpdir(), "lastro-tree-"));
    writeFileSync(join(dir, "a.ts"), "1");
    const before = treeHash(dir, ["a.ts"]);
    writeFileSync(join(dir, "a.ts"), "2");
    expect(treeHash(dir, ["a.ts"])).not.toBe(before);
  });
});
