import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

function git(cwd: string, args: string[]): string | null {
  try {
    return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return null;
  }
}

export function commitInfo(cwd: string) {
  const status = git(cwd, ["status", "--porcelain"]);
  return { commit: git(cwd, ["rev-parse", "--short", "HEAD"]), branch: git(cwd, ["rev-parse", "--abbrev-ref", "HEAD"]), dirty: !!status };
}

/**
 * Fingerprint of the files a requirement touches, as they are on disk now. When it changes after
 * verification, the evidence is stale. Callers pass the linked test files when nothing was touched yet;
 * an empty list hashes the whole working tree.
 */
export function treeHash(cwd: string, touches: string[]): string {
  const hash = createHash("sha256");
  if (touches.length === 0) {
    hash.update(git(cwd, ["rev-parse", "HEAD^{tree}"]) ?? "");
    hash.update(git(cwd, ["diff", "HEAD"]) ?? "");
  } else {
    for (const file of [...touches].sort()) {
      const path = join(cwd, file);
      hash.update(file);
      hash.update(existsSync(path) ? readFileSync(path) : "<missing>");
    }
  }
  return `sha256:${hash.digest("hex")}`;
}

/** A short hash of each line of each file, in order, to tell a file that only grew from one that changed. */
export function fileLines(cwd: string, files: string[]): Record<string, string[]> {
  return Object.fromEntries(
    [...new Set(files)].sort().flatMap((file) => {
      const path = join(cwd, file);
      if (!existsSync(path)) return [];
      const lines = readFileSync(path, "utf8").split(/\r?\n/).map((line) => createHash("sha256").update(line.trimEnd()).digest("hex").slice(0, 12));
      return [[file, lines]];
    }),
  );
}

/** SHA-256 of each file as it is on disk now ("missing" when it is not there). */
export function fileHashes(cwd: string, files: string[]): Record<string, string> {
  return Object.fromEntries(
    [...new Set(files)].sort().map((file) => {
      const path = join(cwd, file);
      return [file, existsSync(path) ? `sha256:${createHash("sha256").update(readFileSync(path)).digest("hex")}` : "missing"];
    }),
  );
}
