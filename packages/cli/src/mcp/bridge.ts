import { createInterface } from "node:readline";
import type { LastroClient } from "../api/client";
import { runVerify } from "../commands/verify-run";
import { HookState } from "../hooks/state";

interface Message {
  jsonrpc: "2.0";
  id?: string | number | null;
  method?: string;
  params?: { name?: string; arguments?: { code?: string; reason?: string } };
}

const write = (value: unknown) => process.stdout.write(`${JSON.stringify(value)}\n`);

/**
 * Bridges an MCP client speaking stdio to the server's /api/mcp. lastro_verify runs here, on the
 * developer's machine, because it executes the project's commands.
 */
export class McpBridge {
  private session: string | null = null;

  constructor(
    private readonly client: LastroClient,
    private readonly root: string,
    private readonly project: string,
  ) {}

  start() {
    const rl = createInterface({ input: process.stdin });
    rl.on("line", (line) => {
      if (line.trim()) void this.handle(line);
    });
  }

  private async handle(line: string) {
    let message: Message;
    try {
      message = JSON.parse(line) as Message;
    } catch {
      return write({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "parse error" } });
    }
    try {
      if (message.method === "tools/call" && message.params?.name === "lastro_verify") return write(await this.verify(message));
      if (message.method === "tools/call" && message.params?.name === "lastro_pause") new HookState(this.root).pause(message.params.arguments?.reason ?? "");
      const res = await this.client.mcp(this.project, message, this.session);
      this.session = res.session ?? this.session;
      if (res.status !== 202 && res.body) process.stdout.write(`${res.body.trim()}\n`);
    } catch (error) {
      if (message.id !== undefined) write({ jsonrpc: "2.0", id: message.id, error: { code: -32603, message: (error as Error).message } });
    }
  }

  private async verify(message: Message) {
    try {
      const outcome = await runVerify(this.client, this.root, this.project, message.params?.arguments?.code, "agent");
      const text = JSON.stringify({ runId: outcome.runId, status: outcome.status, gates: outcome.gates, stages: outcome.report.stages.map((s) => ({ requirement: s.requirement, stage: s.stage, condition: s.condition, status: s.status, output: s.status === "passed" ? "" : s.output.slice(-4000) })) }, null, 2);
      return { jsonrpc: "2.0", id: message.id ?? null, result: { content: [{ type: "text", text }] } };
    } catch (error) {
      return { jsonrpc: "2.0", id: message.id ?? null, result: { content: [{ type: "text", text: (error as Error).message }], isError: true } };
    }
  }
}
