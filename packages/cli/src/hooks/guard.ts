import { relative, resolve } from "node:path";

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

/**
 * Decides whether the agent may run a tool: no human commands, no edits to the .lastro/ export
 * (it comes from the server) and no edits to tests bound to locked criteria.
 */
export function guardToolCall(call: ToolCall, root: string, locked: { file: string; criteria: string[] }[]): Verdict {
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
  if (hit) return { allow: false, reason: `${file} holds tests of locked criteria (${hit.criteria.join(", ")}). Fix the code, not the test; if the criterion is wrong, ask the developer to unlock it.` };
  return { allow: true };
}

export function touchedFile(call: ToolCall, root: string): string | null {
  return EDIT_TOOLS.has(call.tool_name) ? editedFile(call, root) : null;
}
