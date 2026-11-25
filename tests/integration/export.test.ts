import { beforeEach, describe, expect, it } from "bun:test";
import { cpSync, existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { exportSnapshot, snapshotService } from "@lastro/core";
import { readSnapshot, writeSnapshot } from "@lastro/snapshot";
import { resetDatabase } from "../helpers/db";
import { BRIEF, createBriefSource, createProject, discountRequirement } from "../helpers/fixtures";
import { requirementsService } from "@lastro/core";

const root = fileURLToPath(new URL("../..", import.meta.url));

beforeEach(resetDatabase);

describe("lastro export", () => {
  it("round-trips this repository: import, export, write, read back gives the same spec", async () => {
    const original = await readSnapshot(root);
    const { project, actor } = await createProject();
    await snapshotService.import(project.id, actor, original);
    const exported = await exportSnapshot(project.id);
    const dir = mkdtempSync(join(tmpdir(), "lastro-export-"));
    cpSync(join(root, "docs"), join(dir, "docs"), { recursive: true });
    writeSnapshot(dir, exported);
    const back = await readSnapshot(dir);
    const shape = (s: typeof original) => s.requirements.map((r) => ({ code: r.code, title: r.title, statement: r.statement, citations: r.citations, criteria: r.criteria })).sort((a, b) => a.code.localeCompare(b.code));
    expect(shape(back)).toEqual(shape(original));
    expect(back.decisions.map((d) => d.code).sort()).toEqual(original.decisions.map((d) => d.code).sort());
  });

  it("writes sources that are not in the repository as extracted text with anchors, and reads them back", async () => {
    const { project, actor } = await createProject();
    const source = await createBriefSource(project.id, actor);
    await requirementsService.create(project.id, actor, discountRequirement(source.code));
    const dir = mkdtempSync(join(tmpdir(), "lastro-export-"));
    writeSnapshot(dir, await exportSnapshot(project.id));
    expect(existsSync(join(dir, ".lastro", "sources", `${source.code}.md`))).toBe(true);
    const back = await readSnapshot(dir);
    expect(back.sources[0]?.passages.map((p) => p.text).join("\n")).toContain("annual plan");
    expect(back.requirements).toHaveLength(1);
    expect(BRIEF.length).toBeGreaterThan(0);
  });
});
