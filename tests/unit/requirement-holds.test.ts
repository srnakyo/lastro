import { describe, expect, it } from "bun:test";
import { DEFAULT_TEST_LEVELS, testLevel } from "@lastro/shared";
import { holdsForNextStep, readyToApprove, unblockSummary, type Hold } from "../../apps/web/src/components/spec/requirement-holds";
import { orderedLevels } from "../../apps/web/src/lib/type-label";

const notFinal: Hold = { kind: "source_not_final", detail: "SRC-AAAAA", blocks: "approved" };
const noEvidence: Hold = { kind: "no_evidence", detail: "", blocks: "verified" };
const question: Hold = { kind: "open_question", detail: "Q-AAAAA", blocks: "specified" };

describe("what holds a requirement on the requirements list", () => {
  it("shows only what holds the next step: no evidence is not missing before approval", () => {
    expect(holdsForNextStep({ code: "REQ-1", status: "specified", holds: [notFinal, noEvidence] })).toEqual([notFinal]);
    expect(holdsForNextStep({ code: "REQ-1", status: "building", holds: [notFinal, noEvidence] })).toEqual([noEvidence]);
    expect(holdsForNextStep({ code: "REQ-1", status: "verified", holds: [noEvidence] })).toEqual([]);
  });

  it("counts what unlocks the list once per requirement, and what is ready for approval", () => {
    const rows = [
      { code: "REQ-1", status: "specified" as const, holds: [notFinal, noEvidence] },
      { code: "REQ-2", status: "specified" as const, holds: [notFinal] },
      { code: "REQ-3", status: "specified" as const, holds: [noEvidence] },
      { code: "REQ-4", status: "captured" as const, holds: [question] },
    ];
    const s = unblockSummary(rows);
    expect(s.sources).toEqual([{ source: "SRC-AAAAA", count: 2 }]);
    expect(s.questions).toEqual({ codes: ["Q-AAAAA"], requirements: 1 });
    expect(s.ready).toEqual(["REQ-3"]);
    expect(readyToApprove(rows[0] as (typeof rows)[number])).toBe(false);
  });

  it("counts the requirements waiting for the agent's tests, whether a criterion or a level is missing", () => {
    const untested: Hold = { kind: "criterion_without_test", detail: "AC-1", blocks: "approved" };
    const level: Hold = { kind: "missing_test_level", detail: "e2e", blocks: "approved" };
    const s = unblockSummary([
      { code: "REQ-1", status: "specified", holds: [untested, level] },
      { code: "REQ-2", status: "specified", holds: [level] },
      { code: "REQ-3", status: "building", holds: [noEvidence] },
    ]);
    expect([s.needsTests, s.ready]).toEqual([2, []]);
  });
});

describe("test levels", () => {
  it("classifies by folder first, whatever order the levels are stored in", () => {
    const stored = { unit: DEFAULT_TEST_LEVELS.unit as string[], e2e: DEFAULT_TEST_LEVELS.e2e as string[], integration: DEFAULT_TEST_LEVELS.integration as string[] };
    expect(testLevel("tests/integration/runs.test.ts::records a run", stored)).toBe("integration");
    expect(testLevel("tests/e2e/dashboard.spec.ts::signs in", stored)).toBe("e2e");
    expect(testLevel("tests/unit/text.test.ts::slugs", stored)).toBe("unit");
    expect(testLevel("src/cart/cart.test.ts::keeps items", stored)).toBe("unit");
    expect(testLevel("docs/readme.md", stored)).toBeNull();
  });
});

describe("order of test levels on screen", () => {
  it("goes from unit to end to end whatever order the database kept, with a project's own levels last", () => {
    expect(orderedLevels(["e2e", "unit", "integration"])).toEqual(["unit", "integration", "e2e"]);
    expect(orderedLevels(["visual", "e2e", "contract", "unit"])).toEqual(["unit", "e2e", "contract", "visual"]);
  });
});
