/**
 * Development seed: signs up a demo user through the running server, creates a workspace,
 * imports this repository's .lastro/ as the "lastro" project and adds an empty second project.
 * Run with the dev server up: bun scripts/seed-dev.ts
 */
import { fileURLToPath } from "node:url";
import { projectsService, snapshotService, workspacesService } from "@lastro/core";
import { database } from "@lastro/database";
import { projectConfigSchema } from "@lastro/shared";
import { readSnapshot } from "@lastro/snapshot";

const base = process.env.LASTRO_URL ?? "http://localhost:4317";
const email = "dev@lastro.local";
const root = fileURLToPath(new URL("..", import.meta.url));

async function ensureUser() {
  const existing = await database().user.findUnique({ where: { email } });
  if (existing) return existing;
  const res = await fetch(`${base}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: base },
    body: JSON.stringify({ name: "Dev Lastro", email, password: "lastro-dev-password" }),
  });
  if (!res.ok) throw new Error(`sign-up failed: ${res.status} ${await res.text()}`);
  return database().user.findUniqueOrThrow({ where: { email } });
}

const user = await ensureUser();
const actor = { type: "user" as const, id: user.id };
const workspace =
  (await workspacesService.listForUser(user.id)).find((w) => w.slug === "lastro-dev") ??
  (await workspacesService.create(user.id, { name: "Lastro", slug: "lastro-dev" }));

const snapshot = await readSnapshot(root);
const existing = (await projectsService.list(workspace.id)).find((p) => p.key === "lastro");
const project =
  existing ??
  (await projectsService.create(workspace.id, actor, {
    key: "lastro",
    name: "Lastro",
    description: "The Lastro repository tracking its own requirements.",
    repositoryUrl: "https://github.com/srnakyo/lastro",
    config: snapshot.config,
  }));
const report = await snapshotService.import(project.id, actor, snapshot);

if (!(await projectsService.list(workspace.id)).some((p) => p.key === "billing-demo")) {
  await projectsService.create(workspace.id, actor, {
    key: "billing-demo",
    name: "Billing demo",
    description: "An empty project to try the dashboard.",
    config: projectConfigSchema.parse({ project: "billing-demo" }),
  });
}

console.log(`seeded: ${email} / lastro-dev-password, workspace ${workspace.slug}`, report);
process.exit(0);
