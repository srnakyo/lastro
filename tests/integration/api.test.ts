import { beforeEach, describe, expect, it } from "bun:test";
import { sourcesService, tokensService } from "@lastro/core";
import { handleApi } from "../../apps/web/src/api-lib";
import { handleRpc } from "../../apps/web/src/api-lib/mcp/rpc";
import { resetDatabase } from "../helpers/db";
import { createBriefSource, createProject, discountRequirement } from "../helpers/fixtures";

beforeEach(resetDatabase);

const call = (token: string, method: string, path: string, body?: unknown) =>
  handleApi(new Request(`http://lastro.test/api/v1${path}`, { method, headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined }));

async function setup() {
  const ctx = await createProject({ requireFinal: true });
  const source = await createBriefSource(ctx.project.id, ctx.actor);
  const agent = await tokensService.create(ctx.workspace.id, ctx.actor, { name: "claude", kind: "agent", projectId: ctx.project.id });
  const person = await tokensService.create(ctx.workspace.id, ctx.actor, { name: "cli", kind: "person" });
  return { ...ctx, source, agent: agent.token, person: person.token };
}

describe("REST API", () => {
  it("refuses requests without a valid token", async () => {
    const res = await call("lst_nope_x", "GET", "/projects");
    expect(res.status).toBe(403);
  });

  it("lets an agent create requirements but never approve them", async () => {
    const { agent, source } = await setup();
    const created = await call(agent, "POST", "/projects/billing/requirements", discountRequirement(source.code));
    expect(created.status).toBe(200);
    const { code } = (await created.json()) as { code: string };
    const approve = await call(agent, "POST", `/projects/billing/requirements/${code}/approve`);
    expect(approve.status).toBe(403);
    expect(((await approve.json()) as { code: string }).code).toBe("HUMAN_ONLY");
  });

  it("lets a person's token approve once the source is final, and lists what is pending", async () => {
    const { person, source, project, actor } = await setup();
    const { code } = (await (await call(person, "POST", "/projects/billing/requirements", discountRequirement(source.code))).json()) as { code: string };
    expect((await call(person, "POST", `/projects/billing/requirements/${code}/approve`)).status).toBe(409);
    await sourcesService.markFinal(project.id, actor, source.code);
    expect((await call(person, "POST", `/projects/billing/requirements/${code}/approve`)).status).toBe(200);
    const pending = (await (await call(person, "GET", "/projects/billing/pending")).json()) as { code: string; status: string }[];
    expect(pending).toEqual([expect.objectContaining({ code, status: "approved" })]);
  });

  it("exports and imports a snapshot through the API", async () => {
    const { person, source } = await setup();
    await call(person, "POST", "/projects/billing/requirements", discountRequirement(source.code));
    const snapshot = await (await call(person, "GET", "/projects/billing/export")).json();
    const imported = await call(person, "POST", "/projects/billing/import", snapshot);
    expect(((await imported.json()) as { plan: { requirements: unknown[] } }).plan.requirements).toEqual([]);
  });
});

describe("MCP", () => {
  const rpc = async (token: string, method: string, params?: Record<string, unknown>) =>
    handleRpc({ jsonrpc: "2.0", id: 1, method, params }, await tokensService.verify(token), null, "session-1");

  it("initializes and lists the tools without any human-only action", async () => {
    const { agent } = await setup();
    const init = (await rpc(agent, "initialize")) as { result: { serverInfo: { name: string } } };
    expect(init.result.serverInfo.name).toBe("lastro");
    const list = (await rpc(agent, "tools/list")) as { result: { tools: { name: string }[] } };
    const names = list.result.tools.map((t) => t.name);
    expect(names).toContain("lastro_context");
    expect(names.some((n) => /approve|accept|unlock/.test(n))).toBe(false);
  });

  it("gives the agent its context and records each call as an agent event", async () => {
    const { agent, source } = await setup();
    await rpc(agent, "tools/call", { name: "lastro_propose_requirements", arguments: { requirements: [discountRequirement(source.code)] } });
    const ctx = (await rpc(agent, "tools/call", { name: "lastro_context", arguments: {} })) as { result: { content: { text: string }[] } };
    const parsed = JSON.parse(ctx.result.content[0]?.text ?? "{}") as { pending: unknown[]; rules: string[] };
    expect(parsed.pending).toHaveLength(1);
    expect(parsed.rules.length).toBeGreaterThan(0);
  });

  it("returns tool errors as results the agent can read", async () => {
    const { agent } = await setup();
    const res = (await rpc(agent, "tools/call", { name: "lastro_get_requirement", arguments: { code: "REQ-ZZZZZ" } })) as { result: { isError: boolean; content: { text: string }[] } };
    expect(res.result.isError).toBe(true);
    expect(res.result.content[0]?.text).toContain("not found");
  });
});

describe("agent limits and hooks endpoints", () => {
  it("applies an agent's import but refuses the QA configuration change, which could loosen the gate", async () => {
    const { agent, person } = await setup();
    const snapshot = (await (await call(person, "GET", "/projects/billing/export")).json()) as { config: Record<string, unknown> };
    const res = await call(agent, "POST", "/projects/billing/import", { ...snapshot, config: { ...snapshot.config, types: {} } });
    expect(res.status).toBe(200);
    expect(((await res.json()) as { refused: { kind: string }[] }).refused.map((r) => r.kind)).toEqual(["config"]);
  });

  it("records touched files on requirements in building and lists the locked test files", async () => {
    const { agent, person, source, project, actor } = await setup();
    const input = { ...discountRequirement(source.code), criteria: [{ code: "AC-1", text: "8% at 60 seats", tests: ["tests/discount.test.ts::60 seats"] }] };
    const { code } = (await (await call(person, "POST", "/projects/billing/requirements", input)).json()) as { code: string };
    await sourcesService.markFinal(project.id, actor, source.code);
    await call(person, "POST", `/projects/billing/requirements/${code}/approve`);
    await call(agent, "POST", `/projects/billing/requirements/${code}/start`, { branch: "feat/discount" });
    const touched = (await (await call(agent, "POST", "/projects/billing/touches", { files: ["./src/discount.ts", ".lastro/x.yml"], branch: "feat/discount" })).json()) as { updated: string[] };
    expect(touched.updated).toEqual([code]);
    const locked = await (await call(agent, "GET", "/projects/billing/locked-tests")).json();
    expect(locked).toEqual([{ file: "tests/discount.test.ts", criteria: [`${code} AC-1`] }]);
  });
});
