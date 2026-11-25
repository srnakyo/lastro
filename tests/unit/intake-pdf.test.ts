import { describe, expect, it } from "bun:test";
import { extract, pageBlocks } from "@lastro/intake";
import { buildPdf } from "../helpers/intake-files";

describe("intake of PDF", () => {
  it("anchors blocks per page, split by vertical gaps", async () => {
    const source = await extract({ name: "spec.pdf", bytes: await buildPdf() });
    expect(source.kind).toBe("pdf");
    expect(source.passages).toEqual([
      { anchor: "@pg1/b1", text: "The volume discount has to show\non the annual invoice." },
      { anchor: "@pg1/b2", text: "Above 50 seats the discount is 8%." },
      { anchor: "@pg2/b1", text: "Second page text." },
    ]);
  });
});

describe("pageBlocks", () => {
  const at = (str: string, x: number, y: number, width = 40) => ({ str, x, y, width, size: 10 });

  it("joins pieces of one line in x order, with a space only where there is a gap", () => {
    expect(pageBlocks([at("world", 60, 700), at("Hello", 10, 700, 45), at("!", 100, 700)])).toEqual(["Hello world!"]);
  });

  it("starts a new block where the gap is larger than the usual line spacing", () => {
    const lines = [at("a", 10, 700), at("b", 10, 688), at("c", 10, 676), at("d", 10, 640), at("e", 10, 628)];
    expect(pageBlocks(lines)).toEqual(["a\nb\nc", "d\ne"]);
  });

  it("splits every line when every line is a paragraph of its own", () => {
    expect(pageBlocks([at("a", 10, 700), at("b", 10, 670), at("c", 10, 640)])).toEqual(["a", "b", "c"]);
  });
});
