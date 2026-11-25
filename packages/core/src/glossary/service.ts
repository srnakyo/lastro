import { designContractInputSchema, glossaryTermInputSchema, invariantInputSchema, type Actor } from "@lastro/shared";
import type { z } from "zod";
import { auditService } from "../audit/service";
import { db, transaction } from "../db";
import { loadScope } from "../scope/project-scope";

type Term = z.input<typeof glossaryTermInputSchema>;
type Invariant = z.input<typeof invariantInputSchema>;
type Contract = z.input<typeof designContractInputSchema>;

export const glossaryService = {
  async upsertTerm(projectId: string, actor: Actor, raw: Term) {
    const input = glossaryTermInputSchema.parse(raw);
    return transaction(async (tx) => {
      const scope = await loadScope(tx, projectId);
      const data = { means: input.means, note: input.note ?? null };
      await tx.glossaryTerm.upsert({ where: { projectId_term: { projectId, term: input.term } }, create: { projectId, term: input.term, ...data }, update: data });
      await auditService.record(tx, { workspaceId: scope.workspaceId, projectId, actor, action: "glossary.term", entity: "glossary", entityId: input.term });
    });
  },

  async upsertInvariant(projectId: string, actor: Actor, raw: Invariant) {
    const input = invariantInputSchema.parse(raw);
    return transaction(async (tx) => {
      const scope = await loadScope(tx, projectId);
      const data = { text: input.text, testRefs: input.testRefs };
      await tx.invariant.upsert({ where: { projectId_code: { projectId, code: input.code } }, create: { projectId, code: input.code, ...data }, update: data });
      await auditService.record(tx, { workspaceId: scope.workspaceId, projectId, actor, action: "glossary.invariant", entity: "invariant", entityId: input.code });
    });
  },

  async setDesignContract(projectId: string, actor: Actor, raw: Contract) {
    const input = designContractInputSchema.parse(raw);
    return transaction(async (tx) => {
      const scope = await loadScope(tx, projectId);
      await tx.designContract.upsert({ where: { projectId }, create: { projectId, ...input }, update: input });
      await auditService.record(tx, { workspaceId: scope.workspaceId, projectId, actor, action: "design.contract", entity: "project", entityId: projectId });
    });
  },

  async get(projectId: string) {
    const [terms, invariants, design] = await Promise.all([
      db().glossaryTerm.findMany({ where: { projectId }, orderBy: { term: "asc" } }),
      db().invariant.findMany({ where: { projectId }, orderBy: { code: "asc" } }),
      db().designContract.findUnique({ where: { projectId } }),
    ]);
    return { terms, invariants, design };
  },
};
