import { beforeEach, describe, expect, it } from "bun:test";
import { fileURLToPath } from "node:url";
import { overviewService, requirementsService, snapshotService } from "@lastro/core";
import { database } from "@lastro/database";
import { readSnapshot } from "@lastro/snapshot";
import { resetDatabase } from "../helpers/db";
import { createProject } from "../helpers/fixtures";

const root = fileURLToPath(new URL("../..", import.meta.url));

beforeEach(resetDatabase);

describe("importing this repository's .lastro/", () => {
  it("loads every requirement with its quotes found in the PRD, and recomputes statuses", async () => {
    const snapshot = await readSnapshot(root);
    const { project, actor } = await createProject();
    const report = await snapshotService.import(project.id, actor, snapshot);
    expect(report.requirementsCreated).toBe(snapshot.requirements.length);
    const views = await requirementsService.list(project.id);
    expect(views.every((v) => v.citations.every((c) => c.found))).toBe(true);
    expect(views.every((v) => v.status === "specified")).toBe(true);
    expect(views.every((v) => v.hallmark.origin === "partial")).toBe(true);
    expect(await database().decision.count({ where: { projectId: project.id } })).toBe(snapshot.decisions.length);
  });

  it("is idempotent: a second import updates in place and adds no source version", async () => {
    const snapshot = await readSnapshot(root);
    const { project, actor } = await createProject();
    await snapshotService.import(project.id, actor, snapshot);
    const again = await snapshotService.import(project.id, actor, snapshot);
    expect(again.requirementsCreated).toBe(0);
    expect(again.sources).toBe(0);
    expect(await database().sourceVersion.count()).toBe(1);
  });

  it("feeds the overview: coverage, pending criteria and quality per module", async () => {
    const { project, actor } = await createProject();
    await snapshotService.import(project.id, actor, await readSnapshot(root));
    const o = await overviewService.project(project.id);
    expect(o.requirements).toBeGreaterThan(20);
    expect(o.pending).toBe(o.requirements);
    expect(o.coverage).toBe(0);
    expect(o.tests.pending).toBeGreaterThan(0);
    expect(o.modules.length).toBeGreaterThan(1);
  });
});
