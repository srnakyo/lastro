import { beforeEach, describe, expect, it } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { lifecycleService, requirementsService, tokensService } from "@lastro/core";
import { database } from "@lastro/database";
import { treeHash, verify } from "@lastro/runner";
import { projectConfigSchema } from "@lastro/shared";
import { handleApi } from "../../apps/web/src/api-lib";
import { resetDatabase } from "../helpers/db";
import { agent, createBriefSource, createProject, discountRequirement } from "../helpers/fixtures";

beforeEach(resetDatabase);

const JUNIT = (status: "pass" | "fail") => `<testsuites><testsuite name="discount.test.ts" file="discount.test.ts"><testcase name="60 seats" time="0.01">${status === "fail" ? '<failure message="expected 8%"/>' : ""}</testcase></testsuite></testsuites>`;

async function setup() {
  const ctx = await createProject();
  const config = projectConfigSchema.parse({ project: "billing", commands: { unit: { run: "sh unit.sh", report: { junit: "junit.xml" } } }, types: { calculation: { flow: ["unit"] } } });
  await database().project.update({ where: { id: ctx.project.id }, data: { config } });
  const source = await createBriefSource(ctx.project.id, ctx.actor, true);
  const input = discountRequirement(source.code);
  const req = await requirementsService.create(ctx.project.id, ctx.actor, { ...input, criteria: [{ code: "AC-1", text: "8% at 60 seats", tests: ["discount.test.ts::60 seats"] }] });
  await database().requirement.update({ where: { id: (await database().requirement.findFirstOrThrow({ where: { code: req.code } })).id }, data: { touches: ["discount.ts"] } });
  await lifecycleService.approve(ctx.project.id, ctx.actor, req.code);
  await lifecycleService.start(ctx.project.id, agent, req.code, null);
  const token = (await tokensService.create(ctx.workspace.id, ctx.actor, { name: "agent", kind: "agent", projectId: ctx.project.id })).token;
  const repo = mkdtempSync(join(tmpdir(), "lastro-verify-"));
  writeFileSync(join(repo, "discount.ts"), "export const rate = 0.08;");
  return { ...ctx, code: req.code, token, repo };
}

const api = async <T>(token: string, method: string, path: string, body?: unknown) =>
  (await (await handleApi(new Request(`http://lastro.test/api/v1/projects/billing${path}`, { method, headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined }))).json()) as T;

async function verifyOnce(token: string, repo: string, outcome: "pass" | "fail") {
  writeFileSync(join(repo, "unit.sh"), `cat > junit.xml <<'X'\n${JUNIT(outcome)}\nX\n${outcome === "fail" ? "exit 1" : "exit 0"}\n`);
  const plan = await api<{ config: unknown; requirements: { code: string; type: string; touches: string[] }[] }>(token, "GET", "/verify-plan");
  const report = await verify(repo, projectConfigSchema.parse(plan.config), plan.requirements, "agent");
  return api<{ gates: Record<string, { pass: boolean }> }>(token, "POST", "/runs", report);
}

describe("lastro verify, end to end through the API", () => {
  it("runs the project's command, records the evidence and makes it stale when a touched file changes", async () => {
    const { token, repo, code } = await setup();
    expect((await verifyOnce(token, repo, "fail")).gates[code]?.pass).toBe(false);
    expect((await verifyOnce(token, repo, "pass")).gates[code]?.pass).toBe(true);
    const gate = (trees: Record<string, string>) => api<{ pass: boolean }>(token, "POST", "/gate", { trees });
    expect((await gate({ [code]: treeHash(repo, ["discount.ts"]) })).pass).toBe(true);
    writeFileSync(join(repo, "discount.ts"), "export const rate = 0.1;");
    expect((await gate({ [code]: treeHash(repo, ["discount.ts"]) })).pass).toBe(false);
  });
});
