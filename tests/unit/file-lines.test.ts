import { describe, expect, it } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileLines } from "../../packages/runner/src/git";

describe("the line fingerprints of test files", () => {
  it("gives one short hash per line, the same for the same line whatever its trailing spaces, and skips missing files", () => {
    const root = mkdtempSync(join(tmpdir(), "lastro-lines-"));
    writeFileSync(join(root, "a_test.go"), "package a\nfunc TestX(t *testing.T) {}   \r\nfunc TestX(t *testing.T) {}\n");
    const lines = fileLines(root, ["a_test.go", "missing_test.go", "a_test.go"]);
    expect(Object.keys(lines)).toEqual(["a_test.go"]);
    const a = lines["a_test.go"] ?? [];
    expect(a).toHaveLength(4);
    expect(a[1]).toBe(a[2]);
    expect(a[0]).not.toBe(a[1]);
    expect(a[0]).toMatch(/^[0-9a-f]{12}$/);
  });
});
