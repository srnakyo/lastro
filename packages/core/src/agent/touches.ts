import type { Actor } from "@lastro/shared";
import { auditService } from "../audit/service";
import { db, transaction } from "../db";
import { notFound } from "../errors";

const normalize = (file: string) => file.replace(/\\/g, "/").replace(/^\.\//, "");
const ignored = (file: string) => file.startsWith(".lastro/") || file.startsWith(".git/") || file.includes("node_modules/");

/**
 * Adds files an agent changed to the requirements being built: the one it says it is working on (`lastro req
 * work`), else the ones started on this branch, or, when none matches, every requirement in building. Their
 * evidence is bound to these files.
 */
export async function addTouches(projectId: string, actor: Actor, files: string[], branch: string | null, requirement: string | null = null) {
  const clean = [...new Set(files.map(normalize).filter((f) => f && !ignored(f)))];
  if (clean.length === 0) return { updated: [] as string[] };
  return transaction(async (tx) => {
    const building = await tx.requirement.findMany({ where: { projectId, status: { in: ["building", "reopened"] } }, select: { id: true, code: true, touches: true, branch: true } });
    const current = requirement ? building.filter((r) => r.code === requirement) : [];
    const onBranch = branch ? building.filter((r) => r.branch === branch) : [];
    const targets = current.length > 0 ? current : onBranch.length > 0 ? onBranch : building;
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

/**
 * Replaces the touched files of one requirement, when they got files of other requirements: its coverage is
 * measured on these. The audit keeps what was removed and added, for the person to see.
 */
export async function setTouches(projectId: string, actor: Actor, code: string, files: string[]) {
  const clean = [...new Set(files.map(normalize).filter((f) => f && !ignored(f)))].sort();
  return transaction(async (tx) => {
    const requirement = await tx.requirement.findUnique({ where: { projectId_code: { projectId, code } }, select: { id: true, touches: true, project: { select: { workspaceId: true } } } });
    if (!requirement) throw notFound(`requirement ${code}`);
    const removed = requirement.touches.filter((f) => !clean.includes(f));
    const added = clean.filter((f) => !requirement.touches.includes(f));
    await tx.requirement.update({ where: { id: requirement.id }, data: { touches: clean } });
    await auditService.record(tx, { workspaceId: requirement.project.workspaceId, projectId, actor, action: "requirement.touches.set", entity: "requirement", entityId: code, data: { removed, added } });
    return { touches: clean, removed, added };
  });
}

/**
 * Test files an agent may not edit: tests of locked criteria that proved themselves (passed, so their file is
 * sealed). Before its first pass the agent may still fix its own test.
 */
export async function lockedTestFiles(projectId: string) {
  const links = await db().criterionTest.findMany({ where: { lockedHash: { not: null }, criterion: { lockedHash: { not: null }, requirement: { projectId, status: { notIn: ["dropped"] } } } }, select: { testRef: true, criterion: { select: { code: true, requirement: { select: { code: true } } } } } });
  const files = new Map<string, string[]>();
  for (const l of links) {
    const file = l.testRef.split("::")[0] ?? l.testRef;
    files.set(file, [...(files.get(file) ?? []), `${l.criterion.requirement.code} ${l.criterion.code}`]);
  }
  return [...files.entries()].map(([file, criteria]) => ({ file, criteria }));
}
