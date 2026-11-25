import { criterionHash, type ProjectConfig, type Snapshot, type Stage } from "@lastro/shared";
import { readSnapshot } from "@lastro/snapshot";
import { mergeResults, verify, type RunReport } from "@lastro/runner";
import type { GateState } from "./verify-run";

const SELECTED = ["approved", "building", "verified", "reopened", "previewed", "delivered", "accepted"];

const testFilesOf = (r: Snapshot["requirements"][number]) => [...new Set(r.criteria.flatMap((c) => c.tests.map((t) => t.split("::")[0] ?? t)))].sort();

function manualStages(config: ProjectConfig, type: string): string[] {
  const flow: Stage[] = [...config.global_flow, ...(config.types[type]?.flow ?? [])];
  return flow.flatMap((s) => (typeof s === "object" && s.manual ? [s.check ?? s.run ?? "stage"] : []));
}

async function judge(r: Snapshot["requirements"][number], report: RunReport): Promise<GateState> {
  const agentCanFix: string[] = [];
  const stages = report.stages.filter((s) => s.requirement === r.code);
  for (const s of stages) {
    if (s.status === "passed") continue;
    const label = `${s.stage}${s.condition ? ` · ${s.condition}` : ""}`;
    agentCanFix.push(`${label} ${s.status}`);
    for (const f of s.findings.filter((x) => x.level === "error").slice(0, 20)) agentCanFix.push(`${label}: ${f.file ?? "?"}${f.line ? `:${f.line}` : ""} ${f.ruleId ?? ""} ${f.message}`.trim());
  }
  // A test can run under several conditions: it passes if it passed under one and was skipped under the others.
  const results = new Map(mergeResults(stages.flatMap((s) => s.results)).map((t) => [t.ref, t.status] as const));
  for (const c of r.criteria) {
    if (c.locked && (await criterionHash(c.text, c.tests)) !== c.locked) agentCanFix.push(`locked criterion changed: ${c.code}`);
    if (c.tests.length === 0) agentCanFix.push(`${c.code} has no test`);
    for (const t of c.tests) if (results.get(t) !== "passed") agentCanFix.push(`${c.code} ${t} ${results.get(t) ?? "not run"}`);
  }
  return { pass: agentCanFix.length === 0, agentCanFix, needsPerson: [], status: r.status };
}

/**
 * The gate without a server (REQ-A2C7H): the locked criteria come from the .lastro/ export, the stages run
 * here, and only what ran here counts. Manual stages are signed on the server, so they are only listed.
 */
export async function offlineGate(root: string, trigger: RunReport["trigger"]) {
  const snapshot = await readSnapshot(root);
  const selected = snapshot.requirements.filter((r) => SELECTED.includes(r.status));
  if (selected.length === 0) return { pass: true, requirements: {} as Record<string, GateState>, manual: [] as string[] };
  const report = await verify(root, snapshot.config, selected.map((r) => ({ code: r.code, type: r.type, touches: r.touches, testFiles: testFilesOf(r) })), trigger);
  const requirements: Record<string, GateState> = {};
  for (const r of selected) requirements[r.code] = await judge(r, report);
  const manual = selected.flatMap((r) => manualStages(snapshot.config, r.type).map((s) => `${r.code} ${s}`));
  return { pass: Object.values(requirements).every((g) => g.pass), requirements, manual };
}
