import type { Tx } from "../db";

/** The commit of the latest run that covered a requirement: what "the current commit" is on the server's side. */
export async function latestCommit(tx: Tx, requirementId: string): Promise<string | null> {
  const stage = await tx.runStage.findFirst({ where: { requirementId, run: { proof: false } }, orderBy: [{ run: { startedAt: "desc" } }, { startedAt: "desc" }], select: { run: { select: { commit: true } } } });
  return stage?.run.commit ?? null;
}

/** The latest result of every stage and condition recorded for a requirement, on one commit when given. */
export async function latestStages(tx: Tx, requirementId: string, commit?: string | null) {
  const stages = await tx.runStage.findMany({
    where: { requirementId, run: { proof: false, ...(commit ? { commit } : {}) } },
    // By the run first: the latest run wins, whatever the order of its stages.
    orderBy: [{ run: { startedAt: "desc" } }, { startedAt: "desc" }],
    select: { stage: true, condition: true, status: true, manual: true, findings: { where: { level: "error" }, take: 20, select: { file: true, line: true, ruleId: true, message: true } } },
  });
  const latest = new Map<string, (typeof stages)[number]>();
  for (const s of stages) if (!latest.has(`${s.stage}|${s.condition ?? ""}`)) latest.set(`${s.stage}|${s.condition ?? ""}`, s);
  return [...latest.values()];
}
