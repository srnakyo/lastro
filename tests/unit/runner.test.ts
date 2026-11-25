import { describe, expect, it } from "bun:test";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
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

describe("evidence binding", () => {
  it("keeps the fingerprint when only files outside the touched ones change", () => {
    const dir = mkdtempSync(join(tmpdir(), "lastro-tree-"));
    writeFileSync(join(dir, "a.ts"), "1");
    writeFileSync(join(dir, "b.ts"), "1");
    const before = treeHash(dir, ["a.ts"]);
    writeFileSync(join(dir, "b.ts"), "2");
    expect(treeHash(dir, ["a.ts"])).toBe(before);
  });
});

describe("JUnit from each tool (REQ-9Z4NG)", () => {
  const fixture = (name: string) => readFileSync(join(import.meta.dir, "../fixtures/junit", `${name}.xml`), "utf8");
  const refs = (name: string, options = {}) => parseJunit(fixture(name), options).map((r) => `${r.ref} ${r.status}`);

  it("reads Vitest, Jest, Playwright, pytest and PHPUnit reports as file::test name", () => {
    expect(refs("vitest")).toEqual(["tests/cart.test.ts::cart > keeps items for 7 days passed", "tests/cart.test.ts::cart > drops items after 7 days failed"]);
    expect(refs("jest")).toEqual(["src/cart.test.js::cart keeps items for 7 days passed", "src/cart.test.js::cart drops items after 7 days skipped"]);
    expect(refs("playwright", { prefix: "tests/e2e/" })).toEqual(["tests/e2e/checkout.spec.ts::offers pix and card passed", "tests/e2e/checkout.spec.ts::shows the total before confirming failed"]);
    expect(refs("pytest")).toEqual(["tests/test_shipping.py::test_free_above_300 passed", "tests/test_shipping.py::test_charges_elsewhere failed"]);
    expect(refs("phpunit", { root: "/srv/app" })).toEqual(["tests/Unit/CouponTest.php::test_refuses_a_second_coupon passed", "tests/Unit/CouponTest.php::test_floors_the_total_at_shipping passed"]);
  });

  it("fails a stage with SARIF errors and keeps file, line and rule of each", async () => {
    const dir = mkdtempSync(join(tmpdir(), "lastro-sarif-"));
    // The linter exits 0 but reports an error: the stage still fails on the SARIF error.
    writeFileSync(join(dir, "eslint-output.json"), SARIF);
    const config = projectConfigSchema.parse({ project: "p", commands: { lint: { run: "cp eslint-output.json lint.sarif", report: { sarif: "lint.sarif" } } }, global_flow: ["lint"] });
    const result = await verify(dir, config, [{ code: "REQ-A", type: "none", touches: [] }], "dev");
    expect(result.stages[0]?.status).toBe("failed");
    expect(result.stages[0]?.findings[0]).toMatchObject({ file: "src/a.ts", line: 3, ruleId: "no-unused-vars" });
  });

  it("fails a condition whose setup fails, keeps its output, and still runs the other condition (REQ-8X1MF)", async () => {
    const dir = mkdtempSync(join(tmpdir(), "lastro-setup-"));
    const config = projectConfigSchema.parse({
      project: "p",
      commands: { e2e: { run: "echo ran" } },
      conditions: { broken: { setup: "echo seeding failed; exit 3" }, ok: { env: { THEME: "dark" } } },
      types: { ui: { flow: [{ run: "e2e", conditions: ["broken", "ok"] }] } },
    });
    const result = await verify(dir, config, [{ code: "REQ-A", type: "ui", touches: [] }], "dev");
    expect(result.stages.map((s) => [s.condition, s.status])).toEqual([["broken", "failed"], ["ok", "passed"]]);
    expect(result.stages[0]?.output).toContain("seeding failed");
    expect(result.stages[1]?.env).toEqual({ THEME: "dark" });
  });
});
