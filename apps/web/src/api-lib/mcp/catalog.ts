import { REQUIREMENT_STATUSES, decisionInputSchema, questionInputSchema, requirementInputSchema, requirementUpdateSchema, incidentInputSchema } from "@lastro/shared";
import { z } from "zod";

const code = z.string().describe("Requirement code, like REQ-K7Q2M");

/** Tools an agent can call. None of them approves, accepts, unlocks or signs a manual stage. */
export const TOOLS = {
  lastro_context: { description: "Start of every session and after every compaction: active requirements, glossary, invariants, layout contract, recent decisions and open questions.", input: z.object({}) },
  lastro_list: { description: "List requirements, optionally by status, type or package.", input: z.object({ status: z.enum(REQUIREMENT_STATUSES).optional(), type: z.string().optional(), package: z.string().optional() }) },
  lastro_get_requirement: { description: "One requirement with its quotes, the source passages around them, criteria, tests, decisions, questions and what holds it back.", input: z.object({ code }) },
  lastro_get_source: { description: "Passages of a source under an anchor, from its latest version.", input: z.object({ source: z.string(), anchor: z.string() }) },
  lastro_propose_requirements: { description: "Propose requirements from a source. Each needs a literal quote with its anchor; they start captured and a person approves them.", input: z.object({ requirements: z.array(requirementInputSchema) }) },
  lastro_update_requirement: { description: "Fill or change spec fields. Changing an approved requirement sends it back to specified.", input: z.object({ code, patch: requirementUpdateSchema }) },
  lastro_record_decision: { description: "Record an assumption or decision instead of deciding silently. It starts as proposed. When the person already decided it (in chat, a call, a document), pass madeBy: \"person\" and sourceRef with where they said it: it is shown as theirs and waits only for them to check the record.", input: decisionInputSchema },
  lastro_ask: { description: "Ask the developer or the requester. A blocking question holds back only its requirements.", input: questionInputSchema },
  lastro_link_test: { description: "Link a test ('file::test name' as in JUnit) to an acceptance criterion. On a locked criterion the new test is sealed into the lock; changing the text or removing a test needs a person.", input: z.object({ code, criterion: z.string(), test: z.string() }) },
  lastro_mark_preexisting: { description: "Say a criterion's tests check a behavior that already existed, so they cannot fail first: Lastro records it as a proposed decision the person may overturn and stops asking those tests to fail first. Never break working code to get a red run.", input: z.object({ code, criterion: z.string(), reason: z.string().min(1) }) },
  lastro_start: { description: "Start building an approved or reopened requirement before changing code for it.", input: z.object({ code, branch: z.string().optional() }) },
  lastro_verify: { description: "Run the QA flow of a requirement on this machine and record the evidence. Available through the `lastro mcp` bridge.", input: z.object({ code: code.optional() }) },
  lastro_gate_status: { description: "What still holds a requirement (or every requirement in building) back from verified.", input: z.object({ code: code.optional() }) },
  lastro_submit: { description: "Declare a requirement done. The answer says what is missing if its gate is red.", input: z.object({ code }) },
  lastro_pause: { description: "Record why you stop without finishing, so the stop hook lets you stop.", input: z.object({ reason: z.string().min(1) }) },
  lastro_report_incident: { description: "Record a complaint after delivery. A person triages it.", input: incidentInputSchema },
  lastro_glossary: { description: "Look up domain terms and invariants.", input: z.object({ term: z.string().optional() }) },
} as const;

export type ToolName = keyof typeof TOOLS;

export function toolList() {
  return Object.entries(TOOLS).map(([name, tool]) => ({ name, description: tool.description, inputSchema: z.toJSONSchema(tool.input, { io: "input" }) }));
}
