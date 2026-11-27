import { execFileSync } from "node:child_process";
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { snapshotSchema, starterProjectConfig, type Snapshot } from "@lastro/shared";
import { writeSnapshot } from "@lastro/snapshot";
import type { Command } from "commander";
import { LastroClient } from "../api/client";
import { currentServer, saveLogin, serverKey } from "../config/credentials";
import { findRoot, linkedProject, writeLink } from "../config/project";
import { browserLogin } from "../login/browser-login";

/** Where a Lastro server listens by default (docker/compose.prod.yml and the dev server). */
const DEFAULT_SERVER = "http://localhost:4317";


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
    .description("connect this machine to a Lastro server: authorize it in the browser, once for every project")
    .option("--url <url>", "Lastro server (default: the last one, or http://localhost:4317)")
    .option("--token <token>", "a token created by hand in Settings, for CI or a machine without a browser")
    .option("--no-browser", "print the authorization link without opening the browser")
    .action(async (o: { url?: string; token?: string; browser: boolean }) => {
      const url = o.url ?? process.env.LASTRO_URL ?? currentServer() ?? DEFAULT_SERVER;
      if (!o.token) return browserLogin(url, { open: o.browser && process.env.LASTRO_NO_BROWSER !== "1", pollMs: Number(process.env.LASTRO_LOGIN_POLL_MS) || undefined });
      const me = await new LastroClient({ url, token: o.token }).get<{ kind: string; projectKey: string | null }>("/me");
      saveLogin(url, o.token, me.projectKey);
      const reach = me.projectKey ? `only for the ${me.projectKey} project` : "for every project";
      console.log(`logged in to ${serverKey(url)} with ${me.kind === "agent" ? "an agent" : "a person's"} token, ${reach}`);
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
      // An agent creates it too: the server then uses the strict start whatever config is sent.
      if (!existing) await client.post("/projects", { key: project, name: o.name ?? project, config: starterProjectConfig(project) });
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
