import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";

export function readYaml(file: string): unknown {
  return parse(readFileSync(file, "utf8"));
}

export function yamlFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((n) => n.endsWith(".yml")).sort().map((n) => join(dir, n));
}

/** Markdown files of an in-repository source: one file, or every .md of a folder. */
export function markdownFiles(root: string, path: string): { name: string; content: string }[] {
  const base = join(root, path);
  if (!existsSync(base)) throw new Error(`source path ${path} does not exist`);
  const files = statSync(base).isFile() ? [base] : readdirSync(base).filter((n) => n.endsWith(".md")).sort().map((n) => join(base, n));
  return files.map((file) => ({ name: file.split("/").pop() ?? file, content: readFileSync(file, "utf8") }));
}

export async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return `sha256:${Buffer.from(digest).toString("hex")}`;
}
