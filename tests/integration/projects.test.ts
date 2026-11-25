import { beforeEach, describe, expect, it } from "bun:test";
import { auditService, projectsService, workspacesService } from "@lastro/core";
import { database } from "@lastro/database";
import { resetDatabase } from "../helpers/db";
import { createProject, createUser } from "../helpers/fixtures";

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
  });
});
