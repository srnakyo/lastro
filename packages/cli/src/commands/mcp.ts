import type { Command } from "commander";
import { LastroClient } from "../api/client";
import { findRoot, linkedProject } from "../config/project";
import { McpBridge } from "../mcp/bridge";

export function mcpCommand(program: Command) {
  program
    .command("mcp")
    .description("MCP server over stdio for Claude Code and other agents (use an agent token)")
    .action(() => {
      const root = findRoot();
      new McpBridge(new LastroClient(), root, linkedProject(root)).start();
    });
}
