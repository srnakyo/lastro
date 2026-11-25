import { translator, type DocKey, type DocT } from "../i18n";
import type { DocsInput, DocumentId, GeneratedDocument } from "../model";
import { architectureDoc } from "./architecture";
import { clientReportDoc } from "./client-report";
import { changelogDoc, decisionsDoc, diagramsDoc } from "./history";
import { projectDoc } from "./project";
import { requirementsDoc } from "./requirements";
import { qualityReportDoc, testCasesDoc, testPlanDoc } from "./testing";

interface DocumentDef {
  id: DocumentId;
  file: string;
  title: DocKey;
  build: (input: DocsInput, t: DocT) => string;
}

export const DOCUMENTS: DocumentDef[] = [
  { id: "project", file: "PROJECT.md", title: "project.title", build: projectDoc },
  { id: "requirements", file: "REQUIREMENTS.md", title: "req.title", build: requirementsDoc },
  { id: "architecture", file: "ARCHITECTURE.md", title: "arch.title", build: architectureDoc },
  { id: "test-plan", file: "TEST-PLAN.md", title: "plan.title", build: testPlanDoc },
  { id: "test-cases", file: "TEST-CASES.md", title: "cases.title", build: testCasesDoc },
  { id: "quality-report", file: "QUALITY-REPORT.md", title: "quality.title", build: qualityReportDoc },
  { id: "changelog", file: "CHANGELOG.md", title: "changelog.title", build: changelogDoc },
  { id: "decisions", file: "DECISIONS.md", title: "decisions.title", build: decisionsDoc },
  { id: "diagrams", file: "DIAGRAMS.md", title: "diagrams.title", build: diagramsDoc },
  { id: "client-report", file: "CLIENT-REPORT.md", title: "client.title", build: clientReportDoc },
];

/** Builds the Markdown of one document, or of all of them. */
export function generateDocuments(input: DocsInput, only?: DocumentId[]): GeneratedDocument[] {
  const t = translator(input.lang);
  return DOCUMENTS.filter((d) => !only || only.includes(d.id)).map((d) => ({ id: d.id, file: d.file, title: t(d.title), markdown: d.build(input, t) }));
}
