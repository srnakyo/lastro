import { agentEventsService, LastroError, projectsService } from "@lastro/core";
import type { VerifiedToken } from "@lastro/core";
import { TOOLS, toolList, type ToolName } from "./catalog";
import { callTool } from "./tools";

export const PROTOCOL_VERSION = "2025-06-18";

interface RpcRequest {
  jsonrpc: "2.0";
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

const reply = (id: RpcRequest["id"], result: unknown) => ({ jsonrpc: "2.0", id: id ?? null, result });
const fail = (id: RpcRequest["id"], code: number, message: string) => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });

/** The project of the call: the token's own, or the one the client names in ?project=. */
async function projectId(token: VerifiedToken, requested: string | null): Promise<string> {
  if (token.projectId) return token.projectId;
  if (!requested) throw new LastroError("VALIDATION", "this token is not bound to a project: add ?project=<key> to the MCP URL");
  return (await projectsService.getByKey(token.workspaceId, requested)).id;
}

async function toolsCall(req: RpcRequest, token: VerifiedToken, project: string, session: string) {
  const name = String(req.params?.name ?? "") as ToolName;
  if (!(name in TOOLS)) return fail(req.id, -32602, `unknown tool ${name}`);
  const args = req.params?.arguments ?? {};
  await agentEventsService.record(project, { agent: "mcp", externalId: session }, name, { arguments: args as never });
  try {
    const result = await callTool(name, args, { token, projectId: project });
    return reply(req.id, { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return reply(req.id, { content: [{ type: "text", text: message }], isError: true });
  }
}

/** Handles one JSON-RPC message. Notifications return null. */
export async function handleRpc(req: RpcRequest, token: VerifiedToken, requestedProject: string | null, session: string) {
  if (req.method.startsWith("notifications/")) return null;
  if (req.method === "initialize") {
    return reply(req.id, { protocolVersion: PROTOCOL_VERSION, capabilities: { tools: { listChanged: false } }, serverInfo: { name: "lastro", version: "0.1.0" } });
  }
  if (req.method === "ping") return reply(req.id, {});
  if (req.method === "tools/list") return reply(req.id, { tools: toolList() });
  if (req.method === "tools/call") return toolsCall(req, token, await projectId(token, requestedProject), session);
  return fail(req.id, -32601, `method ${req.method} not found`);
}
