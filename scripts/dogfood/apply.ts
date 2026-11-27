/**
 * Dogfood: links the real tests to the criteria of Lastro's own requirements, records the files each one
 * touches (scripts/dogfood/touches.ts), records the design readings
 * as proposed decisions, and writes the canonical export back to .lastro/. Runs against lastro_test:
 *   bun --preload ./tests/setup/preload.ts scripts/dogfood/apply.ts
 */
import { fileURLToPath } from "node:url";
import { decisionsService, exportSnapshot, projectsService, requirementsService, snapshotService, workspacesService } from "@lastro/core";
import { database } from "@lastro/database";
import type { Actor } from "@lastro/shared";
import { readSnapshot, writeSnapshot } from "@lastro/snapshot";
import { DECISIONS } from "./decisions";
import { missingTests } from "./check-links";
import { LINKS } from "./links";
import { TOUCHES } from "./touches";

const root = fileURLToPath(new URL("../..", import.meta.url));
// A renamed test would be linked under its old name and never run: refuse before touching anything.
const missing = missingTests(root, LINKS);
if (missing.length) throw new Error(`linked tests not found in their files:\n${missing.join("\n")}`);
const agent: Actor = { type: "agent", id: "claude-code" };
const db = database();
const tables = await db.$queryRawUnsafe<{ tablename: string }[]>("select tablename from pg_tables where schemaname='public' and tablename <> '_prisma_migrations'");
await db.$executeRawUnsafe(`truncate table ${tables.map((r) => `"${r.tablename}"`).join(", ")} cascade`);
const user = await db.user.create({ data: { id: "dogfood", name: "Dogfood", email: "dogfood@example.test" } });
const person: Actor = { type: "user", id: user.id };
const ws = await workspacesService.create(user.id, { name: "Dogfood", slug: "dogfood" });

const snapshot = await readSnapshot(root);
const config = structuredClone(snapshot.config);
config.commands.typecheck = { run: "bun run typecheck" };
if (config.commands.e2e) config.commands.e2e.report = { ...config.commands.e2e.report, junit_prefix: "tests/e2e/" };
// Screens have unit tests too (diagrams, highlight, catalog): the ui flow runs them before the browsers.
const ui = config.types.ui;
if (ui && !ui.flow.includes("unit")) ui.flow.splice(ui.flow.indexOf("typecheck") + 1, 0, "unit");
const project = await projectsService.create(ws.id, person, { key: "lastro", name: "Lastro", config: snapshot.config });
await snapshotService.import(project.id, person, { ...snapshot, config });

for (const [code, criteria] of Object.entries(LINKS)) {
  const view = await requirementsService.get(project.id, code);
  const next = view.criteria.map((c) => ({ code: c.code, text: c.text, tests: criteria[c.code] ?? c.tests.map((t) => t.testRef) }));
  await requirementsService.update(project.id, agent, code, { criteria: next });
}
for (const [code, touches] of Object.entries(TOUCHES)) await db.requirement.update({ where: { projectId_code: { projectId: project.id, code } }, data: { touches: [...touches].sort() } });
const existing = new Set((await db.decision.findMany({ where: { projectId: project.id } })).map((d) => d.text));
for (const d of DECISIONS) if (!existing.has(d.text)) await decisionsService.record(project.id, agent, d);

writeSnapshot(root, await exportSnapshot(project.id));
const views = await requirementsService.list(project.id);
console.log(`${views.length} requirements, ${views.flatMap((v) => v.criteria).filter((c) => c.tests.length === 0).length} criteria without a test`);
process.exit(0);
