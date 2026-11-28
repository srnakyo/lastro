import { commitInfo } from "@lastro/runner";
import { LastroClient } from "../api/client";
import { readCredentials } from "../config/credentials";
import { findRoot, linkedProject, tryRoot } from "../config/project";
import { runGate } from "../commands/verify-run";
import { changedFiles, changedThisTurn, headCommit } from "./changed-files";
import { contextText, type AgentContext } from "./context-text";
import { guardToolCall, touchedFile, type LockedFile, type ToolCall } from "./guard";
import { HookState } from "./state";
import { stopDecision } from "./stop";

interface HookInput extends Partial<ToolCall> {
  session_id?: string;
  hook_event_name?: string;
  source?: string;
  stop_hook_active?: boolean;
}

interface Ctx {
  client: LastroClient;
  root: string;
  project: string;
  session: string;
}

const print = (value: unknown) => process.stdout.write(`${JSON.stringify(value)}\n`);

/** Null when this repository is not set up for Lastro: hooks then stay out of the way. */
function setup(input: HookInput): Ctx | null {
  const credentials = readCredentials();
  if (!credentials) return null;
  try {
    const root = findRoot(input.cwd ?? process.cwd());
    return { client: new LastroClient(credentials), root, project: linkedProject(root), session: input.session_id ?? "unknown" };
  } catch {
    return null;
  }
}

/** Logged in but this folder has no Lastro project yet: tell the agent how to start when the person asks for Lastro. */
function hintUnlinked(input: HookInput) {
  if (!readCredentials(input.cwd ?? process.cwd()) || tryRoot(input.cwd ?? process.cwd())) return;
  print({ hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: UNLINKED_HINT } });
}

export const UNLINKED_HINT =
  "Lastro is set up on this machine, but this folder is not a Lastro project yet. When the person asks to use Lastro here, follow /lastro:start: `lastro init` creates the project on the server and links this folder, then bring their material in as sources.";

const event = (c: Ctx, kind: string, payload: Record<string, unknown> = {}) =>
  c.client.post(`/projects/${c.project}/agent-events`, { agent: "claude-code", session: c.session, kind, payload }).catch(() => undefined);

async function sessionStart(c: Ctx, input: HookInput) {
  new HookState(c.root).keepBase(c.session, headCommit(c.root));
  const ctx = await c.client.get<AgentContext>(`/projects/${c.project}/context`);
  await event(c, "session.start", { source: input.source ?? "startup" });
  print({ hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: contextText(ctx) } });
}

async function preToolUse(c: Ctx, input: HookInput) {
  const call = { tool_name: input.tool_name ?? "", tool_input: input.tool_input ?? {}, cwd: input.cwd ?? process.cwd() };
  const needsLocks = call.tool_name !== "Bash";
  const locked = needsLocks ? await c.client.get<LockedFile[]>(`/projects/${c.project}/locked-tests`) : [];
  const verdict = guardToolCall(call, c.root, locked);
  if (verdict.allow) return;
  await event(c, "tool.denied", { tool: call.tool_name, reason: verdict.reason });
  print({ hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: verdict.reason } });
}

async function postToolUse(c: Ctx, input: HookInput) {
  const file = touchedFile({ tool_name: input.tool_name ?? "", tool_input: input.tool_input ?? {}, cwd: input.cwd ?? process.cwd() }, c.root);
  if (!file) return;
  await c.client.post(`/projects/${c.project}/touches`, { files: [file], branch: commitInfo(c.root).branch, requirement: new HookState(c.root).current() });
  await event(c, "file.edit", { file, tool: input.tool_name });
}

/**
 * The files this turn changed, shell edits included (the edit hooks only see Edit and Write), for the
 * requirement being worked on: `lastro req start` or `lastro req work` says which one.
 */
async function recordChangedFiles(c: Ctx, state: HookState) {
  const { changed, seen } = changedThisTurn(c.root, changedFiles(c.root, state.base(c.session)), state.seen(c.session));
  if (changed.length) await c.client.post(`/projects/${c.project}/touches`, { files: changed, branch: commitInfo(c.root).branch, requirement: state.current() });
  state.setSeen(c.session, seen);
}

async function stop(c: Ctx) {
  const state = new HookState(c.root);
  await recordChangedFiles(c, state);
  const plan = await c.client.get<{ config: { gate?: { block_agent_stop?: boolean; max_stop_blocks?: number } } }>(`/projects/${c.project}/verify-plan`);
  if (plan.config.gate?.block_agent_stop === false) return;
  const gate = await runGate(c.client, c.root, c.project);
  const verdict = stopDecision(gate.requirements, state.blocks(c.session), plan.config.gate?.max_stop_blocks ?? 3, state.takePause());
  if (verdict.stop) {
    state.setBlocks(c.session, 0);
    await event(c, "session.stop", { note: verdict.note ?? null });
    return;
  }
  state.setBlocks(c.session, state.blocks(c.session) + 1);
  await event(c, "stop.blocked", { reason: verdict.reason });
  print({ decision: "block", reason: verdict.reason });
}

const HANDLERS: Record<string, (c: Ctx, input: HookInput) => Promise<void>> = {
  "session-start": sessionStart,
  "pre-tool-use": preToolUse,
  "post-tool-use": postToolUse,
  stop: (c) => stop(c),
};

export const HOOK_EVENTS = Object.keys(HANDLERS);

async function readStdin(): Promise<string> {
  if (process.stdin.isTTY) return "";
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}

/** Runs one Claude Code hook. A hook never breaks the session: on any error it lets the agent go on. */
export async function runHook(name: string) {
  const handler = HANDLERS[name];
  if (!handler) throw new Error(`unknown hook ${name}: use one of ${HOOK_EVENTS.join(", ")}`);
  try {
    const raw = await readStdin();
    const input = (raw ? JSON.parse(raw) : {}) as HookInput;
    const c = setup(input);
    if (c) await handler(c, input);
    else if (name === "session-start") hintUnlinked(input);
  } catch (error) {
    process.stderr.write(`lastro hook ${name}: ${(error as Error).message}\n`);
  }
}
