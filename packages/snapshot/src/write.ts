import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Snapshot } from "@lastro/shared";
import { stringify } from "yaml";
import { writeExtracted } from "./extracted";

const yaml = (value: unknown) => stringify(value, { lineWidth: 0, sortMapEntries: false });
const clean = <T extends Record<string, unknown>>(o: T) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null));

function writeFolder(dir: string, files: Record<string, string>) {
  mkdirSync(dir, { recursive: true });
  for (const name of readdirSync(dir)) if (name.endsWith(".yml") || name.endsWith(".md")) if (!(name in files)) rmSync(join(dir, name));
  for (const [name, content] of Object.entries(files)) writeFileSync(join(dir, name), content);
}

function requirementFile(r: Snapshot["requirements"][number]) {
  return yaml(clean({
    id: r.code, title: r.title, type: r.type, status: r.status, package: r.package,
    sources: r.citations.map((c) => clean({ ref: c.source, anchor: c.anchor, label: c.label, quote: c.quote })),
    statement: r.statement, where: r.where, who: r.who, data_source: r.dataSource, period: r.period, reach: r.reach,
    when_missing: r.whenMissing, visual_ref: r.visualRefs.length ? r.visualRefs : undefined, examples: r.examples,
    acceptance: r.criteria.map((c) => clean({ id: c.code, text: c.text, tests: c.tests, locked: c.locked })),
    decisions: r.decisions,
    questions: r.questions,
    depends_on: r.dependsOn,
    touches: r.touches,
  }));
}

/** Writes a snapshot as the .lastro/ export: deterministic, one file per entity, ready for a pull request. */
export function writeSnapshot(root: string, snapshot: Snapshot) {
  const dir = join(root, ".lastro");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "lastro.yml"), yaml(snapshot.config));
  writeFileSync(join(dir, "glossary.yml"), yaml({
    terms: snapshot.glossary.terms,
    invariants: snapshot.glossary.invariants.map((i) => clean({ id: i.code, text: i.text, tests: i.testRefs.length ? i.testRefs : undefined })),
  }));
  writeFileSync(join(dir, "design.yml"), yaml({
    components: snapshot.design.components, forbidden: snapshot.design.forbidden, palette: snapshot.design.palette, reference_screens: snapshot.design.referenceScreens,
  }));
  const sources: Record<string, string> = {};
  for (const s of snapshot.sources) {
    sources[`${s.code}.yml`] = yaml(clean({
      id: s.code, kind: s.kind, title: s.title, from: s.from, received_at: s.receivedAt.toISOString(), hash: s.hash,
      final: s.final, machine_transcript: s.machineTranscript, path: s.path, extracted: s.path ? undefined : `${s.code}.md`,
    }));
    if (!s.path) sources[`${s.code}.md`] = writeExtracted(s.passages);
  }
  writeFolder(join(dir, "sources"), sources);
  writeFolder(join(dir, "packages"), Object.fromEntries(snapshot.packages.map((p) => [`${p.code}.yml`, yaml({ id: p.code, title: p.title, sources: p.sources, report: p.report })])));
  writeFolder(join(dir, "requirements"), Object.fromEntries(snapshot.requirements.map((r) => [`${r.code}.yml`, requirementFile(r)])));
  writeFolder(join(dir, "decisions"), Object.fromEntries(snapshot.decisions.map((d) => [`${d.code}.yml`, yaml(clean({
    id: d.code, about: d.requirements, kind: d.kind, text: d.text, reason: d.reason, decided_by: d.decidedByAgent ? "agent" : d.decidedBy,
    status: d.status, show_to_client: d.showToClient, source: d.sourceRef ? { ref: d.sourceRef.split(" ")[0], anchor: d.sourceRef.split(" ").slice(1).join(" ") } : null,
  }))])));
  writeFolder(join(dir, "incidents"), Object.fromEntries(snapshot.incidents.map((i) => [`${i.code}.yml`, yaml(clean({
    id: i.code, about: i.requirement, reported: i.reported, source: i.sourceRef, triage: i.triage, cause: i.cause, billing: i.billing, regression_test: i.regressionTest,
  }))])));
  writeFolder(join(dir, "questions"), Object.fromEntries(snapshot.questions.map((q) => [`${q.code}.yml`, yaml({
    id: q.code, about: q.requirements, text: q.text, blocks: q.blocks, asked_to: q.askedTo, ...(q.askedVia ? { asked_via: q.askedVia } : {}),
    ...(q.askedAt ? { asked_at: q.askedAt.toISOString() } : {}),
    answer: q.answer ?? null, answer_source: q.answerSource ?? null, ...(q.decision ? { decision: q.decision } : {}),
  })])));
}
