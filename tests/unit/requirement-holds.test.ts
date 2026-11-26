import { describe, expect, it } from "bun:test";
import { holdsForNextStep, readyToApprove, unblockSummary, type Hold } from "../../apps/web/src/components/spec/requirement-holds";

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
});
