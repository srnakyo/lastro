import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

function git(root: string, args: string[]): string {
  try {
    return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    return "";
  }
}

/** The commit the repository is at now, or null outside git. */
export function headCommit(root: string): string | null {
  return git(root, ["rev-parse", "HEAD"]).trim() || null;
}

/** Paths from `git status --porcelain`, renames to their new name. */
function workingTreeFiles(root: string): string[] {
  return git(root, ["status", "--porcelain", "--untracked-files=all"])
    .split("\n")
    .filter(Boolean)
    .map((line) => line.slice(3).split(" -> ").pop() ?? "")
    .map((path) => path.replace(/^"|"$/g, ""));
}

/**
 * The files changed since the session started: committed since `base`, and changed or new in the working tree.
 * However they were written (an editor tool, a shell command, a generator), so the touched files are complete.
 * Lastro's own export is left out.
 */
export function changedFiles(root: string, base: string | null): string[] {
  const committed = base ? git(root, ["diff", "--name-only", base, "HEAD"]).split("\n").filter(Boolean) : [];
  const files = new Set([...committed, ...workingTreeFiles(root)].filter((f) => f && !f.startsWith(".lastro/")));
  return [...files].sort().slice(0, 500);
}

const fingerprint = (root: string, file: string) => {
  const path = join(root, file);
  return existsSync(path) ? createHash("sha256").update(readFileSync(path)).digest("hex") : "deleted";
};

/**
 * Of the files changed in the session, those whose content changed since the last turn counted them: a turn
 * that moves to another requirement does not hand it the files of the previous one.
 */
export function changedThisTurn(root: string, files: string[], seen: Record<string, string>) {
  const next = { ...seen };
  const changed: string[] = [];
  for (const file of files) {
    const now = fingerprint(root, file);
    if (seen[file] !== now) changed.push(file);
    next[file] = now;
  }
  return { changed, seen: next };
}
