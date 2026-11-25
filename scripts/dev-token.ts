/**
 * Development helper: prints a new AGENT token for the dev workspace, for trying the CLI and MCP
 * against a local server. Person tokens are created by a person in Settings › Access tokens.
 * Usage: bun scripts/dev-token.ts <name>
 */
import { tokensService, workspacesService } from "@lastro/core";
import { database } from "@lastro/database";

const user = await database().user.findUniqueOrThrow({ where: { email: "dev@lastro.local" } });
const workspace = (await workspacesService.listForUser(user.id)).find((w) => w.slug === "lastro-dev");
if (!workspace) throw new Error("run bun scripts/seed-dev.ts first");
const created = await tokensService.create(workspace.id, { type: "user", id: user.id }, { name: process.argv[2] ?? "dev-agent", kind: "agent" });
console.log(created.token);
process.exit(0);
