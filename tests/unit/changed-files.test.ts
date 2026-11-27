import { describe, expect, it } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { changedFiles, headCommit } from "../../packages/cli/src/hooks/changed-files";

const git = (cwd: string, ...args: string[]) => execFileSync("git", ["-c", "user.email=t@t.test", "-c", "user.name=t", ...args], { cwd, stdio: "ignore" });

describe("the files a session changed", () => {
  it("counts what was committed since the session started, changed and new files, however they were written, and not Lastro's export", () => {
    const repo = mkdtempSync(join(tmpdir(), "lastro-touch-"));
    git(repo, "init", "-q");
    writeFileSync(join(repo, "a.go"), "package a\n");
    git(repo, "add", ".");
    git(repo, "commit", "-qm", "start");
    const base = headCommit(repo);
    // Written by a shell command, then committed in the session.
    writeFileSync(join(repo, "b.go"), "package b\n");
    git(repo, "add", "b.go");
    git(repo, "commit", "-qm", "b");
    writeFileSync(join(repo, "a.go"), "package a // changed\n");
    mkdirSync(join(repo, "front", "src"), { recursive: true });
    writeFileSync(join(repo, "front", "src", "app.ts"), "export {}\n");
    mkdirSync(join(repo, ".lastro"));
    writeFileSync(join(repo, ".lastro", "lastro.yml"), "version: 1\n");
    expect(changedFiles(repo, base)).toEqual(["a.go", "b.go", "front/src/app.ts"]);
    expect(changedFiles(repo, null)).toEqual(["a.go", "front/src/app.ts"]);
  });

  it("is empty outside git", () => {
    const dir = mkdtempSync(join(tmpdir(), "lastro-nogit-"));
    expect(headCommit(dir)).toBeNull();
    expect(changedFiles(dir, null)).toEqual([]);
  });
});
