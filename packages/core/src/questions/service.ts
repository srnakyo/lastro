import { answerInputSchema, questionInputSchema, type Actor, type AnswerInput, type QuestionInput } from "@lastro/shared";
import { auditService } from "../audit/service";
import { newCode } from "../codes/generate";
import { db, transaction } from "../db";
import { LastroError, notFound } from "../errors";
import { createDecision } from "../decisions/service";
import { reevaluate } from "../requirements/evaluate";
import { requirementIds } from "../requirements/links";
import { requireHuman } from "../scope/actor";
import { loadScope } from "../scope/project-scope";

export const questionsService = {
  /** Opens a question. A blocking question holds only its own requirements back. */
  async ask(projectId: string, actor: Actor, raw: QuestionInput) {
    const input = questionInputSchema.parse(raw);
    return transaction(async (tx) => {
      const scope = await loadScope(tx, projectId);
      const exists = async (c: string) => !!(await tx.question.findUnique({ where: { projectId_code: { projectId, code: c } } }));
      if (input.code && (await exists(input.code))) throw new LastroError("CONFLICT", `${input.code} already exists`);
      const code = input.code ?? (await newCode("Q", exists));
      const linked = await requirementIds(tx, projectId, input.requirements);
      const question = await tx.question.create({
        data: {
          projectId, code, text: input.text, blocks: input.blocks, askedTo: input.askedTo, askedVia: input.askedVia ?? null,
          requirements: { create: linked.map((r) => ({ requirementId: r.id })) },
        },
      });
      await auditService.record(tx, { workspaceId: scope.workspaceId, projectId, actor, action: "question.ask", entity: "question", entityId: code });
      for (const r of linked) await reevaluate(tx, scope, r.id);
      return question;
    });
  },

  /** Records the answer, turns it into a decision with its source and releases the requirements. */
  async answer(projectId: string, actor: Actor, code: string, raw: AnswerInput) {
    requireHuman(actor, "recording an answer");
    const input = answerInputSchema.parse(raw);
    return transaction(async (tx) => {
      const scope = await loadScope(tx, projectId);
      const question = await tx.question.findUnique({ relationLoadStrategy: "join", where: { projectId_code: { projectId, code } }, include: { requirements: { include: { requirement: { select: { id: true, code: true } } } } } });
      if (!question) throw notFound(`question ${code}`);
      if (question.answer) throw new LastroError("CONFLICT", `${code} is already answered`);
      const linked = input.decision ? await tx.decision.findUnique({ where: { projectId_code: { projectId, code: input.decision } } }) : null;
      const decision = linked ?? (await createDecision(tx, scope, actor, {
        kind: "client_answer", text: input.answer, reason: `answer to ${code}: ${question.text}`, decidedBy: input.decidedBy,
        showToClient: true, sourceRef: input.answerSource, requirements: question.requirements.map((r) => r.requirement.code),
      }));
      await tx.question.update({ where: { id: question.id }, data: { answer: input.answer, answerSource: input.answerSource ?? null, answeredAt: new Date(), decisionId: decision.id } });
      await auditService.record(tx, { workspaceId: scope.workspaceId, projectId, actor, action: "question.answer", entity: "question", entityId: code });
      for (const r of question.requirements) await reevaluate(tx, scope, r.requirement.id);
      return decision;
    });
  },

  list(projectId: string) {
    return db().question.findMany({ where: { projectId }, orderBy: { askedAt: "asc" }, include: { requirements: { include: { requirement: { select: { code: true } } } } } });
  },
};
