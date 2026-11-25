import type { Command } from "commander";
import { snapshotSchema, type Snapshot } from "@lastro/shared";
import { readSnapshot, writeSnapshot } from "@lastro/snapshot";
import { LastroClient } from "../api/client";
import { confirmHuman } from "../confirm";
import { findRoot, linkedProject } from "../config/project";

interface Change {
  code: string;
  change: string;
  fields?: string[];
}

interface ImportReport {
  plan: { sources: Change[]; packages: string[]; terms: string[]; requirements: Change[]; decisions: Change[]; questions: Change[]; incidents: string[]; human: { kind: string; target: string; detail: string }[] };
  applied: { kind: string; target: string }[];
  refused: { kind: string; target: string; reason: string }[];
}

function printPlan(plan: ImportReport["plan"]): number {
  const lines = [
    ...plan.sources.map((s) => `  source ${s.code}: ${s.change.replace("_", " ")}`),
    ...plan.packages.map((p) => `  package ${p}`),
    ...plan.terms.map((t) => `  glossary term ${t}`),
    ...plan.requirements.map((r) => `  ${r.code}: ${r.change}${r.fields?.length ? ` (${r.fields.join(", ")})` : ""}`),
    ...plan.decisions.map((d) => `  ${d.code}: ${d.change}`),
    ...plan.questions.map((q) => `  ${q.code}: ${q.change}`),
    ...plan.incidents.map((i) => `  ${i}: new`),
    ...plan.human.map((h) => `  ${h.target}: ${h.kind.replace("_", " ")} (${h.detail}) [a person's action]`),
  ];
  console.log(lines.length ? `changes:\n${lines.join("\n")}` : "nothing to import: the server already has this .lastro/");
  return lines.length;
}

export function snapshotCommands(program: Command) {
  program
    .command("import")
    .description("load this repository's .lastro/ into the server, after showing what changes")
    .option("--dry-run", "only show what would change")
    .option("--yes", "apply without asking")
    .action(async (o: { dryRun?: boolean; yes?: boolean }) => {
      const root = findRoot();
      const client = new LastroClient();
      const path = `/projects/${linkedProject(root)}/import`;
      const snapshot = await readSnapshot(root);
      const preview = await client.post<ImportReport>(`${path}?dryRun=1`, snapshot);
      if (printPlan(preview.plan) === 0 || o.dryRun) return;
      if (!o.yes) {
        if (!process.stdin.isTTY) throw new Error("run it in a terminal to confirm, or pass --yes");
        await confirmHuman("Apply these changes?", false);
      }
      const report = await client.post<ImportReport>(path, snapshot);
      for (const a of report.applied) console.log(`applied: ${a.kind.replace("_", " ")} ${a.target}`);
      for (const r of report.refused) console.log(`refused: ${r.kind.replace("_", " ")} ${r.target}: ${r.reason}`);
      console.log("imported");
    });

  program
    .command("export")
    .description("write the project as it is on the server into .lastro/")
    .action(async () => {
      const root = findRoot();
      const snapshot = snapshotSchema.parse(await new LastroClient().get<Snapshot>(`/projects/${linkedProject(root)}/export`));
      writeSnapshot(root, snapshot);
      console.log(`wrote ${snapshot.requirements.length} requirements, ${snapshot.decisions.length} decisions, ${snapshot.questions.length} questions to .lastro/`);
    });
}
