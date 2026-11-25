import { readFileSync } from "node:fs";
import { basename } from "node:path";
import type { Command } from "commander";
import { LastroClient } from "../api/client";
import { findRoot, linkedProject } from "../config/project";

export function intakeCommand(program: Command) {
  program
    .command("intake")
    .description("send material (DOCX, PDF, chat export, audio, video, image, Markdown) as a source or a new version of one")
    .argument("<file>")
    .option("--from <role>", "client, dev or team", "client")
    .option("--version-of <source>", "make it a new version of this source")
    .action(async (file: string, o: { from: string; versionOf?: string }) => {
      const form = new FormData();
      form.set("file", new Blob([readFileSync(file)]), basename(file));
      form.set("from", o.from);
      if (o.versionOf) form.set("source", o.versionOf);
      const result = await new LastroClient().upload<{ sourceCode: string; version: number; assets: number }>(`/projects/${linkedProject(findRoot())}/sources`, form);
      console.log(`${result.sourceCode} v${result.version}${result.assets ? `, ${result.assets} images` : ""}`);
    });
}
