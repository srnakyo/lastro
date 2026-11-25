#!/usr/bin/env node
import { Command } from "commander";
import { ApiError } from "./api/client";
import { accountCommands } from "./commands/account";
import { snapshotCommands } from "./commands/snapshot";
import { docsCommand } from "./commands/docs";
import { hookCommands } from "./commands/hook";
import { intakeCommand } from "./commands/intake";
import { mcpCommand } from "./commands/mcp";
import { specCommands } from "./commands/spec";
import { verifyCommands } from "./commands/verify";

const program = new Command("lastro").description("Requirements, evidence and quality gates for AI-driven development.").version("0.1.0");

accountCommands(program);
snapshotCommands(program);
specCommands(program);
verifyCommands(program);
mcpCommand(program);
intakeCommand(program);
docsCommand(program);
hookCommands(program);

program.parseAsync().catch((error: unknown) => {
  if (error instanceof ApiError) console.error(`lastro: ${error.message} (${error.code})`);
  else console.error(`lastro: ${(error as Error).message}`);
  process.exit(1);
});
