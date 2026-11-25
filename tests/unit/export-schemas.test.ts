import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { EXPORT_FILES, type ExportFileKind } from "@lastro/shared";
import { validateExport } from "@lastro/snapshot";
import { parse } from "yaml";
import { exportSchemas } from "../../packages/shared/scripts/schemas";

const root = fileURLToPath(new URL("../..", import.meta.url));

/** The ```yaml examples of the PRD, each tagged with the export file it shows. */
function prdExamples(): { kind: ExportFileKind; data: unknown }[] {
  const text = ["04-domain-model.md", "05-lifecycle-and-gates.md"].map((f) => readFileSync(join(root, "docs/prd", f), "utf8")).join("\n");
  const blocks = [...text.matchAll(/```yaml\n([\s\S]*?)```/g)].map((m) => parse(m[1] ?? "") as Record<string, unknown>);
  const kindOf = (b: Record<string, unknown>): ExportFileKind | null => {
    const id = String(b.id ?? "");
    if (id.startsWith("SRC-")) return "source";
    if (id.startsWith("REQ-")) return "requirement";
    if (id.startsWith("DEC-")) return "decision";
    if (id.startsWith("Q-")) return "question";
    if (id.startsWith("INC-")) return "incident";
    if (id.startsWith("PKG-")) return "package";
    if ("terms" in b) return "glossary";
    if ("components" in b) return "design";
    if (b.version === 1) return "config";
    return null;
  };
  return blocks.flatMap((data) => (kindOf(data) ? [{ kind: kindOf(data) as ExportFileKind, data }] : []));
}

describe("published JSON Schemas (REQ-1F7QA)", () => {
  it("are one per export file and match the contracts", () => {
    const generated = exportSchemas();
    expect(Object.keys(generated).sort()).toEqual(Object.keys(EXPORT_FILES).map((k) => `${k}.schema.json`).sort());
    for (const [name, content] of Object.entries(generated)) expect(readFileSync(join(root, "packages/shared/schemas", name), "utf8")).toBe(content);
  });

  it("accept every example file of the PRD", () => {
    const examples = prdExamples();
    expect(new Set(examples.map((e) => e.kind)).size).toBe(9);
    for (const e of examples) {
      const result = EXPORT_FILES[e.kind].schema.safeParse(e.data);
      expect(result.success ? "" : `${e.kind}: ${JSON.stringify(result.error.issues)}`).toBe("");
    }
  });

  it("accept this repository's own .lastro/", () => {
    expect(validateExport(root)).toEqual([]);
  });
});
