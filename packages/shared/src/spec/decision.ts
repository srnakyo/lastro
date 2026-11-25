import { z } from "zod";
import { codeSchema } from "../codes";
import { DECISION_KINDS, ROLES } from "../enums";

export const decisionInputSchema = z.object({
  code: codeSchema("DEC").optional(),
  kind: z.enum(DECISION_KINDS),
  text: z.string().min(1),
  reason: z.string().optional(),
  decidedBy: z.enum(ROLES),
  showToClient: z.boolean().default(true),
  sourceRef: z.string().optional(),
  requirements: z.array(codeSchema("REQ")).default([]),
});
export type DecisionInput = z.input<typeof decisionInputSchema>;
export type DecisionData = z.output<typeof decisionInputSchema>;

export const questionInputSchema = z.object({
  code: codeSchema("Q").optional(),
  text: z.string().min(1),
  blocks: z.boolean().default(false),
  askedTo: z.enum(ROLES),
  askedVia: z.string().optional(),
  requirements: z.array(codeSchema("REQ")).default([]),
});
export type QuestionInput = z.input<typeof questionInputSchema>;
export type QuestionData = z.output<typeof questionInputSchema>;

export const answerInputSchema = z.object({
  answer: z.string().min(1),
  /** An existing client_answer decision to link (an import), instead of recording a new one. */
  decision: codeSchema("DEC").optional(),
  answerSource: z.string().optional(),
  decidedBy: z.enum(ROLES).default("client"),
});
export type AnswerInput = z.input<typeof answerInputSchema>;
export type AnswerData = z.output<typeof answerInputSchema>;
