import type { Actor } from "@lastro/shared";
import { auditService } from "../audit/service";
import { db, transaction } from "../db";
import { LastroError } from "../errors";
import { requireHuman } from "../scope/actor";

/** A person's token acts as that person; an agent token can never do what needs a person. */
export type TokenKind = "person" | "agent";

const PREFIX = "lst";

async function sha256(text: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Buffer.from(digest).toString("hex");
}

function randomPart(length: number) {
  const alphabet = "abcdefghijkmnopqrstuvwxyz23456789";
  return Array.from(crypto.getRandomValues(new Uint8Array(length)), (b) => alphabet[b % alphabet.length]).join("");
}

export interface VerifiedToken {
  id: string;
  workspaceId: string;
  projectId: string | null;
  kind: TokenKind;
  actor: Actor;
}

export const tokensService = {
  /** Creates a token and returns the plain value once; only its hash is stored. */
  async create(workspaceId: string, actor: Actor, input: { name: string; kind: TokenKind; projectId?: string | null; expiresAt?: Date | null }) {
    requireHuman(actor, "creating a token");
    const id = randomPart(8);
    const plain = `${PREFIX}_${id}_${randomPart(32)}`;
    return transaction(async (tx) => {
      const token = await tx.apiToken.create({
        data: {
          workspaceId, projectId: input.projectId ?? null, name: input.name, prefix: `${PREFIX}_${id}`, hash: await sha256(plain),
          scopes: [input.kind], createdById: actor.id ?? "", expiresAt: input.expiresAt ?? null,
        },
      });
      await auditService.record(tx, { workspaceId, projectId: input.projectId ?? null, actor, action: "token.create", entity: "token", entityId: token.prefix, data: { kind: input.kind } });
      return { token: plain, prefix: token.prefix, id: token.id };
    });
  },

  /** Resolves a bearer token, or refuses it. */
  async verify(plain: string): Promise<VerifiedToken> {
    if (!plain.startsWith(`${PREFIX}_`)) throw new LastroError("FORBIDDEN", "invalid token");
    const token = await db().apiToken.findUnique({ where: { hash: await sha256(plain) } });
    if (!token || token.revokedAt || (token.expiresAt && token.expiresAt < new Date())) throw new LastroError("FORBIDDEN", "invalid or revoked token");
    await db().apiToken.update({ where: { id: token.id }, data: { lastUsedAt: new Date() } });
    const kind: TokenKind = token.scopes.includes("person") ? "person" : "agent";
    return {
      id: token.id,
      workspaceId: token.workspaceId,
      projectId: token.projectId,
      kind,
      actor: kind === "person" ? { type: "user", id: token.createdById } : { type: "agent", id: `token:${token.prefix}` },
    };
  },

  async revoke(workspaceId: string, actor: Actor, id: string) {
    requireHuman(actor, "revoking a token");
    return transaction(async (tx) => {
      const token = await tx.apiToken.update({ where: { id, workspaceId }, data: { revokedAt: new Date() } });
      await auditService.record(tx, { workspaceId, projectId: token.projectId, actor, action: "token.revoke", entity: "token", entityId: token.prefix });
    });
  },

  list(workspaceId: string) {
    return db().apiToken.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, prefix: true, scopes: true, projectId: true, lastUsedAt: true, expiresAt: true, revokedAt: true, createdAt: true, project: { select: { key: true } } },
    });
  },
};
