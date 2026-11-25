import type { Blocker, ProjectConfig } from "@lastro/shared";

export interface BlockerInput {
  type: string;
  fields: Record<string, unknown>;
  citations: { source: string; anchor: string; found: boolean; final: boolean; machineTranscript: boolean; confirmed: boolean }[];
  criteria: { code: string; tests: number }[];
  questions: { code: string; open: boolean; blocks: boolean }[];
  decisions: { code: string; status: "proposed" | "confirmed" | "overturned" }[];
  hasEvidence: boolean;
}

function isEmpty(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.keys(value).length === 0;
  return false;
}

function specBlockers(input: BlockerInput, config: ProjectConfig): Blocker[] {
  const type = config.types[input.type];
  if (!type) return [{ kind: "unknown_type", detail: input.type, blocks: "specified" }];
  return type.required
    .filter((field) => isEmpty(input.fields[field]))
    .map((field) => ({ kind: "missing_field", detail: field, blocks: "specified" }));
}

function originBlockers(input: BlockerInput, config: ProjectConfig): Blocker[] {
  return input.citations.flatMap((c): Blocker[] => {
    const where = `${c.source} ${c.anchor}`;
    const out: Blocker[] = [];
    if (!c.found) out.push({ kind: "invalid_quote", detail: where, blocks: "specified" });
    if (c.machineTranscript && !c.confirmed) out.push({ kind: "unconfirmed_transcript", detail: where, blocks: "specified" });
    if (config.approval.require_final_source && !c.final) out.push({ kind: "source_not_final", detail: c.source, blocks: "approved" });
    return out;
  });
}

/** Everything that holds a requirement back, each with the transition it blocks. */
export function computeBlockers(input: BlockerInput, config: ProjectConfig): Blocker[] {
  return [
    ...specBlockers(input, config),
    ...originBlockers(input, config),
    ...input.questions
      .filter((q) => q.open && q.blocks)
      .map((q): Blocker => ({ kind: "open_question", detail: q.code, blocks: "specified" })),
    ...input.decisions
      .filter((d) => d.status === "overturned")
      .map((d): Blocker => ({ kind: "decision_overturned", detail: d.code, blocks: "verified" })),
    ...input.criteria
      .filter((c) => c.tests === 0)
      .map((c): Blocker => ({ kind: "criterion_without_test", detail: c.code, blocks: "verified" })),
    ...(input.hasEvidence ? [] : [{ kind: "no_evidence", detail: "", blocks: "verified" } as Blocker]),
  ];
}

export function blocksStep(blockers: Blocker[], step: Blocker["blocks"]): Blocker[] {
  const order = ["specified", "approved", "verified"];
  return blockers.filter((b) => order.indexOf(b.blocks) <= order.indexOf(step));
}
