import { glossaryService } from "@lastro/core";
import { designContractInputSchema, glossaryTermInputSchema, invariantInputSchema } from "@lastro/shared";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireProject } from "./context.server";

const keySchema = z.object({ key: z.string() });

export const getGlossary = createServerFn({ method: "GET" })
  .validator((d: unknown) => keySchema.parse(d))
  .handler(async ({ data }) => glossaryService.get((await requireProject(data.key)).project.id));

export const saveTerm = createServerFn({ method: "POST" })
  .validator((d: unknown) => keySchema.extend({ term: glossaryTermInputSchema }).parse(d))
  .handler(async ({ data }) => {
    const { project, actor } = await requireProject(data.key);
    await glossaryService.upsertTerm(project.id, actor, data.term);
    return { ok: true };
  });

export const saveInvariant = createServerFn({ method: "POST" })
  .validator((d: unknown) => keySchema.extend({ invariant: invariantInputSchema }).parse(d))
  .handler(async ({ data }) => {
    const { project, actor } = await requireProject(data.key);
    await glossaryService.upsertInvariant(project.id, actor, data.invariant);
    return { ok: true };
  });

export const saveDesignContract = createServerFn({ method: "POST" })
  .validator((d: unknown) => keySchema.extend({ contract: designContractInputSchema }).parse(d))
  .handler(async ({ data }) => {
    const { project, actor } = await requireProject(data.key);
    await glossaryService.setDesignContract(project.id, actor, data.contract);
    return { ok: true };
  });
