import { z } from "zod";
import { ROLES, SOURCE_KINDS } from "../enums";

export const sourceInputSchema = z.object({
  kind: z.enum(SOURCE_KINDS),
  title: z.string().min(1),
  from: z.enum(ROLES),
  receivedAt: z.coerce.date().optional(),
  machineTranscript: z.boolean().default(false),
  final: z.boolean().default(false),
  path: z.string().optional(),
  storageKey: z.string().optional(),
  hash: z.string().min(1),
  /** Extracted text with anchors already resolved into passages. */
  passages: z
    .array(z.object({ anchor: z.string().min(1), label: z.string().optional(), heading: z.string().optional(), text: z.string() }))
    .min(1),
});
export type SourceInput = z.input<typeof sourceInputSchema>;
export type SourceData = z.output<typeof sourceInputSchema>;
