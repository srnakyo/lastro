interface AgentContext {
  project: string;
  rules: string[];
  active: { code: string; title: string; status: string; type: string; statement: string; where: string | null; criteria: { code: string; text: string; tests: string[]; locked: boolean }[]; blockers: { kind: string; detail: string; blocks: string }[] }[];
  pending: { code: string; title: string; status: string }[];
  glossary: { term: string; means: string; note: string | null }[];
  invariants: { code: string; text: string }[];
  design: { components: unknown; forbidden: string[]; palette: unknown } | null;
  decisions: { code: string; text: string; status: string; kind: string }[];
  openQuestions: { code: string; text: string; blocks: boolean }[];
}

const MAX = 12_000;

/** The project context as Markdown for the agent: what to work on and the rules it must keep. */
export function contextText(ctx: AgentContext): string {
  const parts = [
    `# Lastro: project ${ctx.project}`,
    ctx.rules.map((r) => `- ${r}`).join("\n"),
    "## Active requirements",
    ctx.active.length === 0
      ? "None approved yet. Do not start implementing; propose requirements or ask."
      : ctx.active
          .map((r) =>
            [
              `### ${r.code} (${r.status}, ${r.type}): ${r.title}`,
              r.statement,
              r.where ? `Where: ${r.where}` : "",
              ...r.criteria.map((c) => `- ${c.code}${c.locked ? " [locked]" : ""}: ${c.text}${c.tests.length ? ` (tests: ${c.tests.join(", ")})` : " (no test yet)"}`),
              ...r.blockers.map((b) => `- holds: ${b.kind}${b.detail ? ` ${b.detail}` : ""}`),
            ].filter(Boolean).join("\n"),
          )
          .join("\n\n"),
    ctx.glossary.length ? `## Glossary\n${ctx.glossary.map((g) => `- **${g.term}**: ${g.means}`).join("\n")}` : "",
    ctx.invariants.length ? `## Invariants (never break)\n${ctx.invariants.map((i) => `- ${i.code}: ${i.text}`).join("\n")}` : "",
    ctx.design?.forbidden.length ? `## Layout contract: forbidden\n${ctx.design.forbidden.map((f) => `- ${f}`).join("\n")}` : "",
    ctx.openQuestions.length ? `## Open questions\n${ctx.openQuestions.map((q) => `- ${q.code}${q.blocks ? " (blocks)" : ""}: ${q.text}`).join("\n")}` : "",
    ctx.decisions.length ? `## Recent decisions\n${ctx.decisions.map((d) => `- ${d.code} [${d.status}] ${d.text}`).join("\n")}` : "",
    ctx.pending.length ? `## Pending (${ctx.pending.length})\n${ctx.pending.slice(0, 30).map((p) => `- ${p.code} ${p.status}: ${p.title}`).join("\n")}` : "",
  ].filter(Boolean);
  const text = parts.join("\n\n");
  return text.length > MAX ? `${text.slice(0, MAX)}\n\n[truncated: call lastro_context for the rest]` : text;
}

export type { AgentContext };
