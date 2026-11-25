import type { Blocker, BlockerKind, Hallmark, LinkState } from "@lastro/shared";

const has = (blockers: Blocker[], ...kinds: BlockerKind[]) => blockers.some((b) => kinds.includes(b.kind));

/** Origin, spec, acceptance and evidence: the four links that back a requirement. */
export function computeHallmark(blockers: Blocker[], criteria: { tests: number; locked: boolean }[]): Hallmark {
  const origin: LinkState = has(blockers, "invalid_quote", "missing_source", "unconfirmed_transcript")
    ? "missing"
    : has(blockers, "source_not_final")
      ? "partial"
      : "ok";
  const spec: LinkState = has(blockers, "missing_field", "unknown_type", "open_question") ? "missing" : "ok";
  const tested = criteria.filter((c) => c.tests > 0).length;
  const acceptance: LinkState =
    criteria.length > 0 && criteria.every((c) => c.tests > 0 && c.locked) ? "ok" : tested > 0 ? "partial" : "missing";
  const evidence: LinkState = has(blockers, "no_evidence", "criterion_without_test", "decision_overturned") ? "missing" : "ok";
  return { origin, spec, acceptance, evidence };
}
