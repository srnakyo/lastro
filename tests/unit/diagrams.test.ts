import { describe, expect, it } from "bun:test";
import { lifecycleDiagram, qaFlowDiagram, traceabilityDiagram } from "@lastro/docs";
import { projectConfigSchema } from "@lastro/shared";

describe("diagrams", () => {
  it("draws a criterion without a test as a gap labelled 'no test' (REQ-M4R7W)", () => {
    const source = traceabilityDiagram(
      [{ code: "REQ-A", title: "Discount", finalSource: false, citations: [{ source: "SRC-1", anchor: "@b.md#d", found: true }], criteria: [{ code: "AC-1", tests: ["t.ts::one"] }, { code: "AC-2", tests: [] }] }],
      { "t.ts::one": { status: "passed", runId: "run-1", commit: "abc1234" } },
    );
    expect(source).toContain('["AC-2 · no test"]:::failed');
    expect(source).toContain("source not final");
    expect(source).toContain('(["run abc1234"]):::passed');
  });

  it("marks the transition to approved as blocked with the reason, and shows the counts (REQ-N7T0X)", () => {
    const source = lifecycleDiagram([{ from: "specified", to: "approved", actors: ["user"] }], { specified: 4 }, { "specified>approved": ["source not final"] });
    expect(source).toContain("specified: specified (4)");
    expect(source).toContain("specified --> approved: blocked: source not final");
  });

  it("shows 15 specified requirements of a package and the move to approved blocked by a source not final (REQ-N7T0X)", () => {
    const edges = [{ from: "captured", to: "specified", actors: ["system"] }, { from: "specified", to: "approved", actors: ["user", "system"] }];
    const source = lifecycleDiagram(edges, { captured: 0, specified: 15 }, { "specified>approved": ["source not final"] });
    expect(source).toContain("specified: specified (15)");
    expect(source).toContain("specified --> approved: blocked: source not final");
    expect(source).not.toContain("captured --> specified: blocked");
  });

  it("colors each stage and condition by its latest result (REQ-R6Y9A)", () => {
    const config = projectConfigSchema.parse({
      project: "p",
      types: { ui: { flow: [{ run: "e2e", conditions: ["light-theme", "dark-theme"] }, { check: "preview", manual: true }] } },
    });
    const source = qaFlowDiagram(config, "ui", { "e2e|light-theme": "passed", "e2e|dark-theme": "failed" });
    expect(source).toContain('["e2e · dark-theme"]:::failed');
    expect(source).toContain('["e2e · light-theme"]:::passed');
    expect(source).toContain('{{"preview"}}:::manual');
  });
});
