import type { Actor } from "@lastro/shared";
import { contentKey, type BlobStore } from "@lastro/storage";
import { auditService } from "../audit/service";
import { db, transaction } from "../db";
import { notFound } from "../errors";

export interface BuiltFile {
  document: string;
  format: "md" | "html" | "pdf";
  bytes: Uint8Array;
}

const CONTENT_TYPES: Record<BuiltFile["format"], string> = { md: "text/markdown; charset=utf-8", html: "text/html; charset=utf-8", pdf: "application/pdf" };

/** Generated documents: each file is stored once by content and listed by its latest build. */
export const docBuildsService = {
  async record(projectId: string, actor: Actor, commit: string | null, files: BuiltFile[], store: BlobStore, language = "en") {
    const keys: (BuiltFile & { key: string })[] = [];
    for (const f of files) {
      const key = contentKey(f.bytes);
      await store.put(key, f.bytes, CONTENT_TYPES[f.format]);
      keys.push({ ...f, key });
    }
    return transaction(async (tx) => {
      const project = await tx.project.findUniqueOrThrow({ where: { id: projectId }, select: { workspaceId: true } });
      await tx.docBuild.createMany({ data: keys.map((k) => ({ projectId, document: k.document, format: k.format, commit, storageKey: k.key, generatedBy: `${actor.type}:${actor.id}`, language })) });
      await auditService.record(tx, { workspaceId: project.workspaceId, projectId, actor, action: "docs.build", entity: "project", entityId: projectId, data: { documents: [...new Set(files.map((f) => f.document))] } });
      return { files: keys.length };
    });
  },

  /** The latest build of every document and format. */
  async latest(projectId: string) {
    const builds = await db().docBuild.findMany({ where: { projectId }, orderBy: { createdAt: "desc" }, take: 500 });
    const latest = new Map<string, (typeof builds)[number]>();
    for (const b of builds) if (!latest.has(`${b.document}.${b.format}`)) latest.set(`${b.document}.${b.format}`, b);
    return [...latest.values()].map((b) => ({ id: b.id, document: b.document, format: b.format, commit: b.commit, createdAt: b.createdAt, generatedBy: b.generatedBy, language: b.language }));
  },

  async read(projectId: string, document: string, format: BuiltFile["format"], store: BlobStore) {
    const build = await db().docBuild.findFirst({ where: { projectId, document, format }, orderBy: { createdAt: "desc" } });
    if (!build?.storageKey) throw notFound(`document ${document}.${format}`);
    const bytes = await store.get(build.storageKey);
    if (!bytes) throw notFound(`stored ${document}.${format}`);
    return { bytes, contentType: CONTENT_TYPES[format], createdAt: build.createdAt };
  },
};
