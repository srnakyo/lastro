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
  it("disambiguates repeated headings like GitHub", () => {
    const passages = markdownPassages([{ name: "d.md", content: "## Example\n\na\n\n## Example\n\nb" }]);
    expect(passages.map((p) => p.anchor)).toEqual(["@d.md#example/p1", "@d.md#example-1/p1"]);
  });

  it("anchors every paragraph under its file and section", () => {
    const passages = markdownPassages([{ name: "doc.md", content: "# Title\n\nOne.\n\nTwo." }]);
    expect(passages.map((p) => p.anchor)).toEqual(["@doc.md#title/p1", "@doc.md#title/p2"]);
  });
});

describe("matchQuote", () => {
  const passages = markdownPassages([{ name: "doc.md", content: "# States\n\nIntro.\n\n**Pending is only what is not `verified`.** The\ndashboard never lists it." }]);

  it("finds a quote under a section anchor, ignoring emphasis, code marks and line breaks", () => {
    expect(matchQuote(passages, "@doc.md#states", "Pending is only what is not verified. The dashboard never")).toEqual({
      found: true,
      passageAnchor: "@doc.md#states/p2",
    });
  });

  it("rejects a quote with one word changed and points at the closest passage", () => {
    expect(matchQuote(passages, "@doc.md#states", "Pending is only what is already verified")).toEqual({ found: false, passageAnchor: "@doc.md#states/p2" });
  });

  it("accepts a quote in the third paragraph of a section anchor and points at /p3", () => {
    const three = markdownPassages([{ name: "f.md", content: ["# Slug", "One.", "Two.", "The third paragraph holds the rule."].join("\n\n") }]);
    expect(matchQuote(three, "@f.md#slug", "holds the rule")).toEqual({ found: true, passageAnchor: "@f.md#slug/p3" });
  });

  it("ignores single * and _ emphasis but keeps underscores inside words", () => {
    const emph = markdownPassages([{ name: "e.md", content: ["# E", "The *annual* plan uses _data_source_ as is."].join("\n\n") }]);
    expect(matchQuote(emph, "@e.md#e", "The annual plan uses data_source as is").found).toBe(true);
  });

  it("does not accept a quote that spans two paragraphs", () => {
    expect(matchQuote(passages, "@doc.md#states", "Intro. Pending is only").found).toBe(false);
  });

  it("rejects a quote under the wrong anchor", () => {
    expect(matchQuote(passages, "@doc.md#other", "Intro.").found).toBe(false);
  });
});
