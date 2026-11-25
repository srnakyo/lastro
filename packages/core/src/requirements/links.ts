import type { Tx } from "../db";
import { notFound } from "../errors";

/** Resolves requirement codes to ids within the project. */
export async function requirementIds(tx: Tx, projectId: string, codes: string[]) {
  const found = await tx.requirement.findMany({ where: { projectId, code: { in: codes } }, select: { id: true, code: true } });
  const missing = codes.filter((c) => !found.some((f) => f.code === c));
  if (missing.length > 0) throw notFound(`requirements ${missing.join(", ")}`);
  return found;
}
