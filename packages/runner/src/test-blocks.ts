import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const BRACES = /\.(go|ts|tsx|js|jsx|mjs|cjs|java|kt|kts|cs|rs|swift|dart|php|c|cc|cpp|scala)$/;
const STRINGS = /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`[^`]*`/g;

export const lineHash = (line: string) => createHash("sha256").update(line.trimEnd()).digest("hex").slice(0, 12);

/** The name a test is declared with: the last describe segment, and a Go subtest's parent. */
export function declaredName(ref: string): string {
  const name = ref.split("::").slice(1).join("::");
  const last = name.split(/ > | › /).pop() ?? name;
  return last.split("/")[0] ?? last;
}

/** The test's own lines in its file: from its declaration to the brace that closes it (or its indented body in Python). */
export function blockOf(text: string, file: string, name: string): string[] | null {
  if (!name) return null;
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((l) => l.includes(name) && /\b(func|def|fn|fun|void|it|test|specify|scenario)\b|\bit\(|\btest\(/.test(l));
  if (start < 0) return null;
  if (BRACES.test(file)) {
    let depth = 0;
    let opened = false;
    for (let i = start; i < lines.length; i++) {
      for (const ch of (lines[i] ?? "").replace(STRINGS, "")) {
        if (ch === "{") {
          depth += 1;
          opened = true;
        } else if (ch === "}") depth -= 1;
      }
      if (opened && depth <= 0) return lines.slice(start, i + 1);
    }
    return null;
  }
  if (file.endsWith(".py")) {
    const indent = (l: string) => l.length - l.trimStart().length;
    const base = indent(lines[start] ?? "");
    let end = start + 1;
    while (end < lines.length && ((lines[end] ?? "").trim() === "" || indent(lines[end] ?? "") > base)) end += 1;
    return lines.slice(start, end);
  }
  return null;
}

/**
 * The line fingerprints of each linked test's own block, so a seal covers that test and not the whole file: a
 * change in another test of the same file leaves it alone. Tests whose block is not found are left out (the
 * whole file is then their seal).
 */
export function testBlocks(cwd: string, refs: string[]): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  const texts = new Map<string, string | null>();
  for (const ref of [...new Set(refs)]) {
    const file = ref.split("::")[0] ?? ref;
    if (!texts.has(file)) texts.set(file, existsSync(join(cwd, file)) ? readFileSync(join(cwd, file), "utf8") : null);
    const text = texts.get(file);
    const block = text ? blockOf(text, file, declaredName(ref)) : null;
    if (block) out[ref] = block.map(lineHash);
  }
  return out;
}
