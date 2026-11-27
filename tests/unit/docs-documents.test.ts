import { describe, expect, it } from "bun:test";
import { generateDocuments, generatePackageReport, type DocRequirement, type DocsInput } from "@lastro/docs";
import { projectConfigSchema } from "@lastro/shared";

const requirement = (code: string, over: Partial<DocRequirement> = {}): DocRequirement => ({
  code, title: `Title of ${code}`, type: "calculation", status: "building", statement: `Statement of ${code}`, where: null, dataSource: null, period: null, whenMissing: null,
  module: "billing", package: "PKG-AAAAA", examples: [], citations: [], criteria: [], decisions: [], questions: [], blockers: [], evidence: null, ...over,
});

const cite = (quote: string, label: string | null, order: number | null = null) => ({ source: "SRC-AAAAA", anchor: "@brief.md#x", quote, found: true, label, order });

function input(requirements: DocRequirement[], over: Partial<DocsInput> = {}): DocsInput {
  return {
    generatedAt: new Date("2026-03-01T12:00:00Z"), commit: null, lang: "en",
    project: { key: "billing", name: "Billing", description: null, repositoryUrl: null },
    config: projectConfigSchema.parse({ project: "billing" }),
    requirements, packages: [{ code: "PKG-AAAAA", title: "Release one", requirements: requirements.map((r) => r.code) }],
    sources: [], decisions: [], questions: [], incidents: [], glossary: { terms: [], invariants: [] }, runs: [], tests: [], history: [], ...over,
  };
}

const titles = (report: string) => [...report.matchAll(/^## (?:Item [^:]+: )?(Title of \S+)/gm)].map((m) => m[1]);

describe("package report order (REQ-D1F4M)", () => {
  it("follows the requester's numbering, not the code or the text order", () => {
    const reqs = [requirement("REQ-A", { citations: [cite("ten", "10")] }), requirement("REQ-B", { citations: [cite("two", "2")] })];
    expect(titles(generatePackageReport(input(reqs), "PKG-AAAAA"))).toEqual(["Title of REQ-B", "Title of REQ-A"]);
  });

  it("falls back to where the quote sits in its source when there is no numbering", () => {
    const reqs = [requirement("REQ-A", { citations: [cite("late", null, 9)] }), requirement("REQ-B", { citations: [cite("early", null, 1)] })];
    expect(titles(generatePackageReport(input(reqs), "PKG-AAAAA"))).toEqual(["Title of REQ-B", "Title of REQ-A"]);
  });

  it("breaks a tie by code when the numbering and the position are equal", () => {
    const reqs = [requirement("REQ-B", { citations: [cite("q", "1", 1)] }), requirement("REQ-A", { citations: [cite("q", "1", 1)] })];
    expect(titles(generatePackageReport(input(reqs), "PKG-AAAAA"))).toEqual(["Title of REQ-A", "Title of REQ-B"]);
  });

  it("treats a label without a number as no numbering", () => {
    const reqs = [requirement("REQ-B", { citations: [cite("b", "see below", 5)] }), requirement("REQ-A", { citations: [cite("a", "3", 1)] })];
    expect(titles(generatePackageReport(input(reqs), "PKG-AAAAA"))).toEqual(["Title of REQ-A", "Title of REQ-B"]);
  });
});

describe("package report content", () => {
  it("shows only the decisions meant for the requester, never an overturned one", () => {
    const reqs = [requirement("REQ-A", { citations: [cite("q", "Item 1")] })];
    const decisions = [
      { code: "DEC-1", kind: "decision", text: "Shown to them", reason: null, decidedBy: "dev", status: "confirmed", showToClient: true, requirements: ["REQ-A"], createdAt: new Date() },
      { code: "DEC-2", kind: "decision", text: "Internal only", reason: null, decidedBy: "dev", status: "confirmed", showToClient: false, requirements: ["REQ-A"], createdAt: new Date() },
      { code: "DEC-3", kind: "decision", text: "Overturned one", reason: null, decidedBy: "dev", status: "overturned", showToClient: true, requirements: ["REQ-A"], createdAt: new Date() },
    ];
    const report = generatePackageReport(input(reqs, { decisions }), "PKG-AAAAA");
    expect(report).toContain("- We decided: Shown to them");
    expect(report).not.toContain("Internal only");
    expect(report).not.toContain("Overturned one");
  });

  it("names where to see it and the evidence with the run", () => {
    const reqs = [requirement("REQ-A", { where: "Invoice screen", evidenceRun: "run-7", evidence: { commit: "abc1234", verifiedAt: new Date("2026-02-01T10:00:00Z") } })];
    const report = generatePackageReport(input(reqs), "PKG-AAAAA");
    expect(report).toContain("Where to see it: Invoice screen");
    expect(report).toContain("Evidence: abc1234 (run run-7)");
  });

  it("puts an item with an open question only under Awaiting answer, with the question", () => {
    const reqs = [requirement("REQ-A", { citations: [cite("quote A", "4")] }), requirement("REQ-B")];
    const questions = [{ code: "Q-1", text: "Monthly or annual?", askedTo: "client", blocks: true, answer: null, requirements: ["REQ-A"] }];
    const report = generatePackageReport(input(reqs, { questions }), "PKG-AAAAA");
    const [before, after] = report.split("## Awaiting answer");
    expect(before).toContain("Title of REQ-B");
    expect(before).not.toContain("Title of REQ-A");
    expect(after).toContain("### Item 4: Title of REQ-A");
    expect(after).toContain("- Monthly or annual?");
  });

  it("leaves out dropped requirements", () => {
    const report = generatePackageReport(input([requirement("REQ-A", { status: "dropped" }), requirement("REQ-B")]), "PKG-AAAAA");
    expect(titles(report)).toEqual(["Title of REQ-B"]);
  });
});

describe("requirements document", () => {
  const build = (data: DocsInput) => generateDocuments(data, ["requirements"])[0]?.markdown ?? "";

  it("says there is no requirement yet when the project has none", () => {
    expect(build(input([]))).toContain("No requirement yet.");
  });

  it("writes the fields the requirement has, its examples, criteria, blockers and evidence, and warns about a quote not found", () => {
    const r = requirement("REQ-A", {
      where: "Invoice", dataSource: "discount table", examples: [{ given: "60 seats", expect: "8%" }],
      citations: [{ ...cite("the words", null), found: false }],
      criteria: [{ code: "AC-1", text: "8% at 60 seats", tests: ["t.test.ts::a", "t.test.ts::b"], locked: true }, { code: "AC-2", text: "no test", tests: [], locked: false }],
      blockers: [{ kind: "open_question", detail: "Q-1" }, { kind: "no_evidence", detail: "" }],
      evidence: { commit: "abc1234", verifiedAt: new Date("2026-02-01T10:00:00Z") },
    });
    const md = build(input([r]));
    expect(md).toContain("| where | Invoice |");
    expect(md).toContain("| data_source | discount table |");
    expect(md).not.toContain("| period |");
    expect(md).toContain("| 60 seats | 8% |");
    expect(md).toContain("`@brief.md#x` ⚠");
    expect(md).toContain("AC-1 🔒");
    expect(md).toContain("t.test.ts::a, t.test.ts::b");
    expect(md).toContain("abc1234 ·");
  });

  it("lists requirements with a package under it and the rest under No package", () => {
    const md = build(input([requirement("REQ-A"), requirement("REQ-B", { package: null })]));
    expect(md).toContain("# PKG-AAAAA · Release one");
    expect(md).toContain("# No package");
  });

  it("writes in Portuguese when the project does", () => {
    expect(build(input([], { lang: "pt-BR" }))).toContain("Nenhum requisito ainda.");
  });
});
