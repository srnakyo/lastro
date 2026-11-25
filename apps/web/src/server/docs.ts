import { docBuildsService, docsData, LastroError, type BuiltFile } from "@lastro/core";
import { generateDocuments, generatePackageReport, type DocsInput, type DocumentId } from "@lastro/docs";
import { renderInBrowser, toHtml } from "@lastro/docs/render";
import type { Actor } from "@lastro/shared";
import { storeFromEnv } from "@lastro/storage";

const encode = (text: string) => new TextEncoder().encode(text);

/** Generates the documents (Markdown, HTML with drawn diagrams, PDF) and stores them as the latest build. */
export async function buildDocs(projectId: string, actor: Actor, options: { lang?: "en" | "pt-BR"; only?: DocumentId[]; pdf?: boolean; commit?: string | null } = {}) {
  const input: DocsInput = await docsData(projectId, options.lang, options.commit);
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

/** The item-by-item report of a package, in Markdown (REQ-D1F4M). */
export async function packageReportMarkdown(projectId: string, packageCode: string, options: { lang?: "en" | "pt-BR"; commit?: string | null } = {}) {
  const input: DocsInput = await docsData(projectId, options.lang, options.commit);
  if (!input.packages.some((p) => p.code === packageCode)) throw new LastroError("NOT_FOUND", `package ${packageCode} not found`);
  return generatePackageReport(input, packageCode);
}
