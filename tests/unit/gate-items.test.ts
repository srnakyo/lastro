import { describe, expect, it } from "bun:test";
import { gateText, type GateItem } from "@lastro/core";

describe("gateText, the English line of each gate item", () => {
  const cases: [string, GateItem, string][] = [
    ["a stage that did not pass", { kind: "stage", stage: "unit", status: "failed" }, "unit failed"],
    ["a finding of a stage", { kind: "finding", stage: "lint", text: "src/a.ts:3 no-var Unexpected var" }, "lint: src/a.ts:3 no-var Unexpected var"],
    ["a manual stage nobody signed", { kind: "manual", stage: "preview" }, "manual stage preview not signed"],
    ["a criterion without a test", { kind: "no_test", criterion: "AC-1" }, "AC-1 has no test"],
    ["a test that did not pass", { kind: "test", criterion: "AC-1", test: "a.test.ts::x", status: "not run" }, "AC-1 a.test.ts::x not run"],
    ["a regression test", { kind: "regression", incident: "INC-AB234", test: "a.test.ts::x", status: "failed" }, "regression test of INC-AB234: a.test.ts::x failed"],
    ["an invariant test", { kind: "invariant", invariant: "INV-1", test: "a.test.ts::x", status: "failed" }, "invariant INV-1: a.test.ts::x failed"],
    ["a locked test that changed", { kind: "locked_changed", file: "a.test.ts", criterion: "AC-1" }, "locked test changed: a.test.ts (AC-1); revert it, or a person unlocks the criteria"],
    ["a requirement without examples", { kind: "no_examples" }, "examples: the requirement has no example of the requester"],
    ["examples without enough passing tests", { kind: "examples_short", examples: 3, passing: 1 }, "examples: 3 examples, 1 linked tests passing"],
    ["a check Lastro does not implement", { kind: "unknown_check", check: "perf" }, "check perf has no automatic implementation: make it manual (signed) or a command"],
    ["a blocker with its detail", { kind: "blocker", blocker: "decision_overturned", detail: "DEC-AB234" }, "decision_overturned DEC-AB234"],
    ["a blocker without detail", { kind: "blocker", blocker: "no_evidence", detail: "" }, "no_evidence"],
    ["a test that never failed", { kind: "never_red", test: "a.test.ts::x" }, "a.test.ts::x never failed on a Lastro run: write the test before the code, see it fail, then make it pass"],
  ];

  for (const [name, item, text] of cases) {
    it(`writes ${name}`, () => {
      expect(gateText(item)).toBe(text);
    });
  }
});
