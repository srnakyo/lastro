import type { Command } from "commander";
import { snapshotSchema, type Snapshot } from "@lastro/shared";
import { readSnapshot, writeSnapshot } from "@lastro/snapshot";
import { LastroClient } from "../api/client";
import { findRoot, linkedProject } from "../config/project";

export function snapshotCommands(program: Command) {
  program
    .command("import")
    .description("load this repository's .lastro/ into the server")
    .action(async () => {
      const root = findRoot();
      const report = await new LastroClient().post(`/projects/${linkedProject(root)}/import`, await readSnapshot(root));
      console.log(report);
    });

  program
    .command("export")
    .description("write the project as it is on the server into .lastro/")
    .action(async () => {
      const root = findRoot();
      const snapshot = snapshotSchema.parse(await new LastroClient().get<Snapshot>(`/projects/${linkedProject(root)}/export`));
      writeSnapshot(root, snapshot);
      console.log(`wrote ${snapshot.requirements.length} requirements, ${snapshot.decisions.length} decisions, ${snapshot.questions.length} questions to .lastro/`);
    });
}
