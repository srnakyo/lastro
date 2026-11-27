import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { linkedProject, serverSettings, tryRoot } from "./project";

export interface Credentials {
  url: string;
  token: string;
}

/** One server's logins: the token for every project (from `lastro login`), and tokens that work in one project only. */
interface ServerLogin {
  token?: string;
  projects?: Record<string, string>;
}

/** ~/.config/lastro/credentials.json: every server this machine logged in to, and the one used last. */
interface CredentialsFile {
  current?: string;
  servers: Record<string, ServerLogin>;
}

const file = () => join(process.env.XDG_CONFIG_HOME ?? join(homedir(), ".config"), "lastro", "credentials.json");

export const serverKey = (url: string) => url.trim().replace(/\/+$/, "");

function readFile(): CredentialsFile {
  if (!existsSync(file())) return { servers: {} };
  const raw = JSON.parse(readFileSync(file(), "utf8")) as Partial<CredentialsFile> & { url?: string; token?: string };
  // Version 0.1.0 kept a single server and token.
  if (typeof raw.url === "string" && typeof raw.token === "string") return { current: serverKey(raw.url), servers: { [serverKey(raw.url)]: { token: raw.token } } };
  return { current: raw.current, servers: raw.servers ?? {} };
}

/** The project of the repository around `cwd`, when it is linked to one. */
function projectAt(cwd: string): string | null {
  const root = tryRoot(cwd);
  if (!root) return null;
  try {
    return linkedProject(root);
  } catch {
    return null;
  }
}

/**
 * The server and token, in this order: the environment variables that lastro.yml names in server.url_env and
 * server.token_env (LASTRO_URL and LASTRO_TOKEN when it names none), then what `lastro login` stored: the
 * token of this repository's project when there is one only for it, or else the one for every project.
 * lastro.yml only ever holds variable names, never the values.
 */
export function readCredentials(cwd = process.cwd()): Credentials | null {
  const names = serverSettings(cwd);
  // The names lastro.yml gives win; LASTRO_URL and LASTRO_TOKEN still work, as the GitHub Action sets them.
  const envUrl = process.env[names.urlEnv] || process.env.LASTRO_URL;
  const envToken = process.env[names.tokenEnv] || process.env.LASTRO_TOKEN;
  if (envUrl && envToken) return { url: envUrl, token: envToken };
  const stored = readFile();
  const url = envUrl ? serverKey(envUrl) : stored.current;
  const server = url ? stored.servers[url] : undefined;
  if (!url || !server) return null;
  const project = projectAt(cwd);
  const token = (project && server.projects?.[project]) || server.token;
  return token ? { url, token } : null;
}

/** Stores a login: for every project of the server, or for one project when the token works only there. */
export function saveLogin(url: string, token: string, projectKey: string | null = null) {
  const stored = readFile();
  const key = serverKey(url);
  const server = stored.servers[key] ?? {};
  if (projectKey) server.projects = { ...server.projects, [projectKey]: token };
  else server.token = token;
  const next: CredentialsFile = { current: key, servers: { ...stored.servers, [key]: server } };
  mkdirSync(dirname(file()), { recursive: true });
  writeFileSync(file(), JSON.stringify(next, null, 2), { mode: 0o600 });
}

/** The server `lastro login` used last, if any. */
export function currentServer(): string | null {
  return readFile().current ?? null;
}

export function requireCredentials(): Credentials {
  const credentials = readCredentials();
  if (!credentials) {
    const names = serverSettings(process.cwd());
    throw new Error(`not logged in: run \`lastro login\` (or set ${names.urlEnv} and ${names.tokenEnv})`);
  }
  return credentials;
}
