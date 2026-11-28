export interface GateState {
  pass: boolean;
  agentCanFix: string[];
  needsPerson: string[];
  status?: string;
}

export type StopVerdict = { stop: true; note?: string } | { stop: false; reason: string };

const SHARED_SHOWN = 8;
const REQUIREMENTS_SHOWN = 12;
const ITEMS_SHOWN = 4;

const more = (n: number, what: string) => (n > 0 ? [`- and ${n} more ${what}`] : []);
const names = (codes: string[]) => `${codes.length}: ${codes.slice(0, 3).join(", ")}${codes.length > 3 ? ", …" : ""}`;

/**
 * What holds the requirements, short enough to read on every turn: an item many requirements share (a lint
 * finding, a shared file's coverage) once, with how many it holds; then each requirement's own items, capped.
 */
export function gateSummary(fixable: [string, GateState][]): string[] {
  const owners = new Map<string, string[]>();
  for (const [code, g] of fixable) for (const item of new Set(g.agentCanFix)) owners.set(item, [...(owners.get(item) ?? []), code]);
  const shared = [...owners.entries()].filter(([, codes]) => codes.length > 1).sort((a, b) => b[1].length - a[1].length);
  const own = fixable
    .map(([code, g]) => [code, [...new Set(g.agentCanFix)].filter((item) => owners.get(item)?.length === 1)] as const)
    .filter(([, items]) => items.length > 0);
  const lines: string[] = [];
  if (shared.length) lines.push("In several requirements:", ...shared.slice(0, SHARED_SHOWN).map(([item, codes]) => `- ${item} (${names(codes)})`), ...more(shared.length - SHARED_SHOWN, "shared items"));
  if (own.length) {
    lines.push("Per requirement:");
    for (const [code, items] of own.slice(0, REQUIREMENTS_SHOWN)) lines.push(`- ${code}: ${items.slice(0, ITEMS_SHOWN).join("; ")}${items.length > ITEMS_SHOWN ? `; and ${items.length - ITEMS_SHOWN} more` : ""}`);
    lines.push(...more(own.length - REQUIREMENTS_SHOWN, "requirements"));
  }
  return lines;
}

/**
 * Whether the agent may end its turn. It may not while something it can fix holds a requirement in
 * building, unless it paused with a reason or it was already blocked `maxBlocks` times in a row.
 */
export function stopDecision(gates: Record<string, GateState>, blocksSoFar: number, maxBlocks: number, paused: string | null): StopVerdict {
  if (paused) return { stop: true, note: `paused: ${paused}` };
  const fixable = Object.entries(gates).filter(([, g]) => g.status === "building" && g.agentCanFix.length > 0);
  if (fixable.length === 0) return { stop: true };
  if (blocksSoFar >= maxBlocks) return { stop: true, note: `gate still red after ${blocksSoFar} attempts; the developer decides` };
  return {
    stop: false,
    reason: [
      `Lastro gate is red for ${fixable.length} requirement${fixable.length === 1 ? "" : "s"} you are building:`,
      ...gateSummary(fixable),
      "These come from the last lastro_verify of each requirement: after changing code, verify again to refresh them (lastro gate lists them all).",
      "If you cannot go on (missing information, needs a person), call lastro_pause with the reason, or ask with lastro_ask.",
    ].join("\n"),
  };
}
