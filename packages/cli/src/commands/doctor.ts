import { validateExport } from "@lastro/snapshot";
import type { Command } from "commander";
import { findRoot } from "../config/project";

export function doctorCommand(program: Command) {
  program
    .command("doctor")
    .description("check every .lastro/ file against its schema, and that lastro.yml holds no secret")
    .action(() => {
      const problems = validateExport(findRoot());
      if (problems.length === 0) return console.log("✓ .lastro/ is valid");
      for (const p of problems) console.log(`✗ ${p.file}${p.path ? ` › ${p.path}` : ""}: ${p.message}`);
      console.log(`${problems.length} problem${problems.length === 1 ? "" : "s"}`);
      process.exitCode = 1;
    });
}
