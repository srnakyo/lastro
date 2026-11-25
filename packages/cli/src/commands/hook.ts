import { chmodSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Command } from "commander";
import { LastroClient } from "../api/client";
import { findRoot, linkedProject } from "../config/project";
import { HOOK_EVENTS, runHook } from "../hooks/run";
import { HookState } from "../hooks/state";
import { runGate } from "./verify-run";

const PRE_PUSH = `#!/bin/sh
# Installed by lastro install-hooks: refuses the push while the Lastro gate is red.
exec lastro gate
`;

export function hookCommands(program: Command) {
  program
    .command("hook")
    .description(`run a Claude Code hook (${HOOK_EVENTS.join(", ")}); reads the hook JSON on stdin`)
    .argument("<event>")
    .action(async (name: string) => runHook(name));

  program
    .command("pause")
    .description("record why the agent stops without finishing, so the stop hook lets it stop")
    .argument("<reason>")
    .action((reason: string) => {
      new HookState(findRoot()).pause(reason);
      console.log("paused");
    });

  program
    .command("install-hooks")
    .description("install the git pre-push hook that runs lastro gate")
    .action(() => {
      const root = findRoot();
      const file = join(root, ".git", "hooks", "pre-push");
      if (!existsSync(join(root, ".git"))) throw new Error("not a git repository");
      if (existsSync(file) && !readFileSync(file, "utf8").includes("lastro")) throw new Error(".git/hooks/pre-push exists and is not Lastro's: add `lastro gate` to it yourself");
      writeFileSync(file, PRE_PUSH);
      chmodSync(file, 0o755);
      console.log("installed .git/hooks/pre-push");
    });

  program
    .command("status")
    .description("one line per requirement in building: green or what is missing")
    .action(async () => {
      const root = findRoot();
      const result = await runGate(new LastroClient(), root, linkedProject(root));
      for (const [code, g] of Object.entries(result.requirements)) console.log(`${g.pass ? "✓" : "✗"} ${code} ${g.status ?? ""} ${[...g.agentCanFix, ...g.needsPerson].join("; ")}`.trimEnd());
    });
}
