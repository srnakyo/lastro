import { describe, expect, it } from "bun:test";
import { allowedActors, blocksStep, computeBlockers, computeHallmark, criterionHash, isPending, type BlockerInput } from "@lastro/core";
import { projectConfigSchema } from "@lastro/shared";

const config = (requireFinal = false) =>
  projectConfigSchema.parse({ project: "p", approval: { require_final_source: requireFinal }, types: { calculation: { required: ["data_source", "examples"] } } });

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
  it("only a person approves, accepts and drops", () => {
    expect(allowedActors("specified", "approved")).toEqual(["user"]);
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

  it("holds approval back only when the project requires final sources", () => {
    const draft = input({ citations: [{ source: "SRC-AAAAA", anchor: "@a", found: true, final: false, machineTranscript: false, confirmed: false }] });
    expect(computeBlockers(draft, config(false)).some((b) => b.kind === "source_not_final")).toBe(false);
    expect(blocksStep(computeBlockers(draft, config(true)), "approved").map((b) => b.kind)).toEqual(["source_not_final"]);
    expect(blocksStep(computeBlockers(draft, config(true)), "specified")).toEqual([]);
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
