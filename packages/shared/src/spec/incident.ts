import { z } from "zod";
import { codeSchema } from "../codes";
import { BILLINGS, INCIDENT_CAUSES, TRIAGES } from "../enums";

export const incidentInputSchema = z.object({
  code: codeSchema("INC").optional(),
  reported: z.string().min(1),
  sourceRef: z.string().optional(),
  requirement: codeSchema("REQ").optional(),
});
export type IncidentInput = z.input<typeof incidentInputSchema>;
export type IncidentData = z.output<typeof incidentInputSchema>;

export const triageInputSchema = z.object({
  triage: z.enum(TRIAGES),
  cause: z.enum(INCIDENT_CAUSES),
  billing: z.enum(BILLINGS),
  regressionTest: z.string().optional(),
});
export type TriageInput = z.input<typeof triageInputSchema>;
export type TriageData = z.output<typeof triageInputSchema>;
