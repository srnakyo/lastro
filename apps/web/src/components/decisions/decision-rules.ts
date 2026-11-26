import type { listDecisions } from "@/fns/decisions";

export type DecisionItem = Awaited<ReturnType<typeof listDecisions>>[number];

/** Where a decision waiting for a person sits: theirs to check, the agent's choice, or the agent's assumption. */
export type WaitingGroup = "person" | "agent" | "assumption";

export function groupOf(d: DecisionItem): WaitingGroup {
  if (!d.decidedByAgent) return "person";
  return d.kind === "assumption" ? "assumption" : "agent";
}

/** Requirements that overturning would send back: done ones go back to building or reopen. */
export function reopenedByOverturn(d: DecisionItem): number {
  return d.requirements.filter((r) => r.status === "verified" || r.status === "delivered" || r.status === "accepted").length;
}

const words = (text: string) =>
  new Set(
    text
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length >= 3),
  );

/**
 * Another live decision this one seems to repeat: every meaningful word of the shorter one appears in the
 * other. Only a hint for the person, who decides with "Repeats another".
 */
export function likelyRepeatOf(d: DecisionItem, all: DecisionItem[]): DecisionItem | null {
  const mine = words(d.text);
  if (mine.size === 0) return null;
  let best: { item: DecisionItem; score: number } | null = null;
  for (const other of all) {
    if (other.code === d.code || other.status === "overturned") continue;
    const theirs = words(other.text);
    if (theirs.size === 0) continue;
    const [small, large] = mine.size <= theirs.size ? [mine, theirs] : [theirs, mine];
    if (![...small].every((w) => large.has(w))) continue;
    const score = small.size / large.size + (other.status === "confirmed" ? 1 : 0);
    if (!best || score > best.score) best = { item: other, score };
  }
  return best?.item ?? null;
}
