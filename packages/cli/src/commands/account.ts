import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { Command } from "commander";
import { stringify } from "yaml";
import { LastroClient } from "../api/client";
import { writeCredentials } from "../config/credentials";
import { findRoot, writeLink } from "../config/project";

const STARTER_CONFIG = (project: string) => ({
  version: 1,
  project,
  language: "en",
  approval: { spec: ["dev"], require_final_source: true },
  commands: {},
  conditions: {},
  types: { behavior: { required: ["where"], flow: [] } },
  global_flow: [],
  server: { project },
});

export function accountCommands(program: Command) {
  program
    .command("login")
    .description("store the server URL and your token")
    .requiredOption("--url <url>", "Lastro server, like https://lastro.example.com")
    .requiredOption("--token <token>", "a person's token from Settings › Access tokens")
    .action(async (o: { url: string; token: string }) => {
      const me = await new LastroClient({ url: o.url, token: o.token }).get<{ kind: string }>("/me");
      writeCredentials({ url: o.url, token: o.token });
      console.log(`logged in to ${o.url} with ${me.kind === "agent" ? "an agent" : "a person's"} token`);
    });

  program
    .command("init")
    .description("create .lastro/ here and the project on the server")
    .argument("<key>", "project key: lowercase letters, digits and hyphens")
    .option("--name <name>", "project name")
    .action(async (key: string, o: { name?: string }) => {
      const dir = join(process.cwd(), ".lastro");
      if (existsSync(join(dir, "lastro.yml"))) throw new Error(".lastro/lastro.yml already exists: use `lastro link` or `lastro import`");
      const config = STARTER_CONFIG(key);
      await new LastroClient().post("/projects", { key, name: o.name ?? key, config });
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, "lastro.yml"), stringify(config));
      writeFileSync(join(dir, "glossary.yml"), stringify({ terms: [], invariants: [] }));
      console.log(`created project ${key} and .lastro/`);
    });

  program
    .command("link")
    .description("link this repository to a project on the server")
    .argument("<key>", "project key")
    .action(async (key: string) => {
      await new LastroClient().get(`/projects/${key}`);
      writeLink(findRoot(), key);
      console.log(`linked to ${key}`);
    });
}
