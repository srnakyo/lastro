import { db } from "../db";
import { isPending } from "../lifecycle/transitions";
import { requirementsService } from "../requirements/service";
import type { RequirementView } from "../requirements/view";

export type PendingReason = "missing_fields" | "open_question" | "awaiting_approval" | "building" | "gate_red";

export interface PendingItem {
  code: string;
  title: string;
  status: string;
  reason: PendingReason;
  /** The missing field names, the blocking question codes, or what holds the approval. */
  details: string[];
}

function reasonOf(v: RequirementView, ran: Set<string>): Pick<PendingItem, "reason" | "details"> {
  const questions = v.blockers.filter((b) => b.kind === "open_question").map((b) => b.detail);
  if (questions.length && ["captured", "specified"].includes(v.status)) return { reason: "open_question", details: questions };
  if (v.status === "captured") return { reason: "missing_fields", details: v.blockers.filter((b) => b.kind === "missing_field" || b.kind === "invalid_quote").map((b) => (b.kind === "missing_field" ? b.detail : `quote not found at ${b.detail}`)) };
  if (v.status === "specified") return { reason: "awaiting_approval", details: v.blockers.filter((b) => b.blocks === "approved").map((b) => `${b.kind}${b.detail ? ` ${b.detail}` : ""}`) };
  if (ran.has(v.id) && v.status !== "approved") return { reason: "gate_red", details: v.blockers.filter((b) => b.blocks === "verified").map((b) => b.kind) };
  return { reason: "building", details: [] };
}

/** What has not reached verified, each with the one reason it is waiting on (REQ-7V6KE). */
export async function pendingList(projectId: string, packageCode?: string): Promise<PendingItem[]> {
  const views = (await requirementsService.list(projectId, packageCode ? { packageCode } : {})).filter((v) => isPending(v.status));
  const ran = new Set((await db().runStage.findMany({ where: { requirementId: { in: views.map((v) => v.id) } }, select: { requirementId: true }, distinct: ["requirementId"] })).map((r) => r.requirementId ?? ""));
  return views.map((v) => {
    const { reason, details } = reasonOf(v, ran);
    return { code: v.code, title: v.title, status: v.status, reason, details: [...new Set(details)] };
  });
}
