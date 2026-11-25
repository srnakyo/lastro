import { z } from "zod";
import { codeSchema } from "../codes";
import { projectConfigSchema } from "../config";
import { DECISION_KINDS, DECISION_STATUSES, REQUIREMENT_STATUSES, ROLES, SOURCE_KINDS } from "../enums";
import { requirementInputSchema } from "../spec/requirement";

/** One source as it travels in a snapshot: metadata plus the anchored passages of its latest version. */
export const snapshotSourceSchema = z.object({
  code: codeSchema("SRC"),
  kind: z.enum(SOURCE_KINDS),
  title: z.string().min(1),
  from: z.enum(ROLES),
  receivedAt: z.coerce.date(),
  final: z.boolean(),
  machineTranscript: z.boolean(),
  path: z.string().optional(),
  hash: z.string().min(1),
  passages: z.array(z.object({ anchor: z.string(), heading: z.string().optional(), text: z.string() })).min(1),
});

export const snapshotSchema = z.object({
  config: projectConfigSchema,
  glossary: z.object({
    terms: z.array(z.object({ term: z.string(), means: z.string(), note: z.string().optional() })).default([]),
    invariants: z.array(z.object({ code: z.string(), text: z.string(), testRefs: z.array(z.string()).default([]) })).default([]),
  }),
  sources: z.array(snapshotSourceSchema),
  packages: z.array(z.object({ code: codeSchema("PKG"), title: z.string(), sources: z.array(codeSchema("SRC")).default([]), report: z.boolean().default(true) })),
  requirements: z.array(requirementInputSchema.extend({ code: codeSchema("REQ"), status: z.enum(REQUIREMENT_STATUSES) })),
  decisions: z.array(
    z.object({
      code: codeSchema("DEC"),
      kind: z.enum(DECISION_KINDS),
      text: z.string(),
      reason: z.string().optional(),
      decidedBy: z.enum(ROLES),
      decidedByAgent: z.boolean().default(false),
      status: z.enum(DECISION_STATUSES),
      showToClient: z.boolean().default(true),
      sourceRef: z.string().optional(),
      requirements: z.array(codeSchema("REQ")).default([]),
    }),
  ),
  questions: z.array(
    z.object({
      code: codeSchema("Q"),
      text: z.string(),
      blocks: z.boolean(),
      askedTo: z.enum(ROLES),
      askedVia: z.string().optional(),
      answer: z.string().nullable().optional(),
      answerSource: z.string().nullable().optional(),
      requirements: z.array(codeSchema("REQ")).default([]),
    }),
  ),
});

export type Snapshot = z.output<typeof snapshotSchema>;
export type SnapshotInput = z.input<typeof snapshotSchema>;
