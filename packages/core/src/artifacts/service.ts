import type { Actor } from "@lastro/shared";
import { contentKey, type BlobStore } from "@lastro/storage";
import { createHash } from "node:crypto";
import { auditService } from "../audit/service";
import { newCode } from "../codes/generate";
import { db, transaction, type Tx } from "../db";
import { notFound } from "../errors";
import { loadScope } from "../scope/project-scope";

export interface ArtifactInput {
  /** What the bytes are: "source", "source-asset", "screenshot", "log"... */
  kind: string;
  contentType: string;
  bytes: Uint8Array;
  runStageId?: string;
}

const hashOf = (bytes: Uint8Array) => `sha256:${createHash("sha256").update(bytes).digest("hex")}`;

async function createRow(tx: Tx, projectId: string, actor: Actor, input: ArtifactInput, storageKey: string) {
  const scope = await loadScope(tx, projectId);
  const code = await newCode("ART", async (c) => !!(await tx.artifact.findUnique({ where: { projectId_code: { projectId, code: c } } })));
  const artifact = await tx.artifact.create({
    data: {
      projectId,
      code,
      kind: input.kind,
      contentType: input.contentType,
      size: input.bytes.byteLength,
      hash: hashOf(input.bytes),
      storageKey,
      runStageId: input.runStageId ?? null,
    },
  });
  await auditService.record(tx, {
    workspaceId: scope.workspaceId,
    projectId,
    actor,
    action: "artifact.store",
    entity: "artifact",
    entityId: code,
    data: { kind: input.kind, size: artifact.size, hash: artifact.hash },
  });
  return artifact;
}

export const artifactsService = {
  /** Writes the bytes under their content key (stored once per content) and records the artifact. */
  async store(projectId: string, actor: Actor, input: ArtifactInput, store: BlobStore) {
    const storageKey = contentKey(input.bytes);
    // The blob goes first: a failed transaction leaves at most an unreferenced, content-addressed file.
    await store.put(storageKey, input.bytes, input.contentType);
    return transaction((tx) => createRow(tx, projectId, actor, input, storageKey));
  },

  /**
   * Returns the artifact of the project with the same kind and content when there is one, and stores
   * a new one otherwise. Unchanged images keep their code from one source version to the next.
   */
  async storeOnce(projectId: string, actor: Actor, input: Omit<ArtifactInput, "runStageId">, store: BlobStore) {
    const storageKey = contentKey(input.bytes);
    // Writing again is idempotent and makes sure the blob is there even if it was removed by hand.
    await store.put(storageKey, input.bytes, input.contentType);
    const existing = await db().artifact.findFirst({
      where: { projectId, kind: input.kind, storageKey, runStageId: null },
      orderBy: { createdAt: "asc" },
    });
    return existing ?? transaction((tx) => createRow(tx, projectId, actor, input, storageKey));
  },

  async read(projectId: string, code: string, store: BlobStore) {
    const artifact = await db().artifact.findUnique({ where: { projectId_code: { projectId, code } } });
    if (!artifact) throw notFound(`artifact ${code}`);
    const bytes = await store.get(artifact.storageKey);
    if (!bytes) throw notFound(`stored content of artifact ${code}`);
    return { artifact, bytes };
  },
};
