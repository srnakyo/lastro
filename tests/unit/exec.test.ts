import { describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCommand } from "../../packages/runner/src/exec";

describe("running a project command", () => {
  it("returns the exit code and what the command printed on stdout and stderr", async () => {
    const result = await runCommand("echo out; echo err 1>&2; exit 3", process.cwd(), {});
    expect([result.exitCode, result.output.includes("out"), result.output.includes("err")]).toEqual([3, true, true]);
  });

  it("passes the extra environment to the command", async () => {
    const result = await runCommand("echo $LASTRO_TEST_VALUE", process.cwd(), { LASTRO_TEST_VALUE: "from-the-runner" });
    expect(result.output.trim()).toBe("from-the-runner");
  });

  it("runs in the given folder", async () => {
    const dir = mkdtempSync(join(tmpdir(), "lastro-exec-"));
    try {
      expect((await runCommand("pwd", dir, {})).output.trim()).toBe(dir);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("keeps only the tail of a very long output", async () => {
    const result = await runCommand("head -c 200000 /dev/zero | tr '\\0' 'a'; echo END", process.cwd(), {});
    expect(result.output.length).toBe(64 * 1024);
    expect(result.output.endsWith("END\n")).toBe(true);
  });

  it("reports exit code 127 with the reason when the folder does not exist", async () => {
    const result = await runCommand("echo hi", join(tmpdir(), "lastro-no-such-folder"), {});
    expect(result.exitCode).toBe(127);
    expect(result.output.length).toBeGreaterThan(0);
  });
});
