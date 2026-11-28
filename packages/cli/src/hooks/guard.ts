import { existsSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { blockOf, declaredName, lineHash } from "@lastro/runner";
import { onlyGrew } from "@lastro/shared";

export interface ToolCall {
  tool_name: string;
  tool_input: Record<string, unknown>;
  cwd: string;
}

export type Verdict = { allow: true } | { allow: false; reason: string };

/** Commands only a person may run. */
const HUMAN_COMMANDS = /\blastro\s+(approve|sign|check|accept|unlock|lock|answer|drop|login)\b|\blastro\s+(decision\s+(confirm|overturn)|incident\s+triage|source\s+final)\b/;
const EDIT_TOOLS = new Set(["Edit", "Write", "MultiEdit", "NotebookEdit"]);

function editedFile(call: ToolCall, root: string): string | null {
  const raw = call.tool_input.file_path ?? call.tool_input.notebook_path;
  if (typeof raw !== "string") return null;
  return relative(root, resolve(call.cwd, raw)).replace(/\\/g, "/");
}

export interface LockedFile {
  file: string;
  criteria: string[];
  tests?: { ref: string; block: boolean; lines: string[] }[];
}

type Read = (path: string) => string | null;
const readDisk: Read = (path) => (existsSync(path) ? readFileSync(path, "utf8") : null);

/** The file as it would be after the edit, or null when that cannot be told (a notebook, a missing old text). */
function afterEdit(call: ToolCall, path: string, read: Read): string | null {
  const input = call.tool_input as { content?: unknown; old_string?: unknown; new_string?: unknown; replace_all?: unknown; edits?: unknown };
  if (call.tool_name === "Write") return typeof input.content === "string" ? input.content : null;
  const edits = call.tool_name === "MultiEdit" && Array.isArray(input.edits) ? (input.edits as typeof input[]) : call.tool_name === "Edit" ? [input] : null;
  let text = read(path);
  if (!edits || text === null) return null;
  for (const e of edits) {
    if (typeof e.old_string !== "string" || typeof e.new_string !== "string" || !text.includes(e.old_string)) return null;
    text = e.replace_all ? text.split(e.old_string).join(e.new_string) : text.replace(e.old_string, e.new_string);
  }
  return text;
}

/** The sealed tests an edit would change: their own lines must all stay, in order. */
function brokenSeals(hit: LockedFile, file: string, after: string): string[] {
  return (hit.tests ?? []).filter((t) => {
    const block = blockOf(after, file, declaredName(t.ref));
    return !block || !onlyGrew(t.lines, block.map(lineHash));
  }).map((t) => t.ref);
}

/**
 * Decides whether the agent may run a tool: no human commands, no edits to the .lastro/ export
 * (it comes from the server) and no edits to tests bound to locked criteria.
 */
export function guardToolCall(call: ToolCall, root: string, locked: LockedFile[], read: Read = readDisk): Verdict {
  if (call.tool_name === "Bash") {
    const command = String(call.tool_input.command ?? "");
    const human = HUMAN_COMMANDS.exec(command);
    if (human) return { allow: false, reason: `\`lastro ${human[1] ?? human[2]}\` is for a person. Ask the developer to run it; you cannot approve, sign, accept, unlock, answer or drop.` };
    return { allow: true };
  }
  if (!EDIT_TOOLS.has(call.tool_name)) return { allow: true };
  const file = editedFile(call, root);
  if (!file) return { allow: true };
  if (file.startsWith(".lastro/") && !file.startsWith(".lastro/.out/")) {
    return { allow: false, reason: ".lastro/ is the export of the Lastro server: change the spec through the lastro MCP tools, never by editing these files." };
  }
  const hit = locked.find((l) => l.file === file);
  if (!hit) return { allow: true };
  // Sealed on their own lines, the tests of this file stay as they are while the rest of it may change.
  const after = hit.tests?.length && hit.tests.every((t) => t.block) ? afterEdit(call, join(root, file), read) : null;
  const broken = after === null ? null : brokenSeals(hit, file, after);
  if (broken && broken.length === 0) return { allow: true };
  const which = broken?.length ? `the sealed tests ${broken.map((r) => r.split("::").slice(1).join("::")).join(", ")}` : `tests of locked criteria (${hit.criteria.join(", ")})`;
  return { allow: false, reason: `${file}: this edit changes ${which}. Fix the code, not the test; add new tests instead of changing these; if the criterion is wrong, ask the developer to unlock it.` };
}

export function touchedFile(call: ToolCall, root: string): string | null {
  return EDIT_TOOLS.has(call.tool_name) ? editedFile(call, root) : null;
}
