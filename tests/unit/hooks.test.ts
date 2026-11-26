import { describe, expect, it } from "bun:test";
import { contextText, type AgentContext } from "../../packages/cli/src/hooks/context-text";
import { guardToolCall, touchedFile } from "../../packages/cli/src/hooks/guard";
import { stopDecision } from "../../packages/cli/src/hooks/stop";

const ROOT = "/repo";
const call = (tool_name: string, tool_input: Record<string, unknown>) => ({ tool_name, tool_input, cwd: "/repo/src" });
const LOCKED = [{ file: "tests/discount.test.ts", criteria: ["REQ-K7Q2M AC-1"] }];

describe("pre-tool-use guard", () => {
  it("refuses human commands in Bash and lets the rest through", () => {
    expect(guardToolCall(call("Bash", { command: "lastro approve REQ-K7Q2M --yes" }), ROOT, [])).toMatchObject({ allow: false });
    expect(guardToolCall(call("Bash", { command: "cd x && lastro decision confirm DEC-AB123" }), ROOT, [])).toMatchObject({ allow: false });
    expect(guardToolCall(call("Bash", { command: "lastro import --dry-run" }), ROOT, [])).toEqual({ allow: true });
    expect(guardToolCall(call("Bash", { command: "lastro verify REQ-K7Q2M" }), ROOT, [])).toEqual({ allow: true });
  });

  it("refuses edits to the .lastro/ export but not to its .out folder", () => {
    expect(guardToolCall(call("Edit", { file_path: "/repo/.lastro/requirements/REQ-K7Q2M.yml" }), ROOT, [])).toMatchObject({ allow: false });
    expect(guardToolCall(call("Write", { file_path: "../.lastro/.out/x.json" }), ROOT, [])).toEqual({ allow: true });
  });

  it("refuses edits to tests of locked criteria, resolving relative paths from the cwd", () => {
    const verdict = guardToolCall(call("Edit", { file_path: "../tests/discount.test.ts" }), ROOT, LOCKED);
    expect(verdict).toMatchObject({ allow: false });
    expect(verdict.allow ? "" : verdict.reason).toContain("REQ-K7Q2M AC-1");
    expect(guardToolCall(call("Edit", { file_path: "/repo/src/discount.ts" }), ROOT, LOCKED)).toEqual({ allow: true });
  });

  it("reports the touched file relative to the repository", () => {
    expect(touchedFile(call("MultiEdit", { file_path: "discount.ts" }), ROOT)).toBe("src/discount.ts");
    expect(touchedFile(call("Bash", { command: "ls" }), ROOT)).toBeNull();
  });
});

describe("stop decision", () => {
  const red = { "REQ-A": { pass: false, status: "building", agentCanFix: ["unit failed"], needsPerson: [] } };
  it("blocks while the agent can fix a requirement in building", () => {
    const verdict = stopDecision(red, 0, 3, null);
    expect(verdict).toMatchObject({ stop: false });
    expect(verdict.stop ? "" : verdict.reason).toContain("REQ-A: unit failed");
  });
  it("lets the agent stop when only a person can move things, when paused, or after the block limit", () => {
    expect(stopDecision({ "REQ-A": { pass: false, status: "building", agentCanFix: [], needsPerson: ["manual stage preview not signed"] } }, 0, 3, null)).toEqual({ stop: true });
    expect(stopDecision(red, 0, 3, "waiting for the client")).toMatchObject({ stop: true });
    expect(stopDecision(red, 3, 3, null)).toMatchObject({ stop: true });
  });
});

describe("session context", () => {
  it("puts the active requirements, locks and invariants in front of the agent", () => {
    const ctx: AgentContext = {
      project: "billing", rules: ["Work only on approved requirements."],
      active: [{ code: "REQ-A", title: "Discount", status: "building", type: "calculation", statement: "8% above 50 seats", where: null, criteria: [{ code: "AC-1", text: "60 seats → 8%", tests: ["t.ts::60"], locked: true }], blockers: [] }],
      pending: [], glossary: [{ term: "seat", means: "an active user", note: null }], invariants: [{ code: "INV-1", text: "Totals never negative" }], design: null, decisions: [], openQuestions: [],
    };
    const text = contextText(ctx);
    expect(text).toContain("### REQ-A (building, calculation): Discount");
    expect(text).toContain("AC-1 [locked]");
    expect(text).toContain("INV-1: Totals never negative");
  });

  it("tells the agent the test rules and which requirements wait for its tests", () => {
    const ctx: AgentContext = {
      project: "billing", rules: [], active: [], pending: [], glossary: [], invariants: [], design: null, decisions: [], openQuestions: [],
      tests: { autonomy: "auto", redFirst: true, examplesInTests: true, coverageReport: "coverage/lcov.info", types: { ui: { levels: ["unit", "e2e"], coverage: { functions: 90 } }, content: { levels: [], coverage: null } } },
      needTests: [{ code: "REQ-B", title: "Invoice line", type: "ui", missing: ["missing_test_level e2e"] }],
    };
    const text = contextText(ctx);
    expect(text).toContain("- Red first: a test Lastro never saw fail does not count.");
    expect(text).toContain("- ui: tests at unit, e2e; coverage of the touched files: functions ≥ 90%");
    expect(text).not.toContain("- content:");
    expect(text).toContain("## Waiting for your tests\n- REQ-B (ui): Invoice line: missing_test_level e2e");
  });
});
