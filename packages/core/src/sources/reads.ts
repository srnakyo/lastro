import { db } from "../db";
import { notFound } from "../errors";
import { passagesUnder } from "../text/quote";

export const sourceReads = {
  /** The passages a citation anchor covers, in the latest version of the source, for side-by-side reading. */
  async passagesFor(projectId: string, sourceCode: string, anchor: string) {
    const source = await db().source.findUnique({ where: { projectId_code: { projectId, code: sourceCode } } });
    if (!source) throw notFound(`source ${sourceCode}`);
    const version = await db().sourceVersion.findFirst({
      where: { sourceId: source.id },
      orderBy: { version: "desc" },
      include: { passages: { orderBy: { position: "asc" }, select: { anchor: true, heading: true, label: true, text: true } } },
    });
    return { source, version: version?.version ?? null, final: version?.final ?? false, passages: version ? passagesUnder(version.passages, anchor) : [] };
  },

  /** A source with every version, the passages of the latest one and which requirements quote each passage. */
  async detail(projectId: string, code: string) {
    const source = await db().source.findUnique({
      where: { projectId_code: { projectId, code } },
      include: {
        versions: { orderBy: { version: "desc" }, select: { id: true, version: true, final: true, hash: true, path: true, storageKey: true, createdAt: true } },
        citations: { select: { passageAnchor: true, found: true, requirement: { select: { code: true, title: true, status: true } } } },
        packages: { include: { package: { select: { code: true, title: true } } } },
      },
    });
    if (!source) throw notFound(`source ${code}`);
    const latest = source.versions[0];
    const passages = latest
      ? await db().passage.findMany({ where: { sourceVersionId: latest.id }, orderBy: { position: "asc" }, select: { anchor: true, heading: true, label: true, text: true } })
      : [];
    return { ...source, passages };
  },
};
