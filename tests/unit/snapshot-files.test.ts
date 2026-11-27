import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { projectConfigSchema, snapshotSchema, type Snapshot } from "@lastro/shared";
import { readSnapshot, validateExport, writeSnapshot } from "@lastro/snapshot";

let root: string;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "lastro-snapshot-"));
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

const snapshotWith = (incidents: Snapshot["incidents"]): Snapshot =>
  snapshotSchema.parse({
    config: projectConfigSchema.parse({ project: "billing" }),
    glossary: { terms: [], invariants: [] },
    sources: [], packages: [], requirements: [], decisions: [], questions: [], incidents,
  });

describe("writing and reading incidents", () => {
  it("writes an incident as one file and reads it back unchanged", async () => {
    const incidents = [{ code: "INC-AB234", reported: "Discount missing on the PDF", sourceRef: "SRC-AB234 @msg:3", requirement: "REQ-AB234", triage: "bug" as const, cause: "implementation" as const, billing: "fix" as const, regressionTest: "tests/pdf.test.ts::discount" }];
    writeSnapshot(root, snapshotWith(incidents));
    expect(readFileSync(join(root, ".lastro", "incidents", "INC-AB234.yml"), "utf8")).toContain("regression_test: tests/pdf.test.ts::discount");
    expect((await readSnapshot(root)).incidents).toEqual(incidents);
  });

  it("reads an incident whose source is written as a reference and an anchor", async () => {
    writeSnapshot(root, snapshotWith([]));
    writeFileSync(join(root, ".lastro", "incidents", "INC-AB235.yml"), "id: INC-AB235\nreported: Totals are off\nsource:\n  ref: SRC-AB234\n  anchor: '@msg:7'\n");
    expect((await readSnapshot(root)).incidents).toEqual([{ code: "INC-AB235", reported: "Totals are off", sourceRef: "SRC-AB234 @msg:7" }]);
  });

  it("removes the file of an incident that is no longer in the snapshot", () => {
    writeSnapshot(root, snapshotWith([{ code: "INC-AB234", reported: "Gone soon" }]));
    writeSnapshot(root, snapshotWith([]));
    expect(() => readFileSync(join(root, ".lastro", "incidents", "INC-AB234.yml"))).toThrow();
  });
});

describe("validating an export", () => {
  it("names a file that is not valid YAML instead of throwing", () => {
    writeSnapshot(root, snapshotWith([]));
    mkdirSync(join(root, ".lastro", "questions"), { recursive: true });
    writeFileSync(join(root, ".lastro", "questions", "Q-AB234.yml"), "id: [unclosed\n");
    const problems = validateExport(root);
    expect(problems).toEqual([expect.objectContaining({ file: ".lastro/questions/Q-AB234.yml", message: expect.stringContaining("not valid YAML") })]);
  });

  it("names the file and the field of a file that breaks its contract", () => {
    writeSnapshot(root, snapshotWith([]));
    writeFileSync(join(root, ".lastro", "incidents", "INC-AB234.yml"), "id: not-a-code\nreported: something\n");
    const problems = validateExport(root);
    expect(problems).toEqual([expect.objectContaining({ file: ".lastro/incidents/INC-AB234.yml", path: "id" })]);
  });

  it("refuses to read a snapshot with an invalid file, naming it", async () => {
    writeSnapshot(root, snapshotWith([]));
    writeFileSync(join(root, ".lastro", "glossary.yml"), "terms: [: bad\n");
    await expect(readSnapshot(root)).rejects.toThrow(".lastro/glossary.yml");
  });

  it("asks for lastro init when lastro.yml is missing", () => {
    expect(validateExport(root)).toEqual([expect.objectContaining({ file: ".lastro/lastro.yml", message: expect.stringContaining("lastro init") })]);
  });

  it("flags a URL with credentials written in lastro.yml", () => {
    writeSnapshot(root, snapshotWith([]));
    writeFileSync(join(root, ".lastro", "lastro.yml"), "version: 1\nproject: billing\nserver:\n  url: https://user:secret@lastro.example.test\n");
    expect(validateExport(root).map((p) => p.message).join("\n")).toContain("a URL with a user and password");
  });
});
