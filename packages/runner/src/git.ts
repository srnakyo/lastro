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
 * verification, the evidence is stale. Without touched files, the whole working tree counts.
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
