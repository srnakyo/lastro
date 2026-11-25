import { incidentsService, sourceReads, sourcesService } from "@lastro/core";
import { incidentInputSchema, triageInputSchema } from "@lastro/shared";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireProject } from "./context.server";

const keySchema = z.object({ key: z.string() });
const codeSchema = keySchema.extend({ code: z.string() });

export const listSources = createServerFn({ method: "GET" })
  .validator((d: unknown) => keySchema.parse(d))
  .handler(async ({ data }) => {
    const { project } = await requireProject(data.key);
    return (await sourcesService.list(project.id)).map((s) => ({
      code: s.code, kind: s.kind, title: s.title, from: s.from, receivedAt: s.receivedAt, machineTranscript: s.machineTranscript,
      version: s.versions[0]?.version ?? 0, final: s.versions[0]?.final ?? false, path: s.versions[0]?.path ?? null, citations: s._count.citations,
    }));
  });

export const getSource = createServerFn({ method: "GET" })
  .validator((d: unknown) => codeSchema.parse(d))
  .handler(async ({ data }) => {
    const { project } = await requireProject(data.key);
    return sourceReads.detail(project.id, data.code);
  });

export const markSourceFinal = createServerFn({ method: "POST" })
  .validator((d: unknown) => codeSchema.parse(d))
  .handler(async ({ data }) => {
    const { project, actor } = await requireProject(data.key);
    await sourcesService.markFinal(project.id, actor, data.code);
    return { ok: true };
  });

export const listIncidents = createServerFn({ method: "GET" })
  .validator((d: unknown) => keySchema.parse(d))
  .handler(async ({ data }) => {
    const { project } = await requireProject(data.key);
    return incidentsService.list(project.id);
  });

export const reportIncident = createServerFn({ method: "POST" })
  .validator((d: unknown) => keySchema.extend({ input: incidentInputSchema }).parse(d))
  .handler(async ({ data }) => {
    const { project, actor } = await requireProject(data.key);
    return { code: (await incidentsService.report(project.id, actor, data.input)).code };
  });

export const triageIncident = createServerFn({ method: "POST" })
  .validator((d: unknown) => codeSchema.extend({ input: triageInputSchema }).parse(d))
  .handler(async ({ data }) => {
    const { project, actor } = await requireProject(data.key);
    await incidentsService.triage(project.id, actor, data.code, data.input);
    return { ok: true };
  });
