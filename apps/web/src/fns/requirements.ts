import { criteriaService, lifecycleService, projectsService, requirementsService, sourceReads } from "@lastro/core";
import { REQUIREMENT_STATUSES, requirementInputSchema, requirementUpdateSchema } from "@lastro/shared";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireProject } from "./context.server";

const keySchema = z.object({ key: z.string() });
const codeSchema = keySchema.extend({ code: z.string() });

export const listRequirements = createServerFn({ method: "GET" })
  .validator((d: unknown) => keySchema.extend({ status: z.enum(REQUIREMENT_STATUSES).optional(), type: z.string().optional(), pkg: z.string().optional() }).parse(d))
  .handler(async ({ data }) => {
    const { project } = await requireProject(data.key);
    const views = await requirementsService.list(project.id, { status: data.status, type: data.type, packageCode: data.pkg });
    return views.map((v) => ({
      code: v.code, title: v.title, type: v.type, status: v.status, package: v.package, hallmark: v.hallmark,
      blockers: [...new Set(v.blockers.map((b) => b.kind))], criteria: v.criteria.length, tested: v.criteria.filter((c) => c.tests.length > 0).length,
      holds: v.blockers.map((b) => ({ kind: b.kind, detail: b.detail, blocks: b.blocks })),
    }));
  });

/** A person approves several requirements at once; each refusal comes back with its reason. */
export const approveRequirements = createServerFn({ method: "POST" })
  .validator((d: unknown) => keySchema.extend({ codes: z.array(z.string()).min(1) }).parse(d))
  .handler(async ({ data }) => {
    const { project, actor } = await requireProject(data.key);
    const approved: string[] = [];
    const refused: { code: string; message: string }[] = [];
    for (const code of data.codes) {
      try {
        await lifecycleService.approve(project.id, actor, code);
        approved.push(code);
      } catch (error) {
        refused.push({ code, message: (error as Error).message });
      }
    }
    return { approved, refused };
  });

export const getRequirement = createServerFn({ method: "GET" })
  .validator((d: unknown) => codeSchema.parse(d))
  .handler(async ({ data }) => {
    const { project, workspace } = await requireProject(data.key);
    const view = await requirementsService.get(project.id, data.code);
    const passages = await Promise.all(view.citations.map((c) => sourceReads.passagesFor(project.id, c.source.code, c.anchor)));
    const config = (await projectsService.getByKey(workspace.id, data.key)).config;
    return {
      ...view,
      citations: view.citations.map((c, i) => ({ ...c, passages: passages[i]?.passages ?? [], sourceFinal: passages[i]?.final ?? false, sourceVersion: passages[i]?.version ?? null })),
      required: config.types[view.type]?.required ?? [],
      flow: [...config.global_flow, ...(config.types[view.type]?.flow ?? [])],
      types: Object.keys(config.types),
    };
  });

export const createRequirement = createServerFn({ method: "POST" })
  .validator((d: unknown) => keySchema.extend({ input: requirementInputSchema }).parse(d))
  .handler(async ({ data }) => {
    const { project, actor } = await requireProject(data.key);
    return { code: (await requirementsService.create(project.id, actor, data.input)).code };
  });

export const updateRequirement = createServerFn({ method: "POST" })
  .validator((d: unknown) => codeSchema.extend({ patch: requirementUpdateSchema }).parse(d))
  .handler(async ({ data }) => {
    const { project, actor } = await requireProject(data.key);
    await requirementsService.update(project.id, actor, data.code, data.patch);
    return { ok: true };
  });

const action = z.enum(["approve", "unlock", "start", "drop", "accept", "confirmQuote"]);

/** Human actions on a requirement; the core refuses what the lifecycle does not allow. */
export const requirementAction = createServerFn({ method: "POST" })
  .validator((d: unknown) => codeSchema.extend({ action, reason: z.string().optional(), position: z.number().optional() }).parse(d))
  .handler(async ({ data }) => {
    const { project, actor } = await requireProject(data.key);
    const run = {
      approve: () => lifecycleService.approve(project.id, actor, data.code),
      unlock: () => criteriaService.unlock(project.id, actor, data.code),
      start: () => lifecycleService.start(project.id, actor, data.code, data.reason ?? null),
      drop: () => lifecycleService.drop(project.id, actor, data.code, data.reason ?? ""),
      accept: () => lifecycleService.accept(project.id, actor, data.code, data.reason ?? ""),
      confirmQuote: () => criteriaService.confirmQuote(project.id, actor, data.code, data.position ?? 0),
    }[data.action];
    await run();
    return { ok: true };
  });
