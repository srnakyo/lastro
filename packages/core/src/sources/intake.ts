import type { ExtractedAsset, ExtractedSource } from "@lastro/intake";
import type { Actor, SourceInput } from "@lastro/shared";
import type { BlobStore } from "@lastro/storage";
import { artifactsService } from "../artifacts/service";
import { LastroError } from "../errors";
import { sourcesService } from "./service";

export interface IntakeTarget {
  from: SourceInput["from"];
  receivedAt?: Date;
  final?: boolean;
  store: BlobStore;
  /** The original file as received; its storage key goes on the version. */
  original: { bytes: Uint8Array; contentType: string };
  /** Given: the extraction becomes a new version of this source. Omitted: a new source. */
  sourceCode?: string;
}

type Artifact = Awaited<ReturnType<typeof artifactsService.store>>;

async function storeAssets(projectId: string, actor: Actor, assets: ExtractedAsset[], store: BlobStore) {
  const stored = new Map<string, Artifact>();
  for (const asset of assets) {
    stored.set(asset.name, await artifactsService.storeOnce(projectId, actor, { kind: "source-asset", contentType: asset.contentType, bytes: asset.bytes }, store));
  }
  return stored;
}

/** Turns {{asset:<name>}} into a Markdown image pointing at the stored artifact. */
function linkAssets(text: string, artifacts: Map<string, Artifact>): string {
  return text.replace(/\{\{asset:([^}]+)\}\}/g, (_, name: string) => {
    const artifact = artifacts.get(name);
    if (!artifact) throw new LastroError("VALIDATION", `passage references asset ${name}, which the extraction does not have`);
    return `![${name}](artifact:${artifact.code})`;
  });
}

export const intakeService = {
  /** Stores the assets and the original, then records the extraction as a source or a new version of one. */
  async fromExtracted(projectId: string, actor: Actor, extracted: ExtractedSource, target: IntakeTarget) {
    const assets = await storeAssets(projectId, actor, extracted.assets, target.store);
    const original = await artifactsService.storeOnce(projectId, actor, { kind: "source", ...target.original }, target.store);
    const input: SourceInput = {
      kind: extracted.kind,
      title: extracted.title,
      from: target.from,
      receivedAt: target.receivedAt,
      final: target.final ?? false,
      machineTranscript: extracted.machineTranscript,
      hash: extracted.hash,
      storageKey: original.storageKey,
      passages: extracted.passages.map((p) => ({ ...p, text: linkAssets(p.text, assets) })),
    };
    if (target.sourceCode) {
      const version = await sourcesService.addVersion(projectId, actor, target.sourceCode, input);
      return { sourceCode: target.sourceCode, version: version.version, original, assets: [...assets.values()] };
    }
    const source = await sourcesService.create(projectId, actor, input);
    return { sourceCode: source.code, version: 1, original, assets: [...assets.values()] };
  },
};
