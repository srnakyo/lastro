import type { Tx } from "../db";

/** The latest result of every stage and condition recorded for a requirement. */
export async function latestStages(tx: Tx, requirementId: string) {
  const stages = await tx.runStage.findMany({ where: { requirementId }, orderBy: { startedAt: "desc" }, select: { stage: true, condition: true, status: true, manual: true } });
  const latest = new Map<string, (typeof stages)[number]>();
  for (const s of stages) if (!latest.has(`${s.stage}|${s.condition ?? ""}`)) latest.set(`${s.stage}|${s.condition ?? ""}`, s);
  return [...latest.values()];
}
