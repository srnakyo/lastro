import type { Snapshot } from "@lastro/shared";
import type { Tx } from "../db";
import type { ProjectScope } from "../scope/project-scope";

/** Glossary terms are spec content; invariants are rules and go through a person (apply-human). */
export async function importTerms(tx: Tx, scope: ProjectScope, snapshot: Snapshot) {
  for (const t of snapshot.glossary.terms) {
    const data = { means: t.means, note: t.note ?? null };
    await tx.glossaryTerm.upsert({ where: { projectId_term: { projectId: scope.id, term: t.term } }, create: { projectId: scope.id, term: t.term, ...data }, update: data });
  }
}

export async function importPackages(tx: Tx, scope: ProjectScope, snapshot: Snapshot) {
  for (const p of snapshot.packages) {
    const saved = await tx.package.upsert({
      where: { projectId_code: { projectId: scope.id, code: p.code } },
      create: { projectId: scope.id, code: p.code, title: p.title, report: p.report },
      update: { title: p.title, report: p.report },
    });
    const sources = await tx.source.findMany({ where: { projectId: scope.id, code: { in: p.sources } }, select: { id: true } });
    await tx.packageSource.deleteMany({ where: { packageId: saved.id } });
    if (sources.length > 0) await tx.packageSource.createMany({ data: sources.map((s) => ({ packageId: saved.id, sourceId: s.id })) });
  }
}

