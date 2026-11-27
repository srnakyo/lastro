import { afterEach, describe, expect, it } from "bun:test";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { exportSchemas, writeSchemas } from "../../packages/shared/scripts/schemas";

const made: string[] = [];
const tempDir = () => {
  const dir = mkdtempSync(join(tmpdir(), "lastro-schemas-"));
  made.push(dir);
  return dir;
};
afterEach(() => {
  for (const dir of made.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("writing the published schemas", () => {
  it("writes one file per export kind, with the content exportSchemas gives", () => {
    const dir = tempDir();
    const names = writeSchemas(dir);
    expect(readdirSync(dir).sort()).toEqual([...names].sort());
    for (const [name, content] of Object.entries(exportSchemas())) expect(readFileSync(join(dir, name), "utf8")).toBe(content);
  });

  it("creates the target folder when it does not exist", () => {
    const dir = join(tempDir(), "nested", "schemas");
    writeSchemas(dir);
    expect(readdirSync(dir).length).toBeGreaterThan(0);
  });

  it("writes valid JSON Schema documents titled by their .lastro/ file", () => {
    const dir = tempDir();
    writeSchemas(dir);
    const schema = JSON.parse(readFileSync(join(dir, "requirement.schema.json"), "utf8")) as { $schema: string; title: string };
    expect([schema.$schema, schema.title]).toEqual(["https://json-schema.org/draft/2020-12/schema", ".lastro/requirements/REQ-*.yml"]);
  });
});
