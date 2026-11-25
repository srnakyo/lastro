import { beforeEach, describe, expect, it } from "bun:test";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { auditService, projectsService, requirementsService, workspacesService } from "@lastro/core";
import { database } from "@lastro/database";
import { resetDatabase } from "../helpers/db";
import { createBriefSource, createProject, createUser, discountRequirement } from "../helpers/fixtures";

const root = fileURLToPath(new URL("../..", import.meta.url));

beforeEach(resetDatabase);

describe("workspaces and projects", () => {
  it("creates a workspace with the creator as owner", async () => {
    const user = await createUser();
    const workspace = await workspacesService.create(user.id, { name: "Acme", slug: "acme" });
    expect(await workspacesService.listForUser(user.id)).toMatchObject([{ id: workspace.id, role: "owner" }]);
    await expect(workspacesService.create(user.id, { name: "Again", slug: "acme" })).rejects.toThrow("already exists");
  });

  it("refuses access to people outside the workspace", async () => {
    const { workspace } = await createProject();
    const stranger = await createUser("user-2");
    await expect(workspacesService.requireMember(workspace.id, stranger.id)).rejects.toThrow("not a member");
  });

  it("keeps one project per key inside a workspace and records it in the audit log", async () => {
    const { workspace, project, actor } = await createProject();
    const loaded = await projectsService.getByKey(workspace.id, "billing");
    expect(loaded.config.types.calculation?.required).toEqual(["data_source", "examples"]);
    await expect(projectsService.create(workspace.id, actor, { key: "billing", name: "x", config: loaded.config })).rejects.toThrow("already exists");
    const audit = await auditService.list(project.id);
    expect(audit.map((a) => a.action)).toContain("project.create");
  });

  it("never lets the audit log be edited or deleted", async () => {
    const { project } = await createProject();
    const run = (sql: string) => Promise.resolve().then(() => database().$executeRawUnsafe(sql));
    await expect(run(`update "AuditEvent" set action = 'x' where "projectId" = '${project.id}'`)).rejects.toThrow("append-only");
    await expect(run(`delete from "AuditEvent" where "projectId" = '${project.id}'`)).rejects.toThrow("append-only");
    const rows = await database().auditEvent.findMany({ where: { projectId: project.id }, select: { action: true } });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.action !== "x")).toBe(true);
  });
});

describe("the schema (REQ-F7H2Q)", () => {
  const SCOPED = ["Source", "SourceVersion", "Passage", "Package", "Requirement", "Citation", "Criterion", "CriterionTest", "Decision", "Question", "Incident", "GlossaryTerm", "Invariant", "DesignContract", "Test", "Run", "RunStage", "TestResult", "Finding", "Artifact", "Evidence", "StateEvent", "AgentSession", "AgentEvent", "DocBuild", "ApiToken"];

  it("has a projectId on every project-scoped table, filled on rows created through nested writes", async () => {
    const columns = await database().$queryRawUnsafe<{ table_name: string }[]>(`select table_name from information_schema.columns where table_schema = 'public' and column_name = 'projectId'`);
    const have = new Set(columns.map((c) => c.table_name));
    expect(SCOPED.filter((t) => !have.has(t))).toEqual([]);
    const { project, actor } = await createProject();
    const source = await createBriefSource(project.id, actor);
    await requirementsService.create(project.id, actor, discountRequirement(source.code));
    for (const table of ["SourceVersion", "Passage", "Citation", "Criterion"]) {
      const [row] = await database().$queryRawUnsafe<{ missing: bigint; total: bigint }[]>(`select count(*) filter (where "projectId" is distinct from '${project.id}') as missing, count(*) as total from "${table}"`);
      expect([table, Number(row?.missing), Number(row?.total) > 0]).toEqual([table, 0, true]);
    }
  });

  it("reports no pending migration", () => {
    const out = execFileSync("bunx", ["prisma", "migrate", "status"], { cwd: join(root, "packages/database"), env: { ...process.env }, encoding: "utf8" });
    expect(out).toContain("Database schema is up to date");
  });
});
