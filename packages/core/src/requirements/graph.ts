import type { BlockerInput } from "../lifecycle/blockers";
import type { Tx } from "../db";
import { notFound } from "../errors";

export const graphInclude = {
  citations: { orderBy: { position: "asc" }, include: { source: { select: { code: true, kind: true, machineTranscript: true, versions: { orderBy: { version: "desc" }, take: 1, select: { final: true, version: true } } } } } },
  criteria: { orderBy: { position: "asc" }, include: { tests: { select: { testRef: true, lockedHash: true } } } },
  questions: { include: { question: { select: { code: true, text: true, blocks: true, answer: true } } } },
  decisions: { include: { decision: { select: { code: true, status: true, text: true, kind: true, decidedBy: true } } } },
  evidence: { orderBy: { verifiedAt: "desc" }, take: 1, select: { runId: true, treeHash: true, verifiedAt: true } },
  package: { select: { code: true, title: true } },
  dependsOn: { select: { dependsOn: { select: { code: true } } } },
} as const;

export async function loadGraph(tx: Tx, requirementId: string) {
  // One SQL query with joins: relation queries run in parallel otherwise, which pg refuses on a transaction client.
  const graph = await tx.requirement.findUnique({ relationLoadStrategy: "join", where: { id: requirementId }, include: graphInclude });
  if (!graph) throw notFound("requirement");
  return graph;
}

export type RequirementGraph = Awaited<ReturnType<typeof loadGraph>>;

/** Maps the stored requirement to the field names used by lastro.yml (snake_case) for required-field checks. */
export function toBlockerInput(graph: RequirementGraph): BlockerInput {
  return {
    type: graph.type,
    fields: {
      title: graph.title,
      statement: graph.statement,
      where: graph.where,
      who: graph.who,
      data_source: graph.dataSource,
      period: graph.period,
      reach: graph.reach,
      when_missing: graph.whenMissing,
      examples: graph.examples,
      visual_ref: graph.visualRefs,
    },
    citations: graph.citations.map((c) => ({
      source: c.source.code,
      anchor: c.anchor,
      found: c.found,
      closest: c.found ? null : c.passageAnchor,
      final: c.source.versions[0]?.final ?? false,
      machineTranscript: c.source.machineTranscript,
      confirmed: c.confirmed,
    })),
    criteria: graph.criteria.map((c) => ({ code: c.code, tests: c.tests.length })),
    questions: graph.questions.map((q) => ({ code: q.question.code, open: !q.question.answer, blocks: q.question.blocks })),
    decisions: graph.decisions.map((d) => ({ code: d.decision.code, status: d.decision.status })),
    hasEvidence: graph.evidence.length > 0,
  };
}
