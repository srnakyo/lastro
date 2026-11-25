import { diagramsData, requirementQa, runsService, testCatalog, uncoveredCriteria } from "@lastro/core";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireProject } from "./context.server";

const keySchema = z.object({ key: z.string() });

export const listRuns = createServerFn({ method: "GET" })
  .validator((d: unknown) => keySchema.parse(d))
  .handler(async ({ data }) => runsService.list((await requireProject(data.key)).project.id));

export const getRun = createServerFn({ method: "GET" })
  .validator((d: unknown) => keySchema.extend({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => runsService.get((await requireProject(data.key)).project.id, data.id));

export const listTests = createServerFn({ method: "GET" })
  .validator((d: unknown) => keySchema.parse(d))
  .handler(async ({ data }) => {
    const { project } = await requireProject(data.key);
    const [tests, uncovered] = await Promise.all([testCatalog(project.id), uncoveredCriteria(project.id)]);
    return { tests, uncovered };
  });

export const signStage = createServerFn({ method: "POST" })
  .validator((d: unknown) => keySchema.extend({ code: z.string(), stage: z.string(), condition: z.string().nullable(), status: z.enum(["passed", "failed"]), reference: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    const { project, actor } = await requireProject(data.key);
    return runsService.signManual(project.id, actor, data.code, { stage: data.stage, condition: data.condition, status: data.status, reference: data.reference });
  });

export const getRequirementQa = createServerFn({ method: "GET" })
  .validator((d: unknown) => keySchema.extend({ code: z.string() }).parse(d))
  .handler(async ({ data }) => requirementQa((await requireProject(data.key)).project.id, data.code));

export const getDiagrams = createServerFn({ method: "GET" })
  .validator((d: unknown) => keySchema.parse(d))
  .handler(async ({ data }) => diagramsData((await requireProject(data.key)).project.id));
