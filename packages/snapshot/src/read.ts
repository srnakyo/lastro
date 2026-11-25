import { join } from "node:path";
import { markdownPassages } from "@lastro/core/text";
import { snapshotSchema, type Snapshot } from "@lastro/shared";
import { existsSync, readFileSync } from "node:fs";
import { readExtracted } from "./extracted";
import { validateExport } from "./validate";
import { markdownFiles, readYaml, sha256, yamlFiles } from "./files";

type Raw = Record<string, unknown>;
const asList = (v: unknown) => (Array.isArray(v) ? v : []);

async function readSource(root: string, raw: Raw) {
  const path = typeof raw.path === "string" ? raw.path : undefined;
  if (!path) return readStoredSource(root, raw);
  const files = markdownFiles(root, path);
  return {
    code: raw.id, kind: raw.kind, title: raw.title, from: raw.from, receivedAt: raw.received_at,
    final: raw.final === true, machineTranscript: raw.machine_transcript === true, path,
    hash: await sha256(files.map((f) => `${f.name}\n${f.content}`).join("\n")),
    passages: markdownPassages(files).map((p) => ({ anchor: p.anchor, heading: p.heading ?? undefined, text: p.text })),
  };
}

/** A source that lives outside the repository: its extracted text sits next to the metadata. */
function readStoredSource(root: string, raw: Raw) {
  const file = join(root, ".lastro", "sources", String(raw.extracted ?? `${String(raw.id)}.md`));
  if (!existsSync(file)) throw new Error(`${String(raw.id)}: extracted text ${file} is missing`);
  return {
    code: raw.id, kind: raw.kind, title: raw.title, from: raw.from, receivedAt: raw.received_at, final: raw.final === true,
    machineTranscript: raw.machine_transcript === true, hash: raw.hash, passages: readExtracted(readFileSync(file, "utf8")),
  };
}

function readRequirement(raw: Raw) {
  return {
    code: raw.id, status: raw.status, title: raw.title, type: raw.type, statement: raw.statement,
    package: raw.package, where: raw.where, who: raw.who, dataSource: raw.data_source, period: raw.period,
    reach: raw.reach, whenMissing: raw.when_missing, examples: raw.examples ?? [], visualRefs: raw.visual_ref ?? [],
    dependsOn: raw.depends_on ?? [],
    touches: raw.touches ?? [],
    decisions: raw.decisions ?? [],
    questions: raw.questions ?? [],
    citations: asList(raw.sources).map((c: Raw) => ({ source: c.ref, anchor: c.anchor, label: c.label, quote: c.quote })),
    criteria: asList(raw.acceptance).map((a: Raw) => ({ code: a.id, text: a.text, tests: a.tests ?? [], locked: a.locked ?? null })),
  };
}

/** Reads a .lastro/ folder (the export format) into a validated snapshot; invalid files are named with the field and the reason. */
export async function readSnapshot(root: string): Promise<Snapshot> {
  const problems = validateExport(root);
  if (problems.length) throw new Error(`.lastro/ has invalid files:\n${problems.map((p) => `  ${p.file}${p.path ? ` ${p.path}` : ""}: ${p.message}`).join("\n")}`);
  const dir = join(root, ".lastro");
  const glossary = (readYaml(join(dir, "glossary.yml")) ?? {}) as Raw;
  const design = (existsSync(join(dir, "design.yml")) ? (readYaml(join(dir, "design.yml")) ?? {}) : {}) as Raw;
  const raw = {
    config: readYaml(join(dir, "lastro.yml")),
    glossary: {
      terms: asList(glossary.terms),
      invariants: asList(glossary.invariants).map((i: Raw) => ({ code: i.id, text: i.text, testRefs: i.tests ?? [] })),
    },
    design: { components: design.components ?? {}, forbidden: design.forbidden ?? [], palette: design.palette ?? {}, referenceScreens: design.reference_screens ?? [] },
    incidents: yamlFiles(join(dir, "incidents")).map((f) => {
      const i = readYaml(f) as Raw;
      const source = i.source as Raw | string | undefined;
      const sourceRef = typeof source === "object" && source ? `${String(source.ref)}${source.anchor ? ` ${String(source.anchor)}` : ""}` : source;
      return { code: i.id, reported: i.reported, sourceRef, requirement: i.requirement ?? i.about, triage: i.triage, cause: i.cause, billing: i.billing, regressionTest: i.regression_test };
    }),
    sources: await Promise.all(yamlFiles(join(dir, "sources")).map((f) => readSource(root, readYaml(f) as Raw))),
    packages: yamlFiles(join(dir, "packages")).map((f) => {
      const p = readYaml(f) as Raw;
      return { code: p.id, title: p.title, sources: p.sources ?? [], report: p.report ?? true };
    }),
    requirements: yamlFiles(join(dir, "requirements")).map((f) => readRequirement(readYaml(f) as Raw)),
    decisions: yamlFiles(join(dir, "decisions")).map((f) => {
      const d = readYaml(f) as Raw;
      const source = d.source as Raw | null | undefined;
      return {
        code: d.id, kind: d.kind, text: d.text, reason: d.reason, decidedBy: d.decided_by === "agent" ? "dev" : d.decided_by, decidedByAgent: d.decided_by === "agent",
        status: d.status, showToClient: d.show_to_client ?? true, requirements: asList(d.about).filter((a) => String(a).startsWith("REQ-")),
        sourceRef: source ? `${String(source.ref)} ${String(source.anchor)}` : undefined,
      };
    }),
    questions: yamlFiles(join(dir, "questions")).map((f) => {
      const q = readYaml(f) as Raw;
      return {
        code: q.id, text: q.text, blocks: q.blocks ?? false, askedTo: q.asked_to, askedVia: q.asked_via, askedAt: q.asked_at,
        answer: q.answer ?? null, answerSource: q.answer_source ?? null, decision: q.decision ?? undefined, requirements: asList(q.about).filter((a) => String(a).startsWith("REQ-")),
      };
    }),
  };
  return snapshotSchema.parse(raw);
}
