import type { Command } from "commander";
import { LastroClient } from "../api/client";
import { confirmHuman } from "../confirm";
import { findRoot, linkedProject } from "../config/project";
import { runGate, runVerify, triggerFromEnv, type GateState } from "./verify-run";

function printGate(code: string, gate: GateState) {
  console.log(`${gate.pass ? "✓" : "✗"} ${code}${gate.status ? ` (${gate.status})` : ""}`);
  for (const item of gate.agentCanFix) console.log(`    fix: ${item}`);
  for (const item of gate.needsPerson) console.log(`    person: ${item}`);
}

function gateMarkdown(result: { pass: boolean; requirements: Record<string, GateState> }): string {
  const rows = Object.entries(result.requirements).map(([code, g]) => `| ${g.pass ? "✅" : "❌"} | \`${code}\` | ${g.status ?? ""} | ${[...g.agentCanFix, ...g.needsPerson].join("<br>") || "—"} |`);
  return [`### Lastro gate: ${result.pass ? "green" : "red"}`, "", rows.length ? "| | Requirement | Status | Missing |\n|---|---|---|---|" : "Nothing in building or verified.", ...rows].join("\n");
}

export function verifyCommands(program: Command) {
  program
    .command("verify")
    .description("run the QA flow of a requirement (or of everything in building) and record the evidence")
    .argument("[code]")
    .action(async (code?: string) => {
      const root = findRoot();
      const outcome = await runVerify(new LastroClient(), root, linkedProject(root), code, triggerFromEnv());
      for (const s of outcome.report.stages) console.log(`  ${s.status === "passed" ? "✓" : "✗"} ${s.requirement} ${s.stage}${s.condition ? ` · ${s.condition}` : ""} (${s.durationMs} ms)`);
      for (const [c, gate] of Object.entries(outcome.gates)) printGate(c, gate);
      console.log(`run ${outcome.runId}: ${outcome.status}`);
      if (Object.values(outcome.gates).some((g) => !g.pass)) process.exitCode = 1;
    });

  program
    .command("gate")
    .description("fail when anything in building is not verified or verified evidence went stale (for CI and hooks)")
    .option("--json", "print the result as JSON")
    .option("--markdown", "print a Markdown summary (for a CI job summary or a PR comment)")
    .action(async (o: { json?: boolean; markdown?: boolean }) => {
      const root = findRoot();
      const result = await runGate(new LastroClient(), root, linkedProject(root));
      if (o.json) console.log(JSON.stringify(result, null, 2));
      else if (o.markdown) console.log(gateMarkdown(result));
      else {
        for (const [code, gate] of Object.entries(result.requirements)) printGate(code, gate);
        console.log(result.pass ? "gate: green" : "gate: red");
      }
      if (!result.pass) process.exitCode = 1;
    });

  program
    .command("sign")
    .description("sign a manual stage, like a visual preview (a person only)")
    .argument("<code>")
    .argument("<stage>")
    .requiredOption("--ref <reference>", "where it was approved: message id, e-mail, link")
    .option("--condition <condition>")
    .option("--failed", "record that it did not pass")
    .option("--yes")
    .action(async (code: string, stage: string, o: { ref: string; condition?: string; failed?: boolean; yes?: boolean }) => {
      await confirmHuman(`Sign ${stage} of ${code} as ${o.failed ? "failed" : "passed"}?`, !!o.yes);
      const root = findRoot();
      const gate = await new LastroClient().post<GateState>(`/projects/${linkedProject(root)}/requirements/${code}/sign`, { stage, condition: o.condition ?? null, status: o.failed ? "failed" : "passed", reference: o.ref });
      printGate(code, gate);
    });
}
