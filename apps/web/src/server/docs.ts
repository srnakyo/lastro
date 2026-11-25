import { docBuildsService, docsData, type BuiltFile } from "@lastro/core";
import { generateDocuments, type DocsInput, type DocumentId } from "@lastro/docs";
import { renderInBrowser, toHtml } from "@lastro/docs/render";
import type { Actor } from "@lastro/shared";
import { storeFromEnv } from "@lastro/storage";

const encode = (text: string) => new TextEncoder().encode(text);

/** Generates the documents (Markdown, HTML with drawn diagrams, PDF) and stores them as the latest build. */
export async function buildDocs(projectId: string, actor: Actor, options: { lang?: "en" | "pt-BR"; only?: DocumentId[]; pdf?: boolean } = {}) {
  const input: DocsInput = await docsData(projectId, options.lang);
  const documents = generateDocuments(input, options.only);
  const rendered = await renderInBrowser(documents.map((d) => toHtml(d.markdown, `${d.title}: ${input.project.name}`, input.lang)), { pdf: options.pdf ?? true });
  const files: BuiltFile[] = documents.flatMap((d, i) => {
    const r = rendered[i];
    return [
      { document: d.id, format: "md" as const, bytes: encode(d.markdown) },
      { document: d.id, format: "html" as const, bytes: encode(r?.html ?? "") },
      ...(r?.pdf ? [{ document: d.id, format: "pdf" as const, bytes: r.pdf }] : []),
    ];
  });
  await docBuildsService.record(projectId, actor, input.commit, files, storeFromEnv());
  return { documents: documents.length, pdf: rendered.some((r) => r.pdf !== null) };
}
