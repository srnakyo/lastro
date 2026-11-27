import { beforeEach, describe, expect, it } from "bun:test";
import { exportSnapshot, markdownPassages, requirementsService, sourcesService } from "@lastro/core";
import { resetDatabase } from "../helpers/db";
import { createProject, discountRequirement } from "../helpers/fixtures";

beforeEach(resetDatabase);

const SPEC = "# Billing spec\n\n## Item 14\n\nThe invoice shows the volume discount line.\n";

describe("requirement IDs (REQ-2K9DM)", () => {
  it("gives a requirement taken from 'item 14' a random ID and keeps 'item 14' as its source label", async () => {
    const { project, actor } = await createProject();
    const passages = markdownPassages([{ name: "spec.md", content: SPEC }]).map((p) => ({ anchor: p.anchor, text: p.text, heading: p.heading ?? undefined }));
    const source = await sourcesService.create(project.id, actor, { kind: "text", title: "spec.md", from: "client", hash: "sha256:item-14", final: false, machineTranscript: false, passages });
    const anchor = passages.find((p) => p.heading === "Item 14")?.anchor ?? "";
    expect(anchor).toContain("item-14");
    const fromItem14 = { ...discountRequirement(source.code), citations: [{ source: source.code, anchor, label: "item 14", quote: "The invoice shows the volume discount line." }] };
    const req = await requirementsService.create(project.id, actor, fromItem14);
    const again = await requirementsService.create(project.id, actor, { ...fromItem14, title: "Same item, another requirement" });
    // Random, not the requester's numbering: two requirements from the same item get different IDs.
    for (const code of [req.code, again.code]) expect(code).toMatch(/^REQ-[0-9A-HJKMNP-TV-Z]{5}$/);
    expect([req.code, again.code]).not.toContain("REQ-00014");
    expect(again.code).not.toBe(req.code);
    const exported = (await exportSnapshot(project.id)).requirements.find((r) => r.code === req.code);
    expect(exported?.citations[0]).toMatchObject({ anchor, label: "item 14" });
  });
});
