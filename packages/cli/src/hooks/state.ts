import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/** Small per-repository state the hooks keep between calls, under .lastro/.out/ (not versioned). */
export class HookState {
  constructor(private readonly root: string) {}

  private file(name: string) {
    const dir = join(this.root, ".lastro", ".out");
    mkdirSync(dir, { recursive: true });
    return join(dir, name);
  }

  blocks(session: string): number {
    const f = this.file(`stop-blocks-${session.replace(/[^\w-]/g, "")}.json`);
    return existsSync(f) ? (JSON.parse(readFileSync(f, "utf8")) as { count: number }).count : 0;
  }

  setBlocks(session: string, count: number) {
    writeFileSync(this.file(`stop-blocks-${session.replace(/[^\w-]/g, "")}.json`), JSON.stringify({ count }));
  }

  /** The commit the session started at: the touched files are counted from it. */
  base(session: string): string | null {
    const f = this.file(`base-${session.replace(/[^\w-]/g, "")}.json`);
    return existsSync(f) ? (JSON.parse(readFileSync(f, "utf8")) as { commit: string | null }).commit : null;
  }

  /** Keeps the first commit of a session: resuming or compacting does not move it. */
  keepBase(session: string, commit: string | null) {
    const f = this.file(`base-${session.replace(/[^\w-]/g, "")}.json`);
    if (!existsSync(f)) writeFileSync(f, JSON.stringify({ commit }));
  }

  /** The requirement being worked on (`lastro req start` or `lastro req work`): changed files count for it. */
  current(): string | null {
    const f = this.file("current.json");
    return existsSync(f) ? (JSON.parse(readFileSync(f, "utf8")) as { code: string }).code : null;
  }

  setCurrent(code: string) {
    writeFileSync(this.file("current.json"), JSON.stringify({ code, at: new Date().toISOString() }));
  }

  /** The content fingerprint of each file the session already counted, so each turn counts only what it changed. */
  seen(session: string): Record<string, string> {
    const f = this.file(`seen-${session.replace(/[^\w-]/g, "")}.json`);
    return existsSync(f) ? (JSON.parse(readFileSync(f, "utf8")) as Record<string, string>) : {};
  }

  setSeen(session: string, seen: Record<string, string>) {
    writeFileSync(this.file(`seen-${session.replace(/[^\w-]/g, "")}.json`), JSON.stringify(seen));
  }

  /** A pause recorded in the last 30 minutes, consumed once. */
  takePause(): string | null {
    const f = this.file("pause.json");
    if (!existsSync(f)) return null;
    const pause = JSON.parse(readFileSync(f, "utf8")) as { reason: string; at: number };
    rmSync(f, { force: true });
    return Date.now() - pause.at < 30 * 60_000 ? pause.reason : null;
  }

  pause(reason: string) {
    writeFileSync(this.file("pause.json"), JSON.stringify({ reason, at: Date.now() }));
  }
}
