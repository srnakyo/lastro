import { describe, expect, it } from "bun:test";
import { allowedActors, blocksStep, computeBlockers, computeHallmark, criterionHash, isPending, type BlockerInput } from "@lastro/core";
import { projectConfigSchema } from "@lastro/shared";

const config = (requireFinal = false, autonomy: "auto" | "review" = "review", levels: string[] = []) =>
  projectConfigSchema.parse({ project: "p", autonomy, approval: { require_final_source: requireFinal }, types: { calculation: { required: ["data_source", "examples"], tests: { levels } } } });

const input = (patch: Partial<BlockerInput> = {}): BlockerInput => ({
  type: "calculation",
  fields: { data_source: "table", examples: [{ given: "a", expect: "b" }] },
  citations: [{ source: "SRC-AAAAA", anchor: "@a", found: true, final: true, machineTranscript: false, confirmed: false }],
  criteria: [{ code: "AC-1", tests: 1 }],
  questions: [],
  decisions: [],
  hasEvidence: true,
  ...patch,
});

describe("transitions", () => {
  it("only a person accepts and drops; approval is a person's, or Lastro's in automatic mode", () => {
    expect(allowedActors("specified", "approved")).toEqual(["user", "system"]);
    expect(allowedActors("specified", "approved")).not.toContain("agent");
    expect(allowedActors("delivered", "accepted")).toEqual(["user"]);
    expect(allowedActors("approved", "building")).toContain("agent");
    expect(allowedActors("building", "verified")).toEqual(["system"]);
    expect(allowedActors("captured", "verified")).toEqual([]);
  });

  it("pending is only what has not reached verified", () => {
    expect(["captured", "specified", "approved", "building", "reopened"].every((s) => isPending(s as never))).toBe(true);
    expect(["verified", "delivered", "accepted", "dropped"].some((s) => isPending(s as never))).toBe(false);
  });
});

describe("computeBlockers", () => {
  it("lists the required fields that are missing", () => {
    const blockers = computeBlockers(input({ fields: { data_source: "" } }), config());
    expect(blockers.filter((b) => b.kind === "missing_field").map((b) => b.detail)).toEqual(["data_source", "examples"]);
  });

  it("holds approval back for a draft source only in review mode with final sources required", () => {
    const draft = input({ citations: [{ source: "SRC-AAAAA", anchor: "@a", found: true, final: false, machineTranscript: false, confirmed: false }] });
    expect(computeBlockers(draft, config(false)).some((b) => b.kind === "source_not_final")).toBe(false);
    expect(blocksStep(computeBlockers(draft, config(true)), "approved").map((b) => b.kind)).toEqual(["source_not_final"]);
    expect(blocksStep(computeBlockers(draft, config(true)), "specified")).toEqual([]);
    expect(computeBlockers(draft, config(true, "auto")).some((b) => b.kind === "source_not_final")).toBe(false);
  });

  it("holds approval back until every criterion has a test, at every level the type asks", () => {
    expect(blocksStep(computeBlockers(input({ criteria: [{ code: "AC-1", tests: 0, testRefs: [] }] }), config()), "approved").map((b) => b.kind)).toEqual(["criterion_without_test"]);
    const unitOnly = input({ criteria: [{ code: "AC-1", tests: 1, testRefs: ["tests/unit/total.test.ts::sums"] }] });
    expect(computeBlockers(unitOnly, config(false, "review", ["unit", "e2e"])).filter((b) => b.kind === "missing_test_level")).toEqual([{ kind: "missing_test_level", detail: "e2e", blocks: "approved" }]);
    const both = input({ criteria: [{ code: "AC-1", tests: 2, testRefs: ["tests/unit/total.test.ts::sums", "tests/e2e/checkout.spec.ts::shows the total"] }] });
    expect(computeBlockers(both, config(false, "review", ["unit", "e2e"])).some((b) => b.kind === "missing_test_level")).toBe(false);
  });

  it("asks a person to confirm quotes taken from machine transcripts", () => {
    const transcript = input({ citations: [{ source: "SRC-AAAAA", anchor: "@t00:34", found: true, final: true, machineTranscript: true, confirmed: false }] });
    expect(computeBlockers(transcript, config()).map((b) => b.kind)).toContain("unconfirmed_transcript");
  });

  it("blocks only on open blocking questions", () => {
    const blockers = computeBlockers(input({ questions: [{ code: "Q-AAAAA", open: true, blocks: false }, { code: "Q-BBBBB", open: true, blocks: true }, { code: "Q-CCCCC", open: false, blocks: true }] }), config());
    expect(blockers.filter((b) => b.kind === "open_question").map((b) => b.detail)).toEqual(["Q-BBBBB"]);
  });

  it("an unknown type cannot be specified", () => {
    expect(computeBlockers(input({ type: "nope" }), config())[0]).toEqual({ kind: "unknown_type", detail: "nope", blocks: "specified" });
  });
});

describe("computeHallmark", () => {
  it("is fully backed only with locked tests and evidence", () => {
    expect(computeHallmark([], [{ tests: 1, locked: true }])).toEqual({ origin: "ok", spec: "ok", acceptance: "ok", evidence: "ok" });
    const draft = computeHallmark([{ kind: "source_not_final", detail: "", blocks: "approved" }, { kind: "no_evidence", detail: "", blocks: "verified" }], [{ tests: 1, locked: false }]);
    expect(draft).toEqual({ origin: "partial", spec: "ok", acceptance: "partial", evidence: "missing" });
  });
});

describe("criterionHash", () => {
  it("does not depend on test order but changes with the text", async () => {
    expect(await criterionHash("a", ["x", "y"])).toBe(await criterionHash("a", ["y", "x"]));
    expect(await criterionHash("a", ["x"])).not.toBe(await criterionHash("b", ["x"]));
  });
});
