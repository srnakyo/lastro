import type { Tx } from "../db";
import { reevaluate } from "../requirements/evaluate";
import type { ProjectScope } from "../scope/project-scope";
import { matchQuote } from "../text/quote";

/** Latest version passages of a source, for quote checks. */
export async function latestPassages(tx: Tx, sourceId: string) {
  const version = await tx.sourceVersion.findFirst({
    where: { sourceId },
    orderBy: { version: "desc" },
    include: { passages: { select: { anchor: true, text: true } } },
  });
  return version ? { final: version.final, passages: version.passages } : { final: false, passages: [] };
}

/** Re-checks every citation of a source after its content or finality changed, then re-evaluates the requirements. */
export async function recheckCitations(tx: Tx, scope: ProjectScope, sourceId: string) {
  const { passages } = await latestPassages(tx, sourceId);
  const citations = await tx.citation.findMany({ where: { sourceId }, select: { id: true, anchor: true, quote: true, requirementId: true } });
  for (const citation of citations) {
    const match = matchQuote(passages, citation.anchor, citation.quote);
    await tx.citation.update({ where: { id: citation.id }, data: { found: match.found, passageAnchor: match.passageAnchor } });
  }
  for (const requirementId of new Set(citations.map((c) => c.requirementId))) await reevaluate(tx, scope, requirementId);
}
