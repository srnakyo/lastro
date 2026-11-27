import { beforeEach, describe, expect, it } from "bun:test";
import { tokensService } from "@lastro/core";
import { database } from "@lastro/database";
import { resetDatabase } from "../helpers/db";
import { agent, createProject } from "../helpers/fixtures";

beforeEach(resetDatabase);

describe("revoking a token", () => {
  it("makes the token stop authenticating", async () => {
    const { workspace, actor } = await createProject();
    const created = await tokensService.create(workspace.id, actor, { name: "ci", kind: "agent" });
    await tokensService.revoke(workspace.id, actor, created.id);
    await expect(tokensService.verify(created.token)).rejects.toThrow("invalid or revoked token");
  });

  it("is refused to an agent", async () => {
    const { workspace, actor } = await createProject();
    const created = await tokensService.create(workspace.id, actor, { name: "ci", kind: "agent" });
    await expect(tokensService.revoke(workspace.id, agent, created.id)).rejects.toThrow("needs a person");
  });

  it("writes the revocation to the audit trail", async () => {
    const { workspace, actor } = await createProject();
    const created = await tokensService.create(workspace.id, actor, { name: "ci", kind: "agent" });
    await tokensService.revoke(workspace.id, actor, created.id);
    expect(await database().auditEvent.count({ where: { action: "token.revoke", entityId: created.prefix } })).toBe(1);
  });
});

describe("listing tokens", () => {
  it("lists the newest first, with the project key and without the hash", async () => {
    const { workspace, actor, project } = await createProject();
    const older = await tokensService.create(workspace.id, actor, { name: "older", kind: "person" });
    const newer = await tokensService.create(workspace.id, actor, { name: "newer", kind: "agent", projectId: project.id });
    const rows = await tokensService.list(workspace.id);
    expect(rows.map((r) => r.id)).toEqual([newer.id, older.id]);
    expect(rows[0]?.project?.key).toBe("billing");
    expect(rows[0]).not.toHaveProperty("hash");
  });

  it("does not list the tokens of another workspace", async () => {
    const { workspace, actor } = await createProject();
    await tokensService.create(workspace.id, actor, { name: "mine", kind: "person" });
    expect(await tokensService.list(crypto.randomUUID())).toEqual([]);
  });
});

describe("verifying a token", () => {
  it("refuses an expired token", async () => {
    const { workspace, actor } = await createProject();
    const created = await tokensService.create(workspace.id, actor, { name: "old", kind: "agent", expiresAt: new Date(Date.now() - 1000) });
    await expect(tokensService.verify(created.token)).rejects.toThrow("invalid or revoked token");
  });
});
