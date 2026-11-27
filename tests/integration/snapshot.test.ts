import { beforeEach, describe, expect, it } from "bun:test";
import { fileURLToPath } from "node:url";
import { exportSnapshot, lifecycleService, overviewService, projectsService, requirementsService, snapshotService, sourcesService } from "@lastro/core";
import { database } from "@lastro/database";
import { readSnapshot } from "@lastro/snapshot";
import { resetDatabase } from "../helpers/db";
import { agent, createBriefSource, createProject, discountRequirement } from "../helpers/fixtures";

const root = fileURLToPath(new URL("../..", import.meta.url));

beforeEach(resetDatabase);

describe("importing this repository's .lastro/", () => {
  it("loads every requirement with its quotes found in the PRD, and recomputes statuses", async () => {
    const snapshot = await readSnapshot(root);
    const { project, actor } = await createProject();
    const report = await snapshotService.import(project.id, actor, snapshot);
    expect(report.plan.requirements.filter((r) => r.change === "new")).toHaveLength(snapshot.requirements.length);
    const views = await requirementsService.list(project.id);
    expect(views.every((v) => v.citations.every((c) => c.found))).toBe(true);
    // The repository runs in automatic mode: what has every criterion tested is approved and locked by Lastro.
    expect(views.every((v) => (v.status === "approved" ? v.criteria.every((c) => c.lockedHash) : ["specified", "captured"].includes(v.status)))).toBe(true);
    expect(await database().decision.count({ where: { projectId: project.id } })).toBe(snapshot.decisions.length);
  });

  it("is idempotent: a second import plans nothing and adds no source version", async () => {
    const snapshot = await readSnapshot(root);
    const { project, actor } = await createProject();
    await snapshotService.import(project.id, actor, snapshot);
    const again = await snapshotService.import(project.id, actor, snapshot);
    expect(again.plan.requirements).toEqual([]);
    expect(again.plan.sources).toEqual([]);
    expect(again.plan.human).toEqual([]);
    expect(await database().sourceVersion.count()).toBe(1);
  });

  it("feeds the overview: coverage, pending criteria and quality per module", async () => {
    const { project, actor } = await createProject();
    await snapshotService.import(project.id, actor, await readSnapshot(root));
    const o = await overviewService.project(project.id);
    expect(o.requirements).toBeGreaterThan(20);
    expect(o.pending).toBe(o.requirements);
    expect(o.modules.length).toBeGreaterThan(1);
  });
});

describe("import and human actions", () => {
  async function approvedProject() {
    const ctx = await createProject({ requireFinal: true });
    const source = await createBriefSource(ctx.project.id, ctx.actor);
    const req = await requirementsService.create(ctx.project.id, ctx.actor, discountRequirement(source.code));
    await sourcesService.markFinal(ctx.project.id, ctx.actor, source.code);
    return { ...ctx, source, code: req.code };
  }

  it("keeps the date each criterion was locked through export and import, and only a person's import restores it", async () => {
    const { project, actor, code } = await approvedProject();
    await lifecycleService.approve(project.id, actor, code);
    const first = new Date("2026-01-15T10:00:00.000Z");
    const criteria = { requirement: { projectId: project.id, code } };
    await database().criterion.updateMany({ where: criteria, data: { lockedAt: first } });
    const snapshot = await exportSnapshot(project.id);
    expect(snapshot.requirements[0]?.criteria[0]?.lockedAt).toBe(first.toISOString());

    const relocked = new Date("2026-11-27T09:00:00.000Z");
    await database().criterion.updateMany({ where: criteria, data: { lockedAt: relocked } });
    await snapshotService.import(project.id, agent, snapshot);
    expect((await database().criterion.findFirstOrThrow({ where: criteria })).lockedAt).toEqual(relocked);
    await snapshotService.import(project.id, actor, snapshot);
    expect((await database().criterion.findFirstOrThrow({ where: criteria })).lockedAt).toEqual(first);
  });

  it("re-importing an unchanged export keeps approvals and locks", async () => {
    const { project, actor, code } = await approvedProject();
    await lifecycleService.approve(project.id, actor, code);
    await lifecycleService.start(project.id, agent, code, null);
    const report = await snapshotService.import(project.id, agent, await exportSnapshot(project.id));
    expect(report.plan.requirements).toEqual([]);
    const view = await requirementsService.get(project.id, code);
    expect(view.status).toBe("building");
    expect(view.criteria.every((c) => c.lockedHash)).toBe(true);
  });

  it("refuses a hand-made approval in an agent's import and names it; a person's import applies it", async () => {
    const { project, actor, code } = await approvedProject();
    const snapshot = await exportSnapshot(project.id);
    const edited = { ...snapshot, requirements: snapshot.requirements.map((r) => (r.code === code ? { ...r, status: "approved" as const } : r)) };
    const byAgent = await snapshotService.import(project.id, agent, edited);
    expect(byAgent.refused).toEqual([expect.objectContaining({ kind: "approve", target: code })]);
    expect((await requirementsService.get(project.id, code)).status).toBe("specified");
    const byPerson = await snapshotService.import(project.id, actor, edited);
    expect(byPerson.applied).toEqual([expect.objectContaining({ kind: "approve", target: code })]);
    expect((await requirementsService.get(project.id, code)).status).toBe("approved");
  });

  it("keeps the QA configuration when an agent's snapshot changes it", async () => {
    const { project } = await approvedProject();
    const snapshot = await exportSnapshot(project.id);
    const loosened = { ...snapshot, config: { ...snapshot.config, global_flow: [], types: {} } };
    const report = await snapshotService.import(project.id, agent, loosened);
    expect(report.refused.map((a) => a.kind)).toContain("config");
    const after = await projectsService.getByKey((await database().project.findUniqueOrThrow({ where: { id: project.id } })).workspaceId, "billing");
    expect(Object.keys((after.config as { types: object }).types)).toContain("calculation");
  });

  it("previews without changing anything", async () => {
    const { project, actor, code } = await approvedProject();
    const snapshot = await exportSnapshot(project.id);
    const edited = { ...snapshot, requirements: snapshot.requirements.map((r) => (r.code === code ? { ...r, title: "Renamed" } : r)) };
    const preview = await snapshotService.import(project.id, actor, edited, { dryRun: true });
    expect(preview.plan.requirements).toEqual([{ code, change: "updated", fields: ["title"] }]);
    expect((await requirementsService.get(project.id, code)).title).not.toBe("Renamed");
  });
});
