import { timingSafeEqual } from "node:crypto";
import type { Actor } from "@lastro/shared";
import { db } from "../db";
import { LastroError } from "../errors";
import { requireHuman } from "../scope/actor";
import { tokensService } from "../tokens/service";

/** How long a person has to authorize a `lastro login` in the browser. */
export const CLI_LOGIN_TTL_MS = 10 * 60 * 1000;
/** Logins waiting at once, across the server: the start endpoint needs no token, so it is capped. */
export const CLI_LOGIN_MAX_PENDING = 100;

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type CliLoginState = "pending" | "approved" | "denied" | "used" | "expired";

export type CliLoginResult = { status: "pending" | "denied" | "expired" } | { status: "approved"; token: string; workspace: { name: string; slug: string } };

function randomFrom(alphabet: string, length: number) {
  return Array.from(crypto.getRandomValues(new Uint8Array(length)), (b) => alphabet[b % alphabet.length]).join("");
}

async function sha256(text: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Buffer.from(digest).toString("hex");
}

function sameHash(a: string, b: string) {
  const left = Buffer.from(a, "hex");
  const right = Buffer.from(b, "hex");
  return left.length === right.length && timingSafeEqual(left, right);
}

/** The machine name the CLI sends, as plain short text: it is shown to the person who authorizes. */
function cleanHost(host: string) {
  // eslint-disable-next-line no-control-regex
  const text = host.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 80);
  return text || "unknown computer";
}

async function find(id: string) {
  const login = UUID.test(id) ? await db().cliLogin.findUnique({ where: { id } }) : null;
  if (!login) throw new LastroError("NOT_FOUND", "this login does not exist: run lastro login again");
  return login;
}

const stateOf = (login: { status: string; expiresAt: Date }, now: Date): CliLoginState =>
  login.status === "pending" && login.expiresAt <= now ? "expired" : (login.status as CliLoginState);

/**
 * `lastro login` without a token: the CLI asks for a login, the person authorizes it in the browser where
 * they are signed in, and the CLI collects an agent token for the workspace. Like a device login: the CLI and
 * the page show the same code, so the person can tell it is their terminal asking.
 */
export const cliLoginService = {
  async start(input: { host: string }, now = new Date()) {
    await db().cliLogin.deleteMany({ where: { expiresAt: { lt: now } } });
    const waiting = await db().cliLogin.count({ where: { status: "pending" } });
    if (waiting >= CLI_LOGIN_MAX_PENDING) throw new LastroError("RATE_LIMITED", "too many logins waiting: try again in a few minutes");
    const secret = randomFrom("abcdefghijkmnopqrstuvwxyz23456789", 40);
    const code = `${randomFrom(CODE_ALPHABET, 4)}-${randomFrom(CODE_ALPHABET, 4)}`;
    const login = await db().cliLogin.create({
      data: { code, secretHash: await sha256(secret), host: cleanHost(input.host), expiresAt: new Date(now.getTime() + CLI_LOGIN_TTL_MS) },
    });
    return { id: login.id, code, secret, expiresAt: login.expiresAt };
  },

  /** What the authorization page shows. */
  async get(id: string, now = new Date()) {
    const login = await find(id);
    return { id: login.id, code: login.code, host: login.host, state: stateOf(login, now), expiresAt: login.expiresAt };
  },

  async approve(id: string, workspaceId: string, actor: Actor, now = new Date()) {
    requireHuman(actor, "authorizing a CLI login");
    const done = await db().cliLogin.updateMany({ where: { id, status: "pending", expiresAt: { gt: now } }, data: { status: "approved", workspaceId, approvedById: actor.id } });
    if (done.count === 0) throw new LastroError("CONFLICT", "this login expired or was already answered: run lastro login again");
  },

  async deny(id: string, actor: Actor, now = new Date()) {
    requireHuman(actor, "refusing a CLI login");
    const done = await db().cliLogin.updateMany({ where: { id, status: "pending", expiresAt: { gt: now } }, data: { status: "denied" } });
    if (done.count === 0) throw new LastroError("CONFLICT", "this login expired or was already answered");
  },

  /** The CLI polls with its secret; once authorized, it gets the token, once. */
  async collect(id: string, secret: string, now = new Date()): Promise<CliLoginResult> {
    const login = await find(id);
    if (!sameHash(login.secretHash, await sha256(secret))) throw new LastroError("FORBIDDEN", "wrong secret for this login");
    const state = stateOf(login, now);
    if (state === "pending" || state === "denied" || state === "expired") return { status: state };
    if (state === "used" || !login.workspaceId || !login.approvedById) throw new LastroError("CONFLICT", "this login was already used: run lastro login again");
    const claimed = await db().cliLogin.updateMany({ where: { id, status: "approved" }, data: { status: "used" } });
    if (claimed.count === 0) throw new LastroError("CONFLICT", "this login was already used: run lastro login again");
    const person: Actor = { type: "user", id: login.approvedById };
    const { token } = await tokensService.create(login.workspaceId, person, { name: `CLI · ${login.host}`, kind: "agent" });
    const workspace = await db().workspace.findUniqueOrThrow({ where: { id: login.workspaceId }, select: { name: true, slug: true } });
    return { status: "approved", token, workspace };
  },
};
