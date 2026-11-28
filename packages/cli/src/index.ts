#!/usr/bin/env node
import { redactSecrets } from "@lastro/shared";
import { Command } from "commander";
import { ApiError } from "./api/client";
import { accountCommands } from "./commands/account";
import { snapshotCommands } from "./commands/snapshot";
import { docsCommand } from "./commands/docs";
import { doctorCommand } from "./commands/doctor";
import { hookCommands } from "./commands/hook";
import { humanCommands } from "./commands/human";
import { intakeCommand } from "./commands/intake";
import { mcpCommand } from "./commands/mcp";
import { requirementCommands } from "./commands/requirement";
import { specCommands } from "./commands/spec";
import { verifyCommands } from "./commands/verify";

const program = new Command("lastro").description("Requirements, evidence and quality gates for AI-driven development.").version("0.4.1");

accountCommands(program);
snapshotCommands(program);
specCommands(program);
requirementCommands(program);
verifyCommands(program);
mcpCommand(program);
intakeCommand(program);
docsCommand(program);
doctorCommand(program);
hookCommands(program);
humanCommands(program);

program.parseAsync().catch((error: unknown) => {
  if (error instanceof ApiError) console.error(`lastro: ${redactSecrets(error.message)} (${error.code})`);
  else console.error(`lastro: ${redactSecrets((error as Error).message)}`);
  process.exit(1);
});
