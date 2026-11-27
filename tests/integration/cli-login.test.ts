import { afterAll, beforeEach, describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { CLI_LOGIN_MAX_PENDING, CLI_LOGIN_TTL_MS, cliLoginService, tokensService } from "@lastro/core";
import { database } from "@lastro/database";
import { handleApi } from "../../apps/web/src/api-lib";
import { lastro, startApi, tempRepo } from "../helpers/cli";
import { resetDatabase } from "../helpers/db";
import { createProject } from "../helpers/fixtures";

const api = startApi();
afterAll(() => api.stop());
beforeEach(resetDatabase);

const entry = fileURLToPath(new URL("../../packages/cli/src/index.ts", import.meta.url));
const post = (path: string, body: unknown) => handleApi(new Request(`http://lastro.test/api/v1${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }));

describe("authorizing a terminal in the browser", () => {
  it("gives the terminal an agent token for every project of the workspace, once, after a person authorizes it", async () => {
    const { workspace, actor } = await createProject();
    const login = await cliLoginService.start({ host: "nakyo-pc" });
    expect(login.code).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    expect(await cliLoginService.get(login.id)).toMatchObject({ host: "nakyo-pc", code: login.code, state: "pending" });
    expect(await cliLoginService.collect(login.id, login.secret)).toEqual({ status: "pending" });

    await cliLoginService.approve(login.id, workspace.id, actor);
    const done = await cliLoginService.collect(login.id, login.secret);
    if (done.status !== "approved") throw new Error(`expected approved, got ${done.status}`);
    expect(done.workspace).toEqual({ name: "Acme", slug: "acme" });
    const verified = await tokensService.verify(done.token);
    expect(verified).toMatchObject({ workspaceId: workspace.id, projectId: null, kind: "agent" });
    expect((await database().apiToken.findFirstOrThrow({ where: { id: verified.id } })).name).toBe("CLI · nakyo-pc");

    expect(cliLoginService.collect(login.id, login.secret)).rejects.toThrow("already used");
    expect((await cliLoginService.get(login.id)).state).toBe("used");
  });

  it("refuses a wrong secret, an agent answering, and an answer after 10 minutes", async () => {
    const { workspace, actor } = await createProject();
    const login = await cliLoginService.start({ host: "laptop" });
    expect(cliLoginService.collect(login.id, "not-the-secret")).rejects.toThrow("wrong secret");
    expect(cliLoginService.approve(login.id, workspace.id, { type: "agent", id: "token:lst_x" })).rejects.toThrow("needs a person");
    const later = new Date(Date.now() + CLI_LOGIN_TTL_MS + 1000);
    expect(cliLoginService.approve(login.id, workspace.id, actor, later)).rejects.toThrow("expired or was already answered");
    expect(await cliLoginService.collect(login.id, login.secret, later)).toEqual({ status: "expired" });
    expect(cliLoginService.get("not-a-login")).rejects.toThrow("does not exist");
  });

  it("tells the terminal when the person refused, and the refused login cannot be authorized afterwards", async () => {
    const { workspace, actor } = await createProject();
    const login = await cliLoginService.start({ host: "laptop\u0007\n" });
    expect((await cliLoginService.get(login.id)).host).toBe("laptop");
    await cliLoginService.deny(login.id, actor);
    expect(await cliLoginService.collect(login.id, login.secret)).toEqual({ status: "denied" });
    expect(cliLoginService.approve(login.id, workspace.id, actor)).rejects.toThrow("expired or was already answered");
    expect(cliLoginService.deny(login.id, actor)).rejects.toThrow("expired or was already answered");
  });

  it(`caps the logins waiting at ${CLI_LOGIN_MAX_PENDING}, since starting one needs no token`, async () => {
    await database().cliLogin.createMany({ data: Array.from({ length: CLI_LOGIN_MAX_PENDING }, (_, i) => ({ code: `CODE-${i}`, secretHash: "00", host: "x", expiresAt: new Date(Date.now() + CLI_LOGIN_TTL_MS) })) });
    expect(cliLoginService.start({ host: "one more" })).rejects.toThrow("too many logins waiting");
    const res = await post("/cli/login", { host: "one more" });
    expect(res.status).toBe(429);
  });

  it("serves the start and the polling without a token, and nothing else", async () => {
    await createProject();
    const started = await post("/cli/login", { host: "pc" });
    expect(started.status).toBe(200);
    const { id } = (await started.json()) as { id: string };
    expect((await post(`/cli/login/${id}`, { secret: "wrong" })).status).toBe(403);
    expect((await handleApi(new Request("http://lastro.test/api/v1/projects"))).status).toBe(403);
  });
});

describe("lastro login", () => {
  it("waits for the browser, stores the token, and then init works in a repository with no token in the environment", async () => {
    const { workspace, actor } = await createProject();
    const repo = tempRepo();
    const env = { PATH: process.env.PATH ?? "", HOME: repo, XDG_CONFIG_HOME: join(repo, ".config"), LASTRO_LOGIN_POLL_MS: "50" };
    const proc = Bun.spawn(["bun", entry, "login", "--url", api.url, "--no-browser"], { cwd: repo, env, stdin: "ignore", stdout: "pipe", stderr: "pipe" });
    const reader = proc.stdout.getReader();
    let printed = "";
    while (!/cli\/authorize\/([0-9a-f-]{36})/.test(printed)) {
      const { value, done } = await reader.read();
      if (done) throw new Error(`lastro login ended before printing the link: ${printed}`);
      printed += new TextDecoder().decode(value);
    }
    const id = /cli\/authorize\/([0-9a-f-]{36})/.exec(printed)?.[1] ?? "";
    expect(printed).toContain(`${api.url}/cli/authorize/${id}`);
    expect(printed).toContain((await cliLoginService.get(id)).code);
    await cliLoginService.approve(id, workspace.id, actor);
    expect(await proc.exited).toBe(0);

    const stored = JSON.parse(readFileSync(join(repo, ".config", "lastro", "credentials.json"), "utf8")) as { current: string; servers: Record<string, { token: string }> };
    expect(stored.current).toBe(api.url);
    expect((await tokensService.verify(stored.servers[api.url]?.token ?? "")).kind).toBe("agent");

    // The agent token links the repository to a project a person created; it does not create projects.
    const run = async (args: string[]) => {
      const p = Bun.spawn(["bun", entry, ...args], { cwd: repo, env, stdin: "ignore", stdout: "pipe", stderr: "pipe" });
      const [stdout, stderr, code] = await Promise.all([new Response(p.stdout).text(), new Response(p.stderr).text(), p.exited]);
      return { stdout, stderr, code };
    };
    const missing = await run(["init", "shop"]);
    expect(missing.code).toBe(1);
    expect(missing.stderr).toContain(`the project shop does not exist yet: create it in the dashboard (${api.url}, New project, key shop)`);
    const linked = await run(["init", "billing"]);
    expect(linked.stdout).toContain("linked to the existing project billing");
    expect(readFileSync(join(repo, ".lastro", "lastro.yml"), "utf8")).toContain("project: billing");
  });

  it("stores a token made by hand for one project under that project", async () => {
    const { workspace, actor, project } = await createProject();
    const token = (await tokensService.create(workspace.id, actor, { name: "ci", kind: "agent", projectId: project.id })).token;
    const repo = tempRepo();
    const res = await lastro(["login", "--url", api.url, "--token", token], { cwd: repo, url: "", token: "" });
    expect(res.stdout).toContain("only for the billing project");
    const stored = JSON.parse(readFileSync(join(repo, ".config", "lastro", "credentials.json"), "utf8")) as { servers: Record<string, { projects: Record<string, string> }> };
    expect(stored.servers[api.url]?.projects.billing).toBe(token);
  });
});
