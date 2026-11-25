import { translator, type DocKey, type DocT } from "../i18n";
import type { DocsInput, DocumentId, GeneratedDocument } from "../model";
import { architectureDoc } from "./architecture";
import { clientReportDoc } from "./client-report";
import { changelogDoc, decisionsDoc, diagramsDoc } from "./history";
import { projectDoc } from "./project";
import { packageReport } from "./package-report";
import { requirementsDoc } from "./requirements";
import { rulesDoc } from "./rules";
import { qualityReportDoc, testCasesDoc, testPlanDoc } from "./testing";

interface DocumentDef {
  id: DocumentId;
  file: string;
  title: DocKey;
  build: (input: DocsInput, t: DocT) => string;
}

export const DOCUMENTS: DocumentDef[] = [
  { id: "overview", file: "overview.md", title: "project.title", build: projectDoc },
  { id: "requirements", file: "requirements.md", title: "req.title", build: requirementsDoc },
  { id: "rules", file: "rules.md", title: "rules.title", build: rulesDoc },
  { id: "architecture", file: "architecture.md", title: "arch.title", build: architectureDoc },
  { id: "decisions", file: "decisions.md", title: "decisions.title", build: decisionsDoc },
  { id: "test-plan", file: "test-plan.md", title: "plan.title", build: testPlanDoc },
  { id: "test-cases", file: "test-cases.md", title: "cases.title", build: testCasesDoc },
  { id: "quality-report", file: "quality-report.md", title: "quality.title", build: qualityReportDoc },
  { id: "delivery-history", file: "delivery-history.md", title: "changelog.title", build: changelogDoc },
  { id: "client-report", file: "client-report.md", title: "client.title", build: clientReportDoc },
  { id: "diagrams", file: "diagrams.md", title: "diagrams.title", build: diagramsDoc },
];

/** Builds the Markdown of one document, or of all of them. */
export function generateDocuments(input: DocsInput, only?: DocumentId[]): GeneratedDocument[] {
  const t = translator(input.lang);
  return DOCUMENTS.filter((d) => !only || only.includes(d.id)).map((d) => ({ id: d.id, file: d.file, title: t(d.title), markdown: d.build(input, t) }));
}

/** The item-by-item report of one package, for the requester. */
export function generatePackageReport(input: DocsInput, packageCode: string): string {
  return packageReport(input, packageCode, translator(input.lang));
}
