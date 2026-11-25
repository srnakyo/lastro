import type { ProjectConfig } from "@lastro/shared";

/** Everything the documents are generated from: plain data, so the generators never touch the database. */
export interface DocsInput {
  generatedAt: Date;
  commit: string | null;
  lang: "en" | "pt-BR";
  project: { key: string; name: string; description: string | null; repositoryUrl: string | null };
  config: ProjectConfig;
  requirements: DocRequirement[];
  packages: { code: string; title: string; requirements: string[] }[];
  sources: { code: string; title: string; from: string; version: number; final: boolean }[];
  decisions: { code: string; kind: string; text: string; reason: string | null; decidedBy: string; status: string; requirements: string[]; createdAt: Date }[];
  questions: { code: string; text: string; askedTo: string; blocks: boolean; answer: string | null; requirements: string[] }[];
  incidents: { code: string; reported: string; triage: string | null; cause: string | null; billing: string | null; requirement: string | null; createdAt: Date }[];
  glossary: { terms: { term: string; means: string }[]; invariants: { code: string; text: string; testRefs: string[] }[] };
  runs: { id: string; commit: string | null; branch: string | null; trigger: string; status: string; startedAt: Date; durationMs: number | null; tests: { passed: number; failed: number; skipped: number } }[];
  tests: { ref: string; last: string | null; flaky: boolean; orphan: boolean; covers: string[] }[];
  history: { code: string; title: string; from: string | null; to: string; at: Date; actor: string; reason: string | null }[];
}

export interface DocRequirement {
  code: string;
  title: string;
  type: string;
  status: string;
  statement: string;
  where: string | null;
  dataSource: string | null;
  period: string | null;
  whenMissing: string | null;
  module: string;
  package: string | null;
  examples: { given: string; expect: string }[];
  citations: { source: string; anchor: string; quote: string; found: boolean }[];
  criteria: { code: string; text: string; tests: string[]; locked: boolean }[];
  decisions: string[];
  questions: string[];
  blockers: { kind: string; detail: string }[];
  evidence: { commit: string | null; verifiedAt: Date } | null;
}

export interface GeneratedDocument {
  id: DocumentId;
  file: string;
  title: string;
  markdown: string;
}

export const DOCUMENT_IDS = ["project", "requirements", "architecture", "test-plan", "test-cases", "quality-report", "changelog", "decisions", "diagrams", "client-report"] as const;
export type DocumentId = (typeof DOCUMENT_IDS)[number];
