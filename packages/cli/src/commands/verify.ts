import type { Command } from "commander";
import { LastroClient } from "../api/client";
import { findRoot, linkedProject } from "../config/project";
import { signature } from "../output";
import { offlineGate } from "./gate-ci";
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
      signature(code ? `verify ${code}` : "verify");
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
    .option("--ci", "no server: read the locked criteria from .lastro/ and run the stages here")
    .action(async (o: { json?: boolean; markdown?: boolean; ci?: boolean }) => {
      const root = findRoot();
      const offline = o.ci ? await offlineGate(root, "ci") : null;
      const result = offline ?? (await runGate(new LastroClient(), root, linkedProject(root)));
      if (offline?.manual.length) console.error(`manual stages are signed on the server and not checked offline: ${offline.manual.join(", ")}`);
      if (o.json) console.log(JSON.stringify(result, null, 2));
      else if (o.markdown) console.log(gateMarkdown(result));
      else {
        signature("gate");
        for (const [code, gate] of Object.entries(result.requirements)) printGate(code, gate);
        console.log(result.pass ? "gate: green" : "gate: red");
      }
      if (!result.pass) process.exitCode = 1;
    });

}
