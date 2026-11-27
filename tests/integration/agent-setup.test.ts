import { beforeEach, describe, expect, it } from "bun:test";
import { projectsService, snapshotService, exportSnapshot } from "@lastro/core";
import { projectConfigSchema } from "@lastro/shared";
import { database } from "@lastro/database";
import { resetDatabase } from "../helpers/db";
import { createProject } from "../helpers/fixtures";

beforeEach(resetDatabase);

const agent = { type: "agent" as const, id: "token:lst_setup" };

describe("the agent sets a project up by itself, and only a person loosens it", () => {
  it("creates a project with the strict start, whatever configuration it sends", async () => {
    const { workspace } = await createProject();
    const lax = projectConfigSchema.parse({ project: "waship", language: "pt-BR", tests: { red_first: false }, types: {} });
    const project = await projectsService.create(workspace.id, agent, { key: "waship", name: "WAship", config: lax });
    const config = projectConfigSchema.parse(project.config);
    expect(config.language).toBe("pt-BR");
    expect(config.tests.red_first).toBe(true);
    expect(config.tests.red_first_since).toBeDefined();
    expect(config.types.ui?.tests.levels).toEqual(["unit", "e2e"]);
    const audit = await database().auditEvent.findFirstOrThrow({ where: { projectId: project.id, action: "project.create" } });
    expect(audit.actorType).toBe("agent");
  });

  it("sets up the commands and the flow of a type, and is refused, with the reason, when it turns a rule off", async () => {
    const { project } = await createProject({ tests: { red_first: true } });
    const current = projectConfigSchema.parse(project.config);
    const setUp = { ...current, commands: { unit: { run: "bun test --reporter=junit --reporter-outfile=out/unit.xml", report: { junit: "out/unit.xml" } } }, types: { ...current.types, calculation: { required: [], tests: { levels: [] }, ...current.types.calculation, flow: ["unit"] } } };
    await projectsService.updateConfig(project.id, agent, setUp);
    const after = projectConfigSchema.parse((await database().project.findUniqueOrThrow({ where: { id: project.id } })).config);
    expect(after.commands.unit?.run).toContain("bun test");
    expect(after.types.calculation?.flow).toEqual(["unit"]);

    const off = { ...after, tests: { ...after.tests, red_first: false } };
    await expect(projectsService.updateConfig(project.id, agent, off)).rejects.toThrow("only a person can loosen the QA rules: tests.red_first off");
    await projectsService.updateConfig(project.id, { type: "user", id: "someone" }, off);
  });

  it("lets the agent say which test files are at which level and which files coverage cannot measure, and audits each change", async () => {
    const { project } = await createProject();
    const initial = projectConfigSchema.parse(project.config);
    const levels: Record<string, string[]> = { ...initial.tests.levels, unit: ["backend/**/*_test.go", ...(initial.tests.levels.unit ?? [])] };
    const withGo = { ...initial, tests: { ...initial.tests, levels } };
    await projectsService.updateConfig(project.id, agent, withGo);
    const current = withGo;
    const described = {
      ...current,
      tests: {
        ...current.tests,
        levels: { ...current.tests.levels, unit: (current.tests.levels.unit ?? []).filter((g) => !g.includes("_test.go")), integration: ["backend/**/*_test.go", ...(current.tests.levels.integration ?? [])] },
        coverage_exclude: ["backend/cmd/**", "front/**/*.config.*", "scripts/**"],
      },
    };
    await projectsService.updateConfig(project.id, agent, described);
    const audit = await database().auditEvent.findFirstOrThrow({ where: { projectId: project.id, action: "project.config" }, orderBy: { createdAt: "desc" } });
    expect(audit.actorType).toBe("agent");
    const changes = (audit.data as { changes: string[] }).changes;
    expect(changes).toContain("tests.levels.integration +backend/**/*_test.go");
    expect(changes).toContain("tests.coverage_exclude +backend/cmd/**");
    expect(changes).toContain("tests.coverage_exclude +scripts/**");
    expect(changes).toContain("tests.levels.unit -backend/**/*_test.go");
  });

  it("applies the commands an agent's import brings, and names what it would loosen", async () => {
    const { project } = await createProject();
    const snapshot = await exportSnapshot(project.id);
    const withCommand = { ...snapshot, config: { ...snapshot.config, commands: { e2e: { run: "bunx playwright test" } } } };
    const report = await snapshotService.import(project.id, agent, withCommand);
    expect(report.applied.map((a) => a.kind)).toEqual(["config"]);
    const loosened = { ...withCommand, config: { ...withCommand.config, types: {} } };
    const refused = await snapshotService.import(project.id, agent, loosened);
    expect(refused.refused).toEqual([expect.objectContaining({ kind: "config", reason: expect.stringContaining("type calculation removed") })]);
  });
});
