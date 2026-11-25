const WHO: Record<string, string> = { user: "person", agent: "agent", system: "Lastro" };

/**
 * The lifecycle as a state diagram (REQ-N7T0X): how many requirements sit in each state, who moves each
 * edge, and, for an edge something holds back, "blocked" with the reasons.
 */
export function lifecycleDiagram(edges: { from: string; to: string; actors: string[] }[], counts: Record<string, number>, blocked: Record<string, string[]> = {}): string {
  // Dropping is possible from the early states; one edge stands for all of them to keep the picture readable.
  const shown = edges.filter((e) => e.to !== "dropped" || e.from === "specified");
  const states = [...new Set(shown.flatMap((e) => [e.from, e.to]))];
  const lines = ["stateDiagram-v2", "  direction LR", "  [*] --> captured"];
  for (const s of states) lines.push(`  ${s}: ${s} (${counts[s] ?? 0})`);
  for (const e of shown) {
    const reasons = blocked[`${e.from}>${e.to}`] ?? [];
    const who = e.actors.map((a) => WHO[a] ?? a).join(" / ");
    lines.push(`  ${e.from} --> ${e.to}: ${reasons.length ? `blocked: ${reasons.join(", ").replace(/:/g, " ")}` : who}`);
  }
  const held = [...new Set(Object.keys(blocked).filter((k) => (blocked[k] ?? []).length).map((k) => k.split(">")[0] ?? ""))];
  if (held.length) lines.push("  classDef held fill:#e11d4814,stroke:#e11d48,color:#e11d48", ...held.map((s) => `  class ${s} held`));
  return lines.join("\n");
}
