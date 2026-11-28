import type { Actor } from "@lastro/shared";
import { auditService } from "../audit/service";
import { projectConfigSchema, testLevel } from "@lastro/shared";
import { db, transaction } from "../db";
import { notFound } from "../errors";

const normalize = (file: string) => file.replace(/\\/g, "/").replace(/^\.\//, "");
const ignored = (file: string) => file.startsWith(".lastro/") || file.startsWith(".git/") || file.includes("node_modules/");

type Building = { id: string; code: string; touches: string[]; branch: string | null };

const BRANCH_CODE = /REQ-?([0-9A-Z]{5})(?![0-9A-Za-z])/i;

/**
 * Which requirements the changed files are for: the one the agent named (`lastro req work`), else those started
 * on this branch, else the one the branch is named after, else the only one in building. When several are in
 * building and nothing tells, none: guessing put other requirements' files in their coverage. The gate then
 * asks for the files with `lastro req touches --set`.
 */
function targetsOf(building: Building[], branch: string | null, requirement: string | null): Building[] {
  const named = requirement ? building.filter((r) => r.code === requirement) : [];
  if (named.length) return named;
  const started = branch ? building.filter((r) => r.branch === branch) : [];
  if (started.length) return started;
  const code = branch ? BRANCH_CODE.exec(branch)?.[1]?.toUpperCase() : undefined;
  const byName = code ? building.filter((r) => r.code === `REQ-${code}`) : [];
  if (byName.length) return byName;
  return building.length === 1 ? building : [];
}

/**
 * Adds files an agent changed to the requirement being built (see targetsOf). Test files are left out: they are
 * bound to the requirement through its linked tests, and coverage is measured on the code they test.
 */
export async function addTouches(projectId: string, actor: Actor, files: string[], branch: string | null, requirement: string | null = null) {
  return transaction(async (tx) => {
    const project = await tx.project.findUniqueOrThrow({ where: { id: projectId }, select: { config: true } });
    const levels = projectConfigSchema.parse(project.config).tests.levels;
    const clean = [...new Set(files.map(normalize).filter((f) => f && !ignored(f) && testLevel(f, levels) === null))];
    if (clean.length === 0) return { updated: [] as string[] };
    const building = await tx.requirement.findMany({ where: { projectId, status: { in: ["building", "reopened"] } }, select: { id: true, code: true, touches: true, branch: true } });
    const targets = targetsOf(building, branch, requirement);
    const updated: string[] = [];
    for (const r of targets) {
      const next = [...new Set([...r.touches, ...clean])].sort();
      if (next.length === r.touches.length) continue;
      await tx.requirement.update({ where: { id: r.id }, data: { touches: next } });
      updated.push(r.code);
    }
    if (updated.length) {
      const workspace = await tx.project.findUniqueOrThrow({ where: { id: projectId }, select: { workspaceId: true } });
      await auditService.record(tx, { workspaceId: workspace.workspaceId, projectId, actor, action: "requirement.touches", entity: "requirement", entityId: updated.join(","), data: { files: clean } });
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
  const links = await db().criterionTest.findMany({ where: { lockedHash: { not: null }, criterion: { lockedHash: { not: null }, requirement: { projectId, status: { notIn: ["dropped"] } } } }, select: { testRef: true, lockedHash: true, sealedLines: true, criterion: { select: { code: true, requirement: { select: { code: true } } } } } });
  const files = new Map<string, { criteria: string[]; tests: { ref: string; block: boolean; lines: string[] }[] }>();
  for (const l of links) {
    const file = l.testRef.split("::")[0] ?? l.testRef;
    const entry = files.get(file) ?? { criteria: [], tests: [] };
    entry.criteria.push(`${l.criterion.requirement.code} ${l.criterion.code}`);
    // A seal on the test's own lines lets the file take other edits; a whole-file seal from before does not.
    entry.tests.push({ ref: l.testRef, block: !!l.lockedHash?.startsWith("block:"), lines: l.sealedLines });
    files.set(file, entry);
  }
  return [...files.entries()].map(([file, e]) => ({ file, criteria: e.criteria, tests: e.tests }));
}
