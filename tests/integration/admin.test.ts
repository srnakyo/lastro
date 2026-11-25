import { beforeEach, describe, expect, it } from "bun:test";
import { membersService, projectsService, requirementsService } from "@lastro/core";
import { projectConfigSchema } from "@lastro/shared";
import { resetDatabase } from "../helpers/db";
import { agent, createBriefSource, createProject, createUser, discountRequirement, person } from "../helpers/fixtures";

beforeEach(resetDatabase);

describe("QA configuration", () => {
  it("is changed by a person only, and re-checks requirements against new required fields", async () => {
    const { project, actor } = await createProject();
    const source = await createBriefSource(project.id, actor);
    const req = await requirementsService.create(project.id, actor, discountRequirement(source.code));
    expect(req.status).toBe("specified");
    const stricter = projectConfigSchema.parse({ ...project.config as object, types: { calculation: { required: ["data_source", "examples", "period"] } } });
    await expect(projectsService.updateConfig(project.id, agent, stricter)).rejects.toThrow("needs a person");
    await projectsService.updateConfig(project.id, actor, stricter);
    expect((await requirementsService.get(project.id, req.code)).status).toBe("captured");
  });
});

describe("members", () => {
  it("lets an owner add, promote and remove members, and keeps one owner", async () => {
    const { workspace, actor } = await createProject();
    const other = await createUser("user-2");
    await membersService.add(workspace.id, actor, other.email, "member");
    const list = await membersService.list(workspace.id);
    expect(list.map((m) => m.role)).toEqual(["owner", "member"]);
    const [owner, newcomer] = list;
    if (!owner || !newcomer) throw new Error("expected two members");
    await expect(membersService.add(workspace.id, person(other.id), "nobody@example.test", "member")).rejects.toThrow("only owners and admins");
    await membersService.setRole(workspace.id, actor, newcomer.id, "admin");
    await expect(membersService.setRole(workspace.id, actor, owner.id, "member")).rejects.toThrow("at least one owner");
    await membersService.remove(workspace.id, actor, newcomer.id);
    expect(await membersService.list(workspace.id)).toHaveLength(1);
  });
});
