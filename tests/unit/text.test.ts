import { describe, expect, it } from "bun:test";
import { markdownPassages, matchQuote, slugify, splitMarkdown } from "@lastro/core";

describe("slugify", () => {
  it.each([
    ["`captured` → `specified`", "captured--specified"],
    ["Decisão (`decisions/DEC-xxxxx.yml`)", "decisão-decisionsdec-xxxxxyml"],
    ['Por que o agente não consegue "dizer que passou"', "por-que-o-agente-não-consegue-dizer-que-passou"],
  ])("%s", (heading, slug) => expect(slugify(heading)).toBe(slug));
});

describe("splitMarkdown", () => {
  it("ignores headings and blank lines inside code fences", () => {
    const sections = splitMarkdown("# A\n\ntext\n\n```\n# not a heading\n\nstill code\n```\n\n## B\n\nmore");
    expect(sections.map((s) => s.heading)).toEqual(["A", "B"]);
    expect(sections[0]?.paragraphs).toHaveLength(2);
  });
});

describe("markdownPassages", () => {
  it("anchors every paragraph under its file and section", () => {
    const passages = markdownPassages([{ name: "doc.md", content: "# Title\n\nOne.\n\nTwo." }]);
    expect(passages.map((p) => p.anchor)).toEqual(["@doc.md#title/p0", "@doc.md#title/p1"]);
  });
});

describe("matchQuote", () => {
  const passages = markdownPassages([{ name: "doc.md", content: "# States\n\nIntro.\n\n**Pending is only what is not `verified`.** The\ndashboard never lists it." }]);

  it("finds a quote under a section anchor, ignoring emphasis, code marks and line breaks", () => {
    expect(matchQuote(passages, "@doc.md#states", "Pending is only what is not verified. The dashboard never")).toEqual({
      found: true,
      passageAnchor: "@doc.md#states/p1",
    });
  });

  it("rejects a quote with one word changed", () => {
    expect(matchQuote(passages, "@doc.md#states", "Pending is only what is already verified").found).toBe(false);
  });

  it("rejects a quote under the wrong anchor", () => {
    expect(matchQuote(passages, "@doc.md#other", "Intro.").found).toBe(false);
  });
});
