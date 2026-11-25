import type { Actor, Snapshot } from "@lastro/shared";
import { decisionsService } from "../decisions/service";
import { glossaryService } from "../glossary/service";
import { incidentsService } from "../incidents/service";
import { lifecycleService } from "../lifecycle/service";
import { projectsService } from "../projects/service";
import { questionsService } from "../questions/service";
import { sourcesService } from "../sources/service";
import type { HumanAction } from "./plan";

/** Order matters: a final source and answered questions come before the approvals they allow. */
const ORDER: HumanAction["kind"][] = ["config", "design", "invariant", "source_final", "answer", "decision_confirm", "decision_overturn", "approve", "drop", "triage"];

async function apply(projectId: string, actor: Actor, snapshot: Snapshot, a: HumanAction) {
  switch (a.kind) {
    case "config": return projectsService.updateConfig(projectId, actor, snapshot.config);
    case "design": return glossaryService.setDesignContract(projectId, actor, snapshot.design);
    case "invariant": {
      const inv = snapshot.glossary.invariants.find((i) => i.code === a.target);
      return inv ? glossaryService.upsertInvariant(projectId, actor, inv) : undefined;
    }
    case "source_final": return sourcesService.markFinal(projectId, actor, a.target);
    case "answer": {
      const q = snapshot.questions.find((x) => x.code === a.target);
      return q?.answer ? questionsService.answer(projectId, actor, a.target, { answer: q.answer, answerSource: q.answerSource ?? undefined, decision: q.decision }) : undefined;
    }
    case "decision_confirm": return decisionsService.confirm(projectId, actor, a.target);
    case "decision_overturn": return decisionsService.overturn(projectId, actor, a.target, "overturned in the snapshot");
    case "approve": return lifecycleService.approve(projectId, actor, a.target);
    case "drop": return lifecycleService.drop(projectId, actor, a.target, "dropped in the snapshot");
    case "triage": {
      const i = snapshot.incidents.find((x) => x.code === a.target);
      return i?.triage && i.cause && i.billing ? incidentsService.triage(projectId, actor, a.target, { triage: i.triage, cause: i.cause, billing: i.billing, regressionTest: i.regressionTest }) : undefined;
    }
  }
}

/**
 * Applies the human actions of a snapshot for a person. For an agent nothing is applied: every action is
 * returned as refused, so the output can name it. An action the lifecycle refuses (a blocked approval) is
 * returned as refused with the reason.
 */
export async function applyHumanActions(projectId: string, actor: Actor, snapshot: Snapshot, actions: HumanAction[]) {
  const sorted = [...actions].sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind));
  if (actor.type !== "user") return { applied: [] as HumanAction[], refused: sorted.map((a) => ({ ...a, reason: "needs a person's token" })) };
  const applied: HumanAction[] = [];
  const refused: (HumanAction & { reason: string })[] = [];
  for (const a of sorted) {
    try {
      await apply(projectId, actor, snapshot, a);
      applied.push(a);
    } catch (error) {
      refused.push({ ...a, reason: error instanceof Error ? error.message : String(error) });
    }
  }
  return { applied, refused };
}
