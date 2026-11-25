import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { artifactsService, auditService, intakeService, sourcesService } from "@lastro/core";
import { extract } from "@lastro/intake";
import { contentKey, localStore, type BlobStore } from "@lastro/storage";
import { resetDatabase } from "../helpers/db";
import { createProject } from "../helpers/fixtures";
import { BLUE_PNG, RED_PNG, buildDocx } from "../helpers/intake-files";

const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
let dir = "";
let store: BlobStore;

beforeEach(async () => {
  await resetDatabase();
  dir = await mkdtemp(join(tmpdir(), "lastro-intake-it-"));
  store = localStore(dir);
});
afterEach(() => rm(dir, { recursive: true, force: true }));

async function intakeDocx(projectId: string, actor: Parameters<typeof intakeService.fromExtracted>[1], bytes: Uint8Array, sourceCode?: string) {
  const extracted = await extract({ name: "spec.docx", bytes });
  return intakeService.fromExtracted(projectId, actor, extracted, { from: "client", store, original: { bytes, contentType: DOCX }, sourceCode });
}

describe("intake into a project", () => {
  it("stores assets and the original, links the images and creates the source", async () => {
    const { project, actor } = await createProject();
    const bytes = await buildDocx();
    const result = await intakeDocx(project.id, actor, bytes);

    expect(result.version).toBe(1);
    expect(await store.get(contentKey(bytes))).toEqual(bytes);
    expect(result.original.storageKey).toBe(contentKey(bytes));
    expect(result.original.code).toMatch(/^ART-[0-9A-HJKMNP-TV-Z]{5}$/);

    const red = await artifactsService.read(project.id, result.assets[0]?.code ?? "", store);
    expect(red.bytes).toEqual(RED_PNG);
    expect(red.artifact).toMatchObject({ kind: "source-asset", contentType: "image/png", size: RED_PNG.byteLength });
    // The same image twice in the document is one artifact.
    expect(new Set(result.assets.map((a) => a.code)).size).toBe(2);
    expect((await artifactsService.read(project.id, result.assets[1]?.code ?? "", store)).bytes).toEqual(BLUE_PNG);

    const { source, version } = await sourcesService.passages(project.id, result.sourceCode);
    expect(source).toMatchObject({ kind: "docx", title: "spec.docx", from: "client", machineTranscript: false });
    expect(version.storageKey).toBe(contentKey(bytes));
    expect(version.hash).toMatch(/^sha256:[0-9a-f]{64}$/);
    const p2 = version.passages.find((p) => p.anchor === "@p2");
    expect(p2?.text).toBe(`Before ![p2-img1.png](artifact:${result.assets[0]?.code}) between ![p2-img2.png](artifact:${result.assets[1]?.code}) after.`);
    expect(version.passages.some((p) => p.text.includes("{{asset:"))).toBe(false);
    expect(version.passages.find((p) => p.anchor === "@p4")?.label).toBe("item 1");

    const actions = (await auditService.list(project.id)).map((e) => e.action);
    expect(actions.filter((a) => a === "artifact.store")).toHaveLength(3);
    expect(actions).toContain("source.create");
  });

  it("adds version 2 when a source code is given, keeping the codes of unchanged images", async () => {
    const { project, actor } = await createProject();
    const first = await intakeDocx(project.id, actor, await buildDocx());
    const changed = await buildDocx();
    // A different original (one byte appended after the zip) with the same extracted content.
    const second = await intakeDocx(project.id, actor, new Uint8Array([...changed, 0]), first.sourceCode);

    expect(second).toMatchObject({ sourceCode: first.sourceCode, version: 2 });
    expect(second.assets.map((a) => a.code)).toEqual(first.assets.map((a) => a.code));
    expect(second.original.code).not.toBe(first.original.code);
    const listed = await sourcesService.list(project.id);
    expect(listed).toHaveLength(1);
    expect(listed[0]?.versions.map((v) => v.version)).toEqual([2, 1]);
  });

  it("refuses to read an artifact of another project", async () => {
    const { project, actor } = await createProject();
    const stored = await artifactsService.store(project.id, actor, { kind: "log", contentType: "text/plain", bytes: new Uint8Array([1]) }, store);
    await expect(artifactsService.read(crypto.randomUUID(), stored.code, store)).rejects.toThrow(/not found/);
  });
});
