import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { parseDocument } from "yaml";

/** Walks up from the current folder to the one holding .lastro/lastro.yml. */
export function findRoot(start = process.cwd()): string {
  const found = tryRoot(start);
  if (!found) throw new Error("no .lastro/lastro.yml here or above: run `lastro init`");
  return found;
}

export function tryRoot(start = process.cwd()): string | null {
  let dir = resolve(start);
  for (;;) {
    if (existsSync(join(dir, ".lastro", "lastro.yml"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return null;
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

/** Names of the environment variables that hold the server URL and the token. */
export function serverSettings(cwd: string): { urlEnv: string; tokenEnv: string } {
  const root = tryRoot(cwd);
  if (!root) return { urlEnv: "LASTRO_URL", tokenEnv: "LASTRO_TOKEN" };
  const doc = parseDocument(readFileSync(configFile(root), "utf8"));
  const url = doc.getIn(["server", "url_env"]);
  const token = doc.getIn(["server", "token_env"]);
  return { urlEnv: typeof url === "string" && url ? url : "LASTRO_URL", tokenEnv: typeof token === "string" && token ? token : "LASTRO_TOKEN" };
}

/** gate.human_identities: who may skip the terminal confirmation of a human command with --yes. */
export function humanIdentities(root: string): string[] {
  const doc = parseDocument(readFileSync(configFile(root), "utf8"));
  const list = doc.getIn(["gate", "human_identities"]) as { toJSON?: () => unknown } | undefined;
  const value = list?.toJSON?.();
  return Array.isArray(value) ? value.map(String) : [];
}
