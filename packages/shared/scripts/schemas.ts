/**
 * Writes the published JSON Schema of every .lastro/ export file to packages/shared/schemas/.
 * Run after changing a contract: bun run --cwd packages/shared schemas
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { EXPORT_FILES } from "../src/export/files";

export function exportSchemas(): Record<string, string> {
  return Object.fromEntries(
    Object.entries(EXPORT_FILES).map(([kind, def]) => {
      const schema = { $schema: "https://json-schema.org/draft/2020-12/schema", $id: `https://github.com/srnakyo/lastro/schemas/${kind}.schema.json`, title: `.lastro/${def.pattern}`, ...z.toJSONSchema(def.schema, { io: "input", unrepresentable: "any" }) };
      return [`${kind}.schema.json`, `${JSON.stringify(schema, null, 2)}\n`];
    }),
  );
}

/** Writes one file per export kind into `dir` (created when missing) and returns the file names. */
export function writeSchemas(dir: string): string[] {
  mkdirSync(dir, { recursive: true });
  const files = exportSchemas();
  for (const [name, content] of Object.entries(files)) writeFileSync(join(dir, name), content);
  return Object.keys(files);
}

if (import.meta.main) {
  const dir = join(fileURLToPath(new URL("..", import.meta.url)), "schemas");
  console.log(`wrote ${writeSchemas(dir).length} schemas to ${dir}`);
}
