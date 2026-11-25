const WHO: Record<string, string> = { user: "person", agent: "agent", system: "Lastro" };

/** The lifecycle as a state diagram, with how many requirements sit in each state and who moves each edge. */
export function lifecycleDiagram(edges: { from: string; to: string; actors: string[] }[], counts: Record<string, number>): string {
  // Dropping is possible from the early states; one edge stands for all of them to keep the picture readable.
  const shown = edges.filter((e) => e.to !== "dropped" || e.from === "specified");
  const states = [...new Set(shown.flatMap((e) => [e.from, e.to]))];
  const lines = ["stateDiagram-v2", "  direction LR", "  [*] --> captured"];
  for (const s of states) lines.push(`  ${s}: ${s} (${counts[s] ?? 0})`);
  for (const e of shown) lines.push(`  ${e.from} --> ${e.to}: ${e.actors.map((a) => WHO[a] ?? a).join(" / ")}`);
  return lines.join("\n");
}
