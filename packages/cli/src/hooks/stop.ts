export interface GateState {
  pass: boolean;
  agentCanFix: string[];
  needsPerson: string[];
  status?: string;
}

export type StopVerdict = { stop: true; note?: string } | { stop: false; reason: string };

/**
 * Whether the agent may end its turn. It may not while something it can fix holds a requirement in
 * building, unless it paused with a reason or it was already blocked `maxBlocks` times in a row.
 */
export function stopDecision(gates: Record<string, GateState>, blocksSoFar: number, maxBlocks: number, paused: string | null): StopVerdict {
  if (paused) return { stop: true, note: `paused: ${paused}` };
  const fixable = Object.entries(gates).filter(([, g]) => g.status === "building" && g.agentCanFix.length > 0);
  if (fixable.length === 0) return { stop: true };
  if (blocksSoFar >= maxBlocks) return { stop: true, note: `gate still red after ${blocksSoFar} attempts; the developer decides` };
  const lines = fixable.map(([code, g]) => `- ${code}: ${g.agentCanFix.join("; ")}`);
  return {
    stop: false,
    reason: [
      "Lastro gate is red for requirements you are building:",
      ...lines,
      "Fix them and run lastro_verify. If you cannot go on (missing information, needs a person), call lastro_pause with the reason, or ask with lastro_ask.",
    ].join("\n"),
  };
}
