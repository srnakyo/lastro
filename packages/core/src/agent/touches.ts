import type { Actor } from "@lastro/shared";
import { auditService } from "../audit/service";
import { testFile } from "@lastro/shared";
import { db, transaction, type Tx } from "../db";
import { notFound } from "../errors";

const normalize = (file: string) => file.replace(/\\/g, "/").replace(/^\.\//, "");
const ignored = (file: string) => file.startsWith(".lastro/") || file.startsWith(".git/") || file.includes("node_modules/");

type Building = { id: string; code: string; touches: string[]; branch: string | null };

const BRANCH_CODE = /REQ-?([0-9A-Z]{5})(?![0-9A-Za-z])/i;

/**
 * The requirement the agent is working on when it did not say: the one its branch is named after, or the only
 * one whose linked tests are among the changed files.
 */
async function inferred(tx: Tx, building: Building[], files: string[], branch: string | null): Promise<Building[]> {
  const named = branch ? BRANCH_CODE.exec(branch) : null;
  const byBranch = named ? building.filter((r) => r.code === `REQ-${named[1]?.toUpperCase()}`) : [];
  if (byBranch.length) return byBranch;
  const links = await tx.criterionTest.findMany({ where: { criterion: { requirementId: { in: building.map((r) => r.id) } } }, select: { testRef: true, criterion: { select: { requirementId: true } } } });
  const owners = new Set(links.filter((l) => files.includes(testFile(l.testRef))).map((l) => l.criterion.requirementId));
  return owners.size === 1 ? building.filter((r) => owners.has(r.id)) : [];
}

/**
 * Adds files an agent changed to the requirements being built: the one it says it is working on (`lastro req
 * work`), else the ones started on this branch, else the one its branch name or the changed test files point
 * to, or, when nothing tells, every requirement in building. Their evidence is bound to these files.
 */
export async function addTouches(projectId: string, actor: Actor, files: string[], branch: string | null, requirement: string | null = null) {
  const clean = [...new Set(files.map(normalize).filter((f) => f && !ignored(f)))];
  if (clean.length === 0) return { updated: [] as string[] };
  return transaction(async (tx) => {
    const building = await tx.requirement.findMany({ where: { projectId, status: { in: ["building", "reopened"] } }, select: { id: true, code: true, touches: true, branch: true } });
    const current = requirement ? building.filter((r) => r.code === requirement) : [];
    const onBranch = branch ? building.filter((r) => r.branch === branch) : [];
    const told = current.length > 0 ? current : onBranch;
    const guessed = told.length > 0 ? told : await inferred(tx, building, clean, branch);
    const targets = guessed.length > 0 ? guessed : building;
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
