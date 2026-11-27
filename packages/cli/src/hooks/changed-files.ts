import { execFileSync } from "node:child_process";

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
