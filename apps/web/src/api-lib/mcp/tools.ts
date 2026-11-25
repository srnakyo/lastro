import { agentContext, criteriaService, decisionsService, glossaryService, incidentsService, LastroError, lifecycleService, questionsService, requirementsService, sourceReads } from "@lastro/core";
import type { VerifiedToken } from "@lastro/core";
import type { z } from "zod";
import { TOOLS, type ToolName } from "./catalog";

interface Scope {
  token: VerifiedToken;
  projectId: string;
}

type Args<K extends ToolName> = z.output<(typeof TOOLS)[K]["input"]>;
type Handlers = { [K in ToolName]: (args: Args<K>, scope: Scope) => Promise<unknown> };

const BEFORE_VERIFIED = ["specified", "approved", "verified"];

async function gate(projectId: string, code?: string) {
  const views = code ? [await requirementsService.get(projectId, code)] : await requirementsService.list(projectId, { status: "building" });
  return views.map((v) => ({ code: v.code, status: v.status, holding: v.blockers.filter((b) => BEFORE_VERIFIED.includes(b.blocks)) }));
}

async function withPassages(projectId: string, code: string) {
  const view = await requirementsService.get(projectId, code);
  const passages = await Promise.all(view.citations.map((c) => sourceReads.passagesFor(projectId, c.source.code, c.anchor)));
  return { ...view, citations: view.citations.map((c, i) => ({ ...c, passages: passages[i]?.passages ?? [] })) };
}

const HANDLERS: Handlers = {
  lastro_context: async (_a, s) => agentContext(s.projectId),
  lastro_list: async (a, s) =>
    (await requirementsService.list(s.projectId, { status: a.status, type: a.type, packageCode: a.package })).map((v) => ({ code: v.code, title: v.title, status: v.status, type: v.type, blockers: v.blockers.map((b) => b.kind) })),
  lastro_get_requirement: async (a, s) => withPassages(s.projectId, a.code),
  lastro_get_source: async (a, s) => sourceReads.passagesFor(s.projectId, a.source, a.anchor),
  lastro_propose_requirements: async (a, s) => {
    const created = [];
    for (const input of a.requirements) created.push(await requirementsService.create(s.projectId, s.token.actor, input));
    return created.map((v) => ({ code: v.code, status: v.status, blockers: v.blockers }));
  },
  lastro_update_requirement: async (a, s) => requirementsService.update(s.projectId, s.token.actor, a.code, a.patch),
  lastro_record_decision: async (a, s) => decisionsService.record(s.projectId, s.token.actor, a),
  lastro_ask: async (a, s) => questionsService.ask(s.projectId, s.token.actor, a),
  lastro_link_test: async (a, s) => {
    await criteriaService.linkTest(s.projectId, s.token.actor, a.code, a.criterion, a.test);
    return { ok: true };
  },
  lastro_start: async (a, s) => {
    await lifecycleService.start(s.projectId, s.token.actor, a.code, a.branch ?? null);
    return { ok: true };
  },
  lastro_verify: async () => {
    throw new LastroError("VALIDATION", "lastro_verify runs on your machine: connect through `lastro mcp` instead of the HTTP endpoint");
  },
  lastro_gate_status: async (a, s) => gate(s.projectId, a.code),
  lastro_submit: async (a, s) => {
    const [state] = await gate(s.projectId, a.code);
    const done = state?.status === "verified";
    return { done, ...state, message: done ? "verified" : "not done yet: the gate is red, see holding" };
  },
  lastro_pause: async (a) => ({ paused: true, reason: a.reason }),
  lastro_report_incident: async (a, s) => incidentsService.report(s.projectId, s.token.actor, a),
  lastro_glossary: async (a, s) => {
    const g = await glossaryService.get(s.projectId);
    const term = a.term?.toLowerCase();
    return { terms: term ? g.terms.filter((t) => t.term.toLowerCase().includes(term)) : g.terms, invariants: g.invariants };
  },
};

/** Validates the arguments with the tool's schema and runs it for an agent token, inside its project. */
export async function callTool<K extends ToolName>(name: K, rawArgs: unknown, scope: Scope): Promise<unknown> {
  const args = TOOLS[name].input.parse(rawArgs ?? {}) as Args<K>;
  return (HANDLERS[name] as (a: Args<K>, s: Scope) => Promise<unknown>)(args, scope);
}
