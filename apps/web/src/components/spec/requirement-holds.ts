import type { BlockerKind, RequirementStatus } from "@lastro/shared";

export interface Hold {
  kind: BlockerKind;
  detail: string;
  blocks: "specified" | "approved" | "verified";
}

interface HeldRow {
  code: string;
  status: RequirementStatus;
  holds: Hold[];
}

/** The step a requirement is heading to, or null once it is verified. */
export function nextStepOf(status: RequirementStatus): Hold["blocks"] | null {
  if (status === "captured") return "specified";
  if (status === "specified") return "approved";
  if (status === "approved" || status === "building" || status === "reopened") return "verified";
  return null;
}

/** Only what holds the next step: evidence is not missing yet for something nobody approved. */
export function holdsForNextStep(row: HeldRow): Hold[] {
  const step = nextStepOf(row.status);
  if (!step) return [];
  const relevant = row.status === "captured" ? ["specified", "approved"] : [step];
  return row.holds.filter((h) => relevant.includes(h.blocks));
}

export const readyToApprove = (row: HeldRow) => row.status === "specified" && holdsForNextStep(row).length === 0;

export interface UnblockSummary {
  /** Sources not final, with how many requirements each holds back. */
  sources: { source: string; count: number }[];
  questions: { codes: string[]; requirements: number };
  missingFields: number;
  invalidQuotes: number;
  /** Requirements waiting for the agent's tests (a criterion without one, or a level the type asks for). */
  needsTests: number;
  ready: string[];
  noEvidence: number;
}

/** What unlocks a list of requirements, counted once per requirement. */
export function unblockSummary(rows: HeldRow[]): UnblockSummary {
  const sources = new Map<string, number>();
  const questions = new Set<string>();
  let questionReqs = 0;
  let missingFields = 0;
  let invalidQuotes = 0;
  let noEvidence = 0;
  let needsTests = 0;
  for (const row of rows) {
    const holds = holdsForNextStep(row);
    const kinds = new Set(holds.map((h) => h.kind));
    for (const source of new Set(holds.filter((h) => h.kind === "source_not_final").map((h) => h.detail))) sources.set(source, (sources.get(source) ?? 0) + 1);
    if (kinds.has("open_question")) {
      questionReqs += 1;
      for (const h of holds) if (h.kind === "open_question") questions.add(h.detail);
    }
    if (kinds.has("missing_field")) missingFields += 1;
    if (kinds.has("invalid_quote")) invalidQuotes += 1;
    if (kinds.has("no_evidence")) noEvidence += 1;
    if (kinds.has("criterion_without_test") || kinds.has("missing_test_level")) needsTests += 1;
  }
  return {
    sources: [...sources.entries()].map(([source, count]) => ({ source, count })).sort((a, b) => b.count - a.count),
    questions: { codes: [...questions].sort(), requirements: questionReqs },
    missingFields,
    invalidQuotes,
    needsTests,
    ready: rows.filter(readyToApprove).map((r) => r.code),
    noEvidence,
  };
}
