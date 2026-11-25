import type { RequirementData, RequirementUpdateData } from "@lastro/shared";
import type { Prisma } from "@lastro/database";
import type { Tx } from "../db";
import { notFound } from "../errors";

type Fields = Partial<Omit<RequirementData, "citations" | "criteria" | "code" | "package" | "dependsOn">>;

/** Scalar columns of a requirement, from the input fields that were sent. */
export function scalarData(input: Fields): Prisma.RequirementUncheckedUpdateInput {
  const data: Prisma.RequirementUncheckedUpdateInput = {};
  if (input.title !== undefined) data.title = input.title;
  if (input.type !== undefined) data.type = input.type;
  if (input.statement !== undefined) data.statement = input.statement;
  if (input.where !== undefined) data.where = input.where;
  if (input.who !== undefined) data.who = input.who;
  if (input.dataSource !== undefined) data.dataSource = input.dataSource;
  if (input.period !== undefined) data.period = input.period;
  if (input.reach !== undefined) data.reach = input.reach as Prisma.InputJsonValue;
  if (input.whenMissing !== undefined) data.whenMissing = input.whenMissing;
  if (input.examples !== undefined) data.examples = input.examples;
  if (input.visualRefs !== undefined) data.visualRefs = input.visualRefs;
  return data;
}

export async function packageId(tx: Tx, projectId: string, code: string | undefined) {
  if (!code) return null;
  const pkg = await tx.package.findUnique({ where: { projectId_code: { projectId, code } }, select: { id: true } });
  if (!pkg) throw notFound(`package ${code}`);
  return pkg.id;
}

export async function replaceCriteria(tx: Tx, requirementId: string, criteria: NonNullable<RequirementUpdateData["criteria"]>) {
  await tx.criterion.deleteMany({ where: { requirementId } });
  for (const [position, c] of criteria.entries()) {
    await tx.criterion.create({
      data: { requirementId, code: c.code, text: c.text, position, tests: { create: c.tests.map((testRef) => ({ testRef })) } },
    });
  }
}

export async function replaceDependencies(tx: Tx, projectId: string, requirementId: string, codes: string[]) {
  await tx.requirementDependency.deleteMany({ where: { requirementId } });
  for (const code of codes) {
    const other = await tx.requirement.findUnique({ where: { projectId_code: { projectId, code } }, select: { id: true } });
    if (!other) throw notFound(`requirement ${code}`);
    await tx.requirementDependency.create({ data: { requirementId, dependsOnId: other.id } });
  }
}
