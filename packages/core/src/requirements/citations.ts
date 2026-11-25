import type { RequirementData } from "@lastro/shared";
import type { Tx } from "../db";
import { notFound } from "../errors";
import { latestPassages } from "../sources/recheck";
import { matchQuote } from "../text/quote";

/** Resolves citation inputs (source codes) into rows, checking each quote against the latest source version. */
export async function resolveCitations(tx: Tx, projectId: string, citations: RequirementData["citations"]) {
  const rows = [];
  for (const [position, citation] of citations.entries()) {
    rows.push(await (async () => {
      const source = await tx.source.findUnique({ where: { projectId_code: { projectId, code: citation.source } }, select: { id: true } });
      if (!source) throw notFound(`source ${citation.source}`);
      const { passages } = await latestPassages(tx, source.id);
      const match = matchQuote(passages, citation.anchor, citation.quote);
      return {
        sourceId: source.id,
        anchor: citation.anchor,
        label: citation.label ?? null,
        quote: citation.quote,
        position,
        found: match.found,
        passageAnchor: match.passageAnchor,
      };
    })());
  }
  return rows;
}
