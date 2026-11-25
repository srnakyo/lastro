import { beforeEach, describe, expect, it } from "bun:test";
import { requirementsService, sourcesService, markdownPassages } from "@lastro/core";
import { resetDatabase } from "../helpers/db";
import { BRIEF, createBriefSource, createProject, discountRequirement } from "../helpers/fixtures";

beforeEach(resetDatabase);

describe("requirements", () => {
  it("becomes specified when every required field and quote is in place", async () => {
    const { project, actor } = await createProject();
    const source = await createBriefSource(project.id, actor);
    const view = await requirementsService.create(project.id, actor, discountRequirement(source.code));
    expect(view.status).toBe("specified");
    expect(view.citations[0]?.found).toBe(true);
    expect(view.citations[0]?.passageAnchor).toBe("@brief.md#volume-discount/p1");
    expect(view.code).toMatch(/^REQ-[0-9A-HJKMNP-TV-Z]{5}$/);
  });

  it("stays captured with an invented quote or a missing field, and says why", async () => {
    const { project, actor } = await createProject();
    const source = await createBriefSource(project.id, actor);
    const base = discountRequirement(source.code);
    const view = await requirementsService.create(project.id, actor, {
      ...base,
      dataSource: undefined,
      citations: base.citations.map((c) => ({ ...c, quote: "The volume discount must never show." })),
    });
    expect(view.status).toBe("captured");
    expect(view.blockers.map((b) => b.kind)).toEqual(expect.arrayContaining(["invalid_quote", "missing_field"]));
    expect(view.hallmark.origin).toBe("missing");
  });

  it("goes back to captured when a new source version drops the quoted text", async () => {
    const { project, actor } = await createProject();
    const source = await createBriefSource(project.id, actor);
    const created = await requirementsService.create(project.id, actor, discountRequirement(source.code));
    const changed = BRIEF.replace("including the **annual plan**", "only on monthly plans");
    await sourcesService.addVersion(project.id, actor, source.code, {
      kind: "text", title: "brief.md", from: "client", hash: "sha256:v2", final: false, machineTranscript: false,
      passages: markdownPassages([{ name: "brief.md", content: changed }]).map((p) => ({ anchor: p.anchor, text: p.text })),
    });
    const after = await requirementsService.get(project.id, created.code);
    expect(after.status).toBe("captured");
    expect(after.history.map((h) => h.toStatus)).toEqual(["captured", "specified", "captured"]);
  });

  it("lists with filters and keeps the creation order", async () => {
    const { project, actor } = await createProject();
    const source = await createBriefSource(project.id, actor);
    const a = await requirementsService.create(project.id, actor, discountRequirement(source.code));
    const b = await requirementsService.create(project.id, actor, { ...discountRequirement(source.code), title: "Second", dataSource: undefined });
    expect((await requirementsService.list(project.id)).map((r) => r.code)).toEqual([a.code, b.code]);
    expect((await requirementsService.list(project.id, { status: "captured" })).map((r) => r.code)).toEqual([b.code]);
  });
});
