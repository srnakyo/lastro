import { decisionsService, packagesService, questionsService } from "@lastro/core";
import { answerInputSchema, decisionInputSchema, packageInputSchema, questionInputSchema } from "@lastro/shared";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireProject } from "./context.server";

const keySchema = z.object({ key: z.string() });
const codeSchema = keySchema.extend({ code: z.string() });

export const listDecisions = createServerFn({ method: "GET" })
  .validator((d: unknown) => keySchema.parse(d))
  .handler(async ({ data }) => {
    const { project } = await requireProject(data.key);
    return (await decisionsService.list(project.id)).map((d) => ({ ...d, requirements: d.requirements.map((r) => r.requirement.code) }));
  });

export const recordDecision = createServerFn({ method: "POST" })
  .validator((d: unknown) => keySchema.extend({ input: decisionInputSchema }).parse(d))
  .handler(async ({ data }) => {
    const { project, actor } = await requireProject(data.key);
    return { code: (await decisionsService.record(project.id, actor, data.input)).code };
  });

export const decisionAction = createServerFn({ method: "POST" })
  .validator((d: unknown) => codeSchema.extend({ action: z.enum(["confirm", "overturn"]), reason: z.string().optional() }).parse(d))
  .handler(async ({ data }) => {
    const { project, actor } = await requireProject(data.key);
    if (data.action === "confirm") await decisionsService.confirm(project.id, actor, data.code);
    else await decisionsService.overturn(project.id, actor, data.code, data.reason ?? "");
    return { ok: true };
  });

export const listQuestions = createServerFn({ method: "GET" })
  .validator((d: unknown) => keySchema.parse(d))
  .handler(async ({ data }) => {
    const { project } = await requireProject(data.key);
    return (await questionsService.list(project.id)).map((q) => ({ ...q, requirements: q.requirements.map((r) => r.requirement.code) }));
  });

export const askQuestion = createServerFn({ method: "POST" })
  .validator((d: unknown) => keySchema.extend({ input: questionInputSchema }).parse(d))
  .handler(async ({ data }) => {
    const { project, actor } = await requireProject(data.key);
    return { code: (await questionsService.ask(project.id, actor, data.input)).code };
  });

export const answerQuestion = createServerFn({ method: "POST" })
  .validator((d: unknown) => codeSchema.extend({ input: answerInputSchema }).parse(d))
  .handler(async ({ data }) => {
    const { project, actor } = await requireProject(data.key);
    await questionsService.answer(project.id, actor, data.code, data.input);
    return { ok: true };
  });

export const listPackages = createServerFn({ method: "GET" })
  .validator((d: unknown) => keySchema.parse(d))
  .handler(async ({ data }) => {
    const { project } = await requireProject(data.key);
    return (await packagesService.list(project.id)).map((p) => ({ ...p, sources: p.sources.map((s) => s.source) }));
  });

export const createPackage = createServerFn({ method: "POST" })
  .validator((d: unknown) => keySchema.extend({ input: packageInputSchema }).parse(d))
  .handler(async ({ data }) => {
    const { project, actor } = await requireProject(data.key);
    return { code: (await packagesService.create(project.id, actor, data.input)).code };
  });

export const closePackage = createServerFn({ method: "POST" })
  .validator((d: unknown) => codeSchema.parse(d))
  .handler(async ({ data }) => {
    const { project, actor } = await requireProject(data.key);
    await packagesService.close(project.id, actor, data.code);
    return { ok: true };
  });
