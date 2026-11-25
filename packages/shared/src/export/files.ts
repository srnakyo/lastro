import { z } from "zod";
import { codeSchema } from "../codes";
import { projectConfigSchema } from "../config";
import { BILLINGS, DECISION_KINDS, DECISION_STATUSES, INCIDENT_CAUSES, REQUIREMENT_STATUSES, ROLES, SOURCE_KINDS, TRIAGES } from "../enums";

/** The contracts of the .lastro/ export files, as written (snake_case keys). One JSON Schema is published per file. */

const date = z.union([z.string(), z.date()]);
const sourceRef = z.union([z.string(), z.object({ ref: z.string(), anchor: z.string().optional() })]);
const codes = (prefix: Parameters<typeof codeSchema>[0]) => z.array(codeSchema(prefix)).default([]);

export const sourceFileSchema = z.object({
  id: codeSchema("SRC"),
  kind: z.enum(SOURCE_KINDS),
  title: z.string().min(1),
  from: z.enum(ROLES),
  received_at: date,
  hash: z.string().optional(),
  version: z.number().int().positive().optional(),
  supersedes: codeSchema("SRC").nullable().optional(),
  final: z.boolean().default(false),
  machine_transcript: z.boolean().default(false),
  path: z.string().optional(),
  extracted: z.string().optional(),
});

export const requirementFileSchema = z.object({
  id: codeSchema("REQ"),
  title: z.string().min(1),
  type: z.string().min(1),
  status: z.enum(REQUIREMENT_STATUSES),
  package: codeSchema("PKG").optional(),
  sources: z.array(z.object({ ref: codeSchema("SRC"), anchor: z.string().min(1), label: z.string().optional(), quote: z.string().min(1) })).min(1),
  statement: z.string().min(1),
  where: z.string().optional(),
  who: z.object({ sees: z.array(z.string()).optional(), uses: z.array(z.string()).optional(), scope: z.string().optional() }).optional(),
  data_source: z.string().optional(),
  period: z.string().optional(),
  reach: z.record(z.string(), z.unknown()).optional(),
  visual_ref: z.array(z.string()).optional(),
  when_missing: z.string().optional(),
  examples: z.array(z.object({ given: z.string(), expect: z.string() })).default([]),
  acceptance: z.array(z.object({ id: z.string().regex(/^AC-\d+$/), text: z.string().min(1), tests: z.array(z.string()).default([]), locked: z.string().nullable().optional() })).min(1),
  decisions: codes("DEC"),
  questions: codes("Q"),
  depends_on: codes("REQ"),
  touches: z.array(z.string()).default([]),
});

export const decisionFileSchema = z.object({
  id: codeSchema("DEC"),
  about: z.array(z.string()).default([]),
  kind: z.enum(DECISION_KINDS),
  text: z.string().min(1),
  reason: z.string().optional(),
  decided_by: z.enum([...ROLES, "agent"]),
  status: z.enum(DECISION_STATUSES),
  show_to_client: z.boolean().default(true),
  source: sourceRef.nullable().optional(),
});

export const questionFileSchema = z.object({
  id: codeSchema("Q"),
  about: z.array(z.string()).default([]),
  text: z.string().min(1),
  blocks: z.boolean().default(false),
  asked_to: z.enum(ROLES),
  asked_via: z.string().optional(),
  asked_at: date.optional(),
  answer: z.string().nullable().optional(),
  answer_source: z.string().nullable().optional(),
  decision: codeSchema("DEC").optional(),
});

export const incidentFileSchema = z.object({
  id: codeSchema("INC"),
  reported: z.string().min(1),
  source: sourceRef.optional(),
  requirement: codeSchema("REQ").optional(),
  triage: z.enum(TRIAGES).optional(),
  cause: z.enum(INCIDENT_CAUSES).optional(),
  billing: z.enum(BILLINGS).optional(),
  regression_test: z.string().optional(),
});

export const packageFileSchema = z.object({
  id: codeSchema("PKG"),
  title: z.string().min(1),
  sources: codes("SRC"),
  opened_at: date.optional(),
  closed_at: date.nullable().optional(),
  report: z.boolean().default(true),
});

export const glossaryFileSchema = z.object({
  terms: z.array(z.object({ term: z.string().min(1), means: z.string().min(1), note: z.string().optional() })).default([]),
  invariants: z.array(z.object({ id: z.string().regex(/^INV-([0-9A-HJKMNP-TV-Z]{5}|\d+)$/), text: z.string().min(1), tests: z.array(z.string()).optional() })).default([]),
});

export const designFileSchema = z.object({
  components: z.record(z.string(), z.string()).default({}),
  forbidden: z.array(z.string()).default([]),
  palette: z.record(z.string(), z.string()).default({}),
  reference_screens: z.array(z.string()).default([]),
});

/** Each export file kind, its place in .lastro/ and its contract. */
export const EXPORT_FILES = {
  config: { pattern: "lastro.yml", schema: projectConfigSchema },
  glossary: { pattern: "glossary.yml", schema: glossaryFileSchema },
  design: { pattern: "design.yml", schema: designFileSchema },
  source: { pattern: "sources/SRC-*.yml", schema: sourceFileSchema },
  package: { pattern: "packages/PKG-*.yml", schema: packageFileSchema },
  requirement: { pattern: "requirements/REQ-*.yml", schema: requirementFileSchema },
  decision: { pattern: "decisions/DEC-*.yml", schema: decisionFileSchema },
  question: { pattern: "questions/Q-*.yml", schema: questionFileSchema },
  incident: { pattern: "incidents/INC-*.yml", schema: incidentFileSchema },
} as const;

export type ExportFileKind = keyof typeof EXPORT_FILES;
