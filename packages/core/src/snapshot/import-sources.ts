import type { Snapshot } from "@lastro/shared";
import type { Tx } from "../db";
import type { ProjectScope } from "../scope/project-scope";

/** Creates new sources and adds a draft version when the content hash changed. Returns the ids that changed. */
export async function importSources(tx: Tx, scope: ProjectScope, snapshot: Snapshot): Promise<string[]> {
  const changed: string[] = [];
  for (const s of snapshot.sources) {
    const existing = await tx.source.findUnique({ where: { projectId_code: { projectId: scope.id, code: s.code } } });
    const source =
      existing ??
      (await tx.source.create({
        data: { projectId: scope.id, code: s.code, kind: s.kind, title: s.title, from: s.from, receivedAt: s.receivedAt, machineTranscript: s.machineTranscript },
      }));
    const last = await tx.sourceVersion.findFirst({ where: { sourceId: source.id }, orderBy: { version: "desc" } });
    // Marking a source final is a person's action (apply-human); a new version starts as a draft.
    if (last?.hash === s.hash) continue;
    await tx.sourceVersion.create({
      data: {
        sourceId: source.id, version: (last?.version ?? 0) + 1, final: false, hash: s.hash, path: s.path ?? null,
        extractedText: s.passages.map((p) => p.text).join("\n\n"),
        passages: { create: s.passages.map((p, position) => ({ anchor: p.anchor, heading: p.heading ?? null, text: p.text, position })) },
      },
    });
    changed.push(source.id);
  }
  return changed;
}
