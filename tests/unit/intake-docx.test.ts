import { beforeAll, describe, expect, it } from "bun:test";
import { extract, type ExtractedSource } from "@lastro/intake";
import { BLUE_PNG, RED_PNG, buildDocx } from "../helpers/intake-files";

let source: ExtractedSource;

beforeAll(async () => {
  source = await extract({ name: "spec.docx", bytes: await buildDocx() });
});

describe("intake of DOCX", () => {
  it("makes one passage per paragraph, list item and table, in document order", () => {
    expect(source.kind).toBe("docx");
    expect(source.passages.map((p) => [p.anchor, p.text])).toEqual([
      ["@p1", "The invoice shows the discount."],
      ["@p2", "Before {{asset:p2-img1.png}} between {{asset:p2-img2.png}} after."],
      ["@p3", "{{asset:p3-img1.png}}"],
      ["@p4", "First numbered item."],
      ["@p5", "Second numbered item."],
      ["@p6", "Third numbered item."],
      ["@p7", "A bullet point."],
      ["@p8", "Seats | Discount\n50 | 8%"],
      ["@p9", "**Bold** closing words."],
    ]);
  });

  it("keeps images in order, attached to their paragraph", () => {
    expect(source.assets.map((a) => [a.name, a.anchor, a.contentType])).toEqual([
      ["p2-img1.png", "@p2/img1", "image/png"],
      ["p2-img2.png", "@p2/img2", "image/png"],
      ["p3-img1.png", "@p3/img1", "image/png"],
    ]);
    expect(source.assets.map((a) => a.bytes)).toEqual([RED_PNG, BLUE_PNG, BLUE_PNG]);
  });

  it("labels numbered items with their number and leaves bullets unlabelled", () => {
    expect(source.passages.filter((p) => p.label).map((p) => [p.anchor, p.label])).toEqual([
      ["@p4", "item 1"],
      ["@p5", "item 2"],
      ["@p6", "item 3"],
    ]);
  });

  it("sets the heading on the passages that follow it", () => {
    expect(source.passages.map((p) => p.heading)).toEqual(["Scope", "Scope", "Scope", "Scope", "Scope", "Scope", "Scope", "Scope", "Later"]);
  });
});
