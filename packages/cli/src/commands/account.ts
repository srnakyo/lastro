import { execFileSync } from "node:child_process";
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { snapshotSchema, type Snapshot } from "@lastro/shared";
import { writeSnapshot } from "@lastro/snapshot";
import type { Command } from "commander";
import { LastroClient } from "../api/client";
import { writeCredentials } from "../config/credentials";
import { findRoot, linkedProject, writeLink } from "../config/project";

/**
 * A new project starts automatic and strict about tests: written before the code, at the levels each type
 * asks (an interface needs a Playwright test), using the requester's numbers, running every routine touched.
 */
const STARTER_CONFIG = (project: string) => ({
  version: 1,
  project,
  language: "en",
  autonomy: "auto",
  tests: { red_first: true, examples_in_tests: true, coverage_report: "coverage/lcov.info" },
  approval: { spec: ["dev"], require_final_source: true },
  commands: {},
  conditions: {},
  types: {
    behavior: { required: ["where"], flow: [], tests: { levels: ["unit", "integration"], coverage: { functions: 100, lines: 90 } } },
    calculation: { required: ["examples"], flow: [], tests: { levels: ["unit"], coverage: { functions: 100, lines: 100 } } },
    // Screens are proven on screen, in every condition: unit coverage does not measure them.
    ui: { required: ["where"], flow: [], tests: { levels: ["unit", "e2e"] } },
  },
  global_flow: [],
  server: { project },
});

/** The git repository's root, or the current folder outside git. */
function repositoryRoot(): string {
  try {
    return execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return process.cwd();
  }
}

/** Adds .lastro/.out/ (runs, reports, hook state) to .gitignore once. */
function ignoreOutput(root: string) {
  const file = join(root, ".gitignore");
  const current = existsSync(file) ? readFileSync(file, "utf8") : "";
  if (current.split("\n").some((line) => line.trim() === ".lastro/.out/")) return;
  appendFileSync(file, `${current && !current.endsWith("\n") ? "\n" : ""}.lastro/.out/\n`);
}

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
    .description("create the project on the server and write the first .lastro/ export at the repository root")
    .argument("[key]", "project key: lowercase letters, digits and hyphens (default: the folder name)")
    .option("--name <name>", "project name")
    .action(async (key: string | undefined, o: { name?: string }) => {
      const root = repositoryRoot();
      if (existsSync(join(root, ".lastro", "lastro.yml"))) {
        console.log(`already initialized: .lastro/lastro.yml is linked to ${linkedProject(root)}`);
        return;
      }
      const project = key ?? basename(root).toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
      const client = new LastroClient();
      const existing = await client.get(`/projects/${project}`).then(() => true, () => false);
      if (!existing) await client.post("/projects", { key: project, name: o.name ?? project, config: STARTER_CONFIG(project) });
      const snapshot = snapshotSchema.parse(await client.get<Snapshot>(`/projects/${project}/export`));
      writeSnapshot(root, { ...snapshot, config: { ...snapshot.config, server: { ...snapshot.config.server, project } } });
      ignoreOutput(root);
      console.log(`${existing ? "linked to the existing project" : "created project"} ${project} and wrote .lastro/ in ${root}`);
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
