import type { Actor } from "@lastro/shared";
import { auditService } from "../audit/service";
import { db, transaction } from "../db";

const normalize = (file: string) => file.replace(/\\/g, "/").replace(/^\.\//, "");
const ignored = (file: string) => file.startsWith(".lastro/") || file.startsWith(".git/") || file.includes("node_modules/");

/**
 * Adds files an agent changed to the requirements being built: the ones started on this branch, or,
 * when none matches, every requirement in building. Their evidence is bound to these files.
 */
export async function addTouches(projectId: string, actor: Actor, files: string[], branch: string | null) {
  const clean = [...new Set(files.map(normalize).filter((f) => f && !ignored(f)))];
  if (clean.length === 0) return { updated: [] as string[] };
  return transaction(async (tx) => {
    const building = await tx.requirement.findMany({ where: { projectId, status: { in: ["building", "reopened"] } }, select: { id: true, code: true, touches: true, branch: true } });
    const onBranch = branch ? building.filter((r) => r.branch === branch) : [];
    const targets = onBranch.length > 0 ? onBranch : building;
    const updated: string[] = [];
    for (const r of targets) {
      const next = [...new Set([...r.touches, ...clean])].sort();
      if (next.length === r.touches.length) continue;
      await tx.requirement.update({ where: { id: r.id }, data: { touches: next } });
      updated.push(r.code);
    }
    if (updated.length) {
      const project = await tx.project.findUniqueOrThrow({ where: { id: projectId }, select: { workspaceId: true } });
      await auditService.record(tx, { workspaceId: project.workspaceId, projectId, actor, action: "requirement.touches", entity: "requirement", entityId: updated.join(","), data: { files: clean } });
    }
    return { updated };
  });
}

/** Test files bound to locked criteria: an agent may not edit them. */
export async function lockedTestFiles(projectId: string) {
  const links = await db().criterionTest.findMany({ where: { criterion: { lockedHash: { not: null }, requirement: { projectId, status: { notIn: ["dropped"] } } } }, select: { testRef: true, criterion: { select: { code: true, requirement: { select: { code: true } } } } } });
  const files = new Map<string, string[]>();
  for (const l of links) {
    const file = l.testRef.split("::")[0] ?? l.testRef;
    files.set(file, [...(files.get(file) ?? []), `${l.criterion.requirement.code} ${l.criterion.code}`]);
  }
  return [...files.entries()].map(([file, criteria]) => ({ file, criteria }));
}
