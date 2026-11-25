import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { parseDocument } from "yaml";

/** Walks up from the current folder to the one holding .lastro/lastro.yml. */
export function findRoot(start = process.cwd()): string {
  let dir = resolve(start);
  for (;;) {
    if (existsSync(join(dir, ".lastro", "lastro.yml"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) throw new Error("no .lastro/lastro.yml here or above: run `lastro init`");
    dir = parent;
  }
}

const configFile = (root: string) => join(root, ".lastro", "lastro.yml");

/** The server project this repository is linked to (server.project in lastro.yml). */
export function linkedProject(root: string): string {
  const doc = parseDocument(readFileSync(configFile(root), "utf8"));
  const key = doc.getIn(["server", "project"]);
  if (typeof key === "string" && key) return key;
  const project = doc.get("project");
  if (typeof project === "string" && project) return project;
  throw new Error("this repository is not linked: run `lastro link <project-key>`");
}

export function writeLink(root: string, key: string) {
  const doc = parseDocument(readFileSync(configFile(root), "utf8"));
  doc.setIn(["server", "project"], key);
  writeFileSync(configFile(root), doc.toString());
}
