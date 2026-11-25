import { projectConfigSchema } from "@lastro/shared";
import { boundFiles, commitInfo, fileHashes, treeHash, verify, type RunReport } from "@lastro/runner";
import type { LastroClient } from "../api/client";

interface Plan {
  config: unknown;
  requirements: { code: string; type: string; touches: string[]; status: string; testFiles: string[] }[];
}

export interface GateState {
  pass: boolean;
  agentCanFix: string[];
  needsPerson: string[];
  status?: string;
}

export interface VerifyOutcome {
  runId: string;
  status: string;
  gates: Record<string, GateState>;
  report: RunReport;
}

const query = (code?: string) => (code ? `?code=${encodeURIComponent(code)}` : "");

/** Runs the stages of the requirements on this machine and records the run on the server. */
export async function runVerify(client: LastroClient, root: string, project: string, code: string | undefined, trigger: RunReport["trigger"]): Promise<VerifyOutcome> {
  const plan = await client.get<Plan>(`/projects/${project}/verify-plan${query(code)}`);
  const config = projectConfigSchema.parse(plan.config);
  const targets = plan.requirements.filter((r) => code || r.status !== "verified");
  if (targets.length === 0) throw new Error(code ? `${code} not found` : "nothing in building: start a requirement first");
  const report = await verify(root, config, targets, trigger);
  const saved = await client.post<{ runId: string; status: string; gates: Record<string, GateState> }>(`/projects/${project}/runs`, report);
  return { ...saved, report };
}

/** Fingerprints the touched files of every active requirement and asks the server for the gate. */
export async function runGate(client: LastroClient, root: string, project: string) {
  const plan = await client.get<Plan>(`/projects/${project}/verify-plan`);
  const trees = Object.fromEntries(plan.requirements.map((r) => [r.code, treeHash(root, boundFiles(r))]));
  const testFiles = fileHashes(root, plan.requirements.flatMap((r) => r.testFiles));
  return client.post<{ pass: boolean; requirements: Record<string, GateState> }>(`/projects/${project}/gate`, { trees, commit: commitInfo(root).commit, testFiles });
}

export const triggerFromEnv = (): RunReport["trigger"] => (process.env.CI ? "ci" : "dev");
