import type { Actor, RunReportData } from "@lastro/shared";
import { linkTestTx } from "../criteria/service";
import type { Tx } from "../db";
import type { ProjectScope } from "../scope/project-scope";

/** Any "REQ…" word: a valid code (5 characters) starts a segment; anything else only ends the one before. */
const REQUIREMENT = /REQ[-_ ]?([0-9A-Za-z]*)/g;
const VALID = /^[0-9A-Z]{5}$/;
const CRITERION = /(?:^|[^0-9A-Za-z])AC[-_ ]?(\d{1,3})(?!\d)/g;

/**
 * The criteria a test's name points to: "TestX_REQ60KTK_AC1", "… (REQ-60KTK AC-1)", "REQ-60KTK AC-1 AC-2".
 * Each AC belongs to the requirement code before it.
 */
export function mentionedCriteria(name: string): { requirement: string; criterion: string }[] {
  const codes = [...name.matchAll(REQUIREMENT)];
  return codes.flatMap((m, i) => {
    if (!VALID.test(m[1] ?? "")) return [];
    const end = codes[i + 1]?.index ?? name.length;
    const after = name.slice((m.index ?? 0) + m[0].length, end);
    return [...after.matchAll(CRITERION)].map((c) => ({ requirement: `REQ-${m[1]}`, criterion: `AC-${c[1]}` }));
  });
}

/**
 * Links each test of a run whose name points to a criterion, so the agent does not link them one by one.
 * A code that matches no requirement or criterion is left alone; every link is audited as automatic.
 */
export async function linkByName(tx: Tx, scope: ProjectScope, actor: Actor, report: RunReportData): Promise<string[]> {
  const linked: string[] = [];
  const refs = [...new Set(report.stages.flatMap((s) => s.results.map((r) => r.ref)))];
  for (const ref of refs) {
    for (const m of mentionedCriteria(ref.split("::").slice(1).join("::"))) {
      const exists = await tx.criterion.findFirst({ where: { code: m.criterion, requirement: { projectId: scope.id, code: m.requirement, status: { not: "dropped" } } }, select: { id: true } });
      if (exists && (await linkTestTx(tx, scope, actor, m.requirement, m.criterion, ref, { auto: true }))) linked.push(`${m.requirement} ${m.criterion} ${ref}`);
    }
  }
  return linked;
}
