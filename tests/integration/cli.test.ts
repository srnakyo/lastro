import { afterAll, beforeEach, describe, expect, it } from "bun:test";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { lifecycleService, requirementsService, sourcesService, tokensService } from "@lastro/core";
import { database } from "@lastro/database";
import { lastro, startApi, tempRepo } from "../helpers/cli";
import { resetDatabase } from "../helpers/db";
import { createBriefSource, createProject, discountRequirement } from "../helpers/fixtures";

const api = startApi();
afterAll(() => api.stop());
beforeEach(resetDatabase);

async function setup() {
  const ctx = await createProject({ requireFinal: true });
  const person = (await tokensService.create(ctx.workspace.id, ctx.actor, { name: "cli", kind: "person" })).token;
  const agentToken = (await tokensService.create(ctx.workspace.id, ctx.actor, { name: "agent", kind: "agent" })).token;
  const repo = tempRepo();
  return { ...ctx, person, agentToken, repo, run: (args: string[], token = person, env?: Record<string, string>) => lastro(args, { cwd: repo, url: api.url, token, env }) };
}

describe("lastro init (REQ-0C4N1)", () => {
  it("creates the project and the whole .lastro/ export, then says it is already initialized without changing anything", async () => {
    const { run, repo } = await setup();
    const first = await run(["init", "shop"]);
    expect(first.code).toBe(0);
    for (const path of ["lastro.yml", "glossary.yml", "design.yml", "sources", "requirements", "decisions", "questions", "incidents", "packages"]) expect(existsSync(join(repo, ".lastro", path))).toBe(true);
    expect(readFileSync(join(repo, ".gitignore"), "utf8")).toContain(".lastro/.out/");
    expect(readFileSync(join(repo, ".lastro", "lastro.yml"), "utf8")).toContain("project: shop");
    const before = readFileSync(join(repo, ".lastro", "lastro.yml"), "utf8");
    const again = await run(["init", "shop"]);
    expect(again.code).toBe(0);
    expect(again.stdout).toContain("already initialized");
    expect(readFileSync(join(repo, ".lastro", "lastro.yml"), "utf8")).toBe(before);
    expect(await database().project.count({ where: { key: "shop" } })).toBe(1);
  });
});

describe("human commands on the terminal (REQ-E4G7N)", () => {
  async function specified() {
    const ctx = await setup();
    const source = await createBriefSource(ctx.project.id, ctx.actor, true);
    const req = await requirementsService.create(ctx.project.id, ctx.actor, discountRequirement(source.code));
    await sourcesService.markFinal(ctx.project.id, ctx.actor, source.code).catch(() => undefined);
    await ctx.run(["init", "billing"]);
    return { ...ctx, code: req.code };
  }

  it("refuses with exit code 2 and changes nothing when there is no terminal and no --yes", async () => {
    const { run, project, code } = await specified();
    const res = await run(["approve", code]);
    expect(res.code).toBe(2);
    expect((await requirementsService.get(project.id, code)).status).toBe("specified");
  });

  it("accepts --yes only from a person listed in gate.human_identities", async () => {
    const { run, project, code, repo } = await specified();
    expect((await run(["approve", code, "--yes"])).code).toBe(2);
    const yml = join(repo, ".lastro", "lastro.yml");
    writeFileSync(yml, readFileSync(yml, "utf8").replace("human_identities: []", "human_identities:\n    - user-1@example.test"));
    const res = await run(["approve", code, "--yes"]);
    expect(res.code).toBe(0);
    expect((await requirementsService.get(project.id, code)).status).toBe("approved");
  });
});

describe("lastro pending and lastro gate", () => {
  it("lists the missing fields by name, grouped by reason (REQ-3M5TX, REQ-7V6KE)", async () => {
    const { run, project, actor } = await setup();
    const source = await createBriefSource(project.id, actor);
    const input = discountRequirement(source.code);
    await requirementsService.create(project.id, actor, { ...input, dataSource: undefined, examples: [] });
    await requirementsService.create(project.id, actor, input);
    await run(["init", "billing"]);
    const res = await run(["pending"]);
    expect(res.stdout).toContain("missing fields (1)");
    expect(res.stdout).toContain("missing: data_source, examples");
    expect(res.stdout).toContain("awaiting approval (1)");
  });

  it("exits 1 and lists a criterion without a test under what the agent can fix (REQ-A2C7H)", async () => {
    const { run, project, actor, agentToken } = await setup();
    const source = await createBriefSource(project.id, actor, true);
    const req = await requirementsService.create(project.id, actor, discountRequirement(source.code));
    await sourcesService.markFinal(project.id, actor, source.code).catch(() => undefined);
    await lifecycleService.approve(project.id, actor, req.code);
    await run(["init", "billing"]);
    await run(["req", "start", req.code], agentToken);
    const res = await run(["gate"], agentToken);
    expect(res.code).toBe(1);
    expect(res.stdout).toContain("fix: AC-1 has no test");
  });

  it("runs offline from the export with --ci and checks the locked criteria (REQ-A2C7H AC-3)", async () => {
    const { run, project, actor, repo } = await setup();
    const source = await createBriefSource(project.id, actor, true);
    const input = discountRequirement(source.code);
    const req = await requirementsService.create(project.id, actor, { ...input, criteria: [{ code: "AC-1", text: "8% at 60 seats", tests: ["discount.test.ts::60 seats"] }] });
    await sourcesService.markFinal(project.id, actor, source.code).catch(() => undefined);
    await lifecycleService.approve(project.id, actor, req.code);
    await run(["init", "billing"]);
    await run(["export"]);
    const yml = join(repo, ".lastro", "lastro.yml");
    writeFileSync(yml, readFileSync(yml, "utf8").replace("commands: {}", 'commands:\n  unit:\n    run: sh unit.sh\n    report:\n      junit: junit.xml').replace(/types:\n[\s\S]*?global_flow/, "types:\n  calculation:\n    flow: [unit]\nglobal_flow"));
    writeFileSync(join(repo, "unit.sh"), `cat > junit.xml <<'X'\n<testsuites><testsuite name="discount.test.ts" file="discount.test.ts"><testcase name="60 seats"/></testsuite></testsuites>\nX\n`);
    const green = await run(["gate", "--ci"], "", { LASTRO_URL: "" });
    expect(green.stdout).toContain("gate: green");
    expect(green.code).toBe(0);
    const reqFile = join(repo, ".lastro", "requirements", `${req.code}.yml`);
    writeFileSync(reqFile, readFileSync(reqFile, "utf8").replace("8% at 60 seats", "7% at 60 seats"));
    const red = await run(["gate", "--ci"], "", { LASTRO_URL: "" });
    expect(red.code).toBe(1);
    expect(red.stdout).toContain("locked criterion changed: AC-1");
  });
});

describe("lastro doctor (REQ-1F7QA, REQ-G2J5R)", () => {
  it("names the file, the field and the allowed values of an invalid status, and exits 1", async () => {
    const { run, repo, project, actor } = await setup();
    const source = await createBriefSource(project.id, actor);
    const req = await requirementsService.create(project.id, actor, discountRequirement(source.code));
    await run(["init", "billing"]);
    expect((await run(["doctor"])).code).toBe(0);
    const file = join(repo, ".lastro", "requirements", `${req.code}.yml`);
    writeFileSync(file, readFileSync(file, "utf8").replace(/^status: .*$/m, "status: done"));
    const res = await run(["doctor"]);
    expect(res.code).toBe(1);
    expect(res.stdout).toContain(`.lastro/requirements/${req.code}.yml › status`);
    expect(res.stdout).toContain('"specified"');
  });

  it("fails on a literal token or database URL with credentials in lastro.yml", async () => {
    const { run, repo } = await setup();
    await run(["init", "billing"]);
    const yml = join(repo, ".lastro", "lastro.yml");
    writeFileSync(yml, `${readFileSync(yml, "utf8")}\nnotes: postgresql://lastro:secret@db:5432/lastro\n`);
    const res = await run(["doctor"]);
    expect(res.code).toBe(1);
    expect(res.stdout).toContain("server.url_env");
  });
});
