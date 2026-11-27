import { describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { coverageFindings, exampleNumbers, examplesFindings, hasNumber, parseLcov } from "@lastro/runner";
import { projectConfigSchema } from "@lastro/shared";

const LCOV = ["SF:/repo/src/cart.ts", "FN:1,keep", "FN:9,drop", "FNDA:3,keep", "FNDA:0,drop", "FNF:2", "FNH:1", "LF:20", "LH:15", "end_of_record", ""].join("\n");
/** Bun writes only the function totals, and every line with its hits. */
const BUN = ["SF:src/cart.ts", "FNF:3", "FNH:2", "DA:1,4", "DA:2,0", "DA:3,0", "DA:7,2", "DA:9,0", "LF:5", "LH:2", "end_of_record", ""].join("\n");

describe("examples in the tests", () => {
  it("takes the numbers an example states", () => {
    expect(exampleNumbers({ given: "R$ 301 to Recife", expect: "regular shipping" })).toEqual(["301"]);
    expect(exampleNumbers({ given: "items added 6 days ago", expect: "still in the cart after 7 days" })).toEqual(["6", "7"]);
  });

  it("leaves out numbers inside codes, names and conditions, and reads thousands as one number", () => {
    expect(exampleNumbers({ given: "REQ-7V6KE opened, the paragraph of 05-lifecycle.md", expect: "the quote highlighted" })).toEqual([]);
    expect(exampleNumbers({ given: "stage e2e with conditions [dark-theme, zoom-125]", expect: "2 runs" })).toEqual(["2"]);
    expect(exampleNumbers({ given: "10,000 IDs generated", expect: "none repeats; 1,5 and 2.5 kept" })).toEqual(["10000", "1.5", "2.5"]);
    expect(exampleNumbers({ given: "answers in 200ms", expect: "8% off" })).toEqual(["200", "8"]);
  });

  it("finds a number however the test writes it", () => {
    expect(hasNumber("for (let i = 0; i < 10_000; i++)", "10000")).toBe(true);
    expect(hasNumber("expect(total).toBe(1.5)", "1.5")).toBe(true);
    expect(hasNumber("expect(total).toBe(115)", "15")).toBe(false);
  });

  it("names an example whose numbers no test file uses", () => {
    const repo = mkdtempSync(join(tmpdir(), "lastro-q-"));
    mkdirSync(join(repo, "tests"));
    writeFileSync(join(repo, "tests/shipping.test.ts"), "it('free above 300', () => expect(ship(301, 'SP')).toBe(0));");
    const target = { code: "REQ-1", type: "calculation", touches: [], testFiles: ["tests/shipping.test.ts"], examples: [{ given: "R$ 301 to Curitiba", expect: "shipping R$ 0" }, { given: "R$ 299 to Curitiba", expect: "shipping R$ 25" }] };
    const found = examplesFindings(repo, target);
    expect(found).toHaveLength(1);
    expect(found[0]?.message).toContain("299, 25");
  });
});

describe("coverage of the touched files", () => {
  it("reads LCOV functions and lines, matching repository paths to absolute ones", () => {
    const [file] = parseLcov(LCOV);
    expect(file?.functions).toEqual([{ name: "keep", hits: 3 }, { name: "drop", hits: 0 }]);
    expect([file?.linesFound, file?.linesHit]).toEqual([20, 15]);
  });

  it("names the routines no test runs, against the type's threshold", () => {
    const config = projectConfigSchema.parse({ project: "p", types: { behavior: { tests: { levels: [], coverage: { functions: 100, lines: 70 } } } } });
    const target = { code: "REQ-1", type: "behavior", touches: ["src/cart.ts", "tests/unit/cart.test.ts", "README.md"] };
    const found = coverageFindings(config, target, parseLcov(LCOV));
    expect(found.map((f) => [f.ruleId, f.file])).toEqual([["coverage-functions", "src/cart.ts"]]);
    expect(found[0]?.message).toContain("not run: drop");
  });

  it("reads Bun's report, which has no function names, and points at the lines no test runs", () => {
    const [file] = parseLcov(BUN);
    expect([file?.functionsFound, file?.functionsHit, file?.linesFound, file?.linesHit]).toEqual([3, 2, 5, 2]);
    expect(file?.uncoveredLines).toEqual([2, 3, 9]);
    const config = projectConfigSchema.parse({ project: "p", types: { behavior: { tests: { levels: [], coverage: { functions: 100 } } } } });
    const found = coverageFindings(config, { code: "REQ-1", type: "behavior", touches: ["src/cart.ts"] }, parseLcov(BUN));
    expect(found.map((f) => f.message)).toEqual(["66% of the functions run in tests (wanted 100%); lines not run: 2-3, 9"]);
  });

  it("does not ask coverage of the files the project excludes, which still count as touched", () => {
    const config = projectConfigSchema.parse({ project: "p", tests: { coverage_exclude: ["packages/cli/src/commands/**"] }, types: { behavior: { tests: { levels: [], coverage: { functions: 100 } } } } });
    const touches = ["packages/cli/src/commands/gate.ts", "src/cart.ts"];
    expect(coverageFindings(config, { code: "REQ-1", type: "behavior", touches }, parseLcov(BUN)).map((f) => f.file)).toEqual(["src/cart.ts"]);
    expect(coverageFindings(config, { code: "REQ-1", type: "behavior", touches: ["packages/cli/src/commands/gate.ts"] }, parseLcov(BUN))).toEqual([]);
  });

  it("says when the report is missing or a touched file never ran", () => {
    const config = projectConfigSchema.parse({ project: "p", types: { behavior: { tests: { levels: [], coverage: { lines: 80 } } } } });
    expect(coverageFindings(config, { code: "REQ-1", type: "behavior", touches: ["src/cart.ts"] }, null)[0]?.ruleId).toBe("coverage-report");
    expect(coverageFindings(config, { code: "REQ-1", type: "behavior", touches: ["src/other.ts"] }, parseLcov(LCOV))[0]?.ruleId).toBe("coverage-missing");
  });
});
