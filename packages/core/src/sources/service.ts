import { sourceInputSchema, type Actor, type SourceData, type SourceInput } from "@lastro/shared";
import { auditService } from "../audit/service";
import { newCode } from "../codes/generate";
import { db, transaction, type Tx } from "../db";
import { LastroError, notFound } from "../errors";
import { requireHuman } from "../scope/actor";
import { loadScope } from "../scope/project-scope";
import { recheckCitations } from "./recheck";

async function findByCode(tx: Tx, projectId: string, code: string) {
  const source = await tx.source.findUnique({ where: { projectId_code: { projectId, code } } });
  if (!source) throw notFound(`source ${code}`);
  return source;
}

async function writeVersion(tx: Tx, sourceId: string, version: number, input: SourceData) {
  return tx.sourceVersion.create({
    data: {
      sourceId,
      version,
      final: input.final,
      hash: input.hash,
      path: input.path ?? null,
      storageKey: input.storageKey ?? null,
      extractedText: input.passages.map((p) => p.text).join("\n\n"),
      passages: {
        create: input.passages.map((p, position) => ({ anchor: p.anchor, label: p.label ?? null, heading: p.heading ?? null, text: p.text, position })),
      },
    },
  });
}

export const sourcesService = {
  async create(projectId: string, actor: Actor, raw: SourceInput, code?: string) {
    const input = sourceInputSchema.parse(raw);
    return transaction(async (tx) => {
      const scope = await loadScope(tx, projectId);
      const sourceCode =
        code ?? (await newCode("SRC", async (c) => !!(await tx.source.findUnique({ where: { projectId_code: { projectId, code: c } } }))));
      const source = await tx.source.create({
        data: { projectId, code: sourceCode, kind: input.kind, title: input.title, from: input.from, receivedAt: input.receivedAt ?? new Date(), machineTranscript: input.machineTranscript },
      });
      await writeVersion(tx, source.id, 1, input);
      await auditService.record(tx, { workspaceId: scope.workspaceId, projectId, actor, action: "source.create", entity: "source", entityId: source.code });
      return source;
    });
  },

  /** Adds a new version (same title, new content) and checks every citation against it. */
  async addVersion(projectId: string, actor: Actor, code: string, raw: SourceInput) {
    const input = sourceInputSchema.parse(raw);
    return transaction(async (tx) => {
      const scope = await loadScope(tx, projectId);
      const source = await findByCode(tx, projectId, code);
      const last = await tx.sourceVersion.findFirst({ where: { sourceId: source.id }, orderBy: { version: "desc" } });
      if (last?.hash === input.hash) throw new LastroError("CONFLICT", `${code} already has this content as version ${last.version}`);
      const version = await writeVersion(tx, source.id, (last?.version ?? 0) + 1, input);
      await recheckCitations(tx, scope, source.id);
      await auditService.record(tx, { workspaceId: scope.workspaceId, projectId, actor, action: "source.version", entity: "source", entityId: code, data: { version: version.version } });
      return version;
    });
  },

  /** Marking a source final is a human decision: approval can depend on it. */
  async markFinal(projectId: string, actor: Actor, code: string) {
    requireHuman(actor, "marking a source final");
    return transaction(async (tx) => {
      const scope = await loadScope(tx, projectId);
      const source = await findByCode(tx, projectId, code);
      const last = await tx.sourceVersion.findFirst({ where: { sourceId: source.id }, orderBy: { version: "desc" } });
      if (!last) throw notFound(`version of ${code}`);
      await tx.sourceVersion.update({ where: { id: last.id }, data: { final: true } });
      await recheckCitations(tx, scope, source.id);
      await auditService.record(tx, { workspaceId: scope.workspaceId, projectId, actor, action: "source.final", entity: "source", entityId: code, data: { version: last.version } });
    });
  },

  list(projectId: string) {
    return db().source.findMany({
      where: { projectId },
      orderBy: { receivedAt: "asc" },
      include: { versions: { orderBy: { version: "desc" }, select: { version: true, final: true, hash: true, path: true, createdAt: true } }, _count: { select: { citations: true } } },
    });
  },

  async passages(projectId: string, code: string, version?: number) {
    const source = await findByCode(db(), projectId, code);
    const chosen = await db().sourceVersion.findFirst({
      where: { sourceId: source.id, ...(version ? { version } : {}) },
      orderBy: { version: "desc" },
      include: { passages: { orderBy: { position: "asc" } } },
    });
    if (!chosen) throw notFound(`version of ${code}`);
    return { source, version: chosen };
  },
};
