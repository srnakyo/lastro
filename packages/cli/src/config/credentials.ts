import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { serverSettings } from "./project";

export interface Credentials {
  url: string;
  token: string;
}

const file = () => join(process.env.XDG_CONFIG_HOME ?? join(homedir(), ".config"), "lastro", "credentials.json");

/**
 * The server and token, in this order: the environment variables that lastro.yml names in server.url_env and
 * server.token_env (LASTRO_URL and LASTRO_TOKEN when it names none), then the file written by `lastro login`.
 * lastro.yml only ever holds variable names, never the values.
 */
export function readCredentials(cwd = process.cwd()): Credentials | null {
  const names = serverSettings(cwd);
  // The names lastro.yml gives win; LASTRO_URL and LASTRO_TOKEN still work, as the GitHub Action sets them.
  const url = process.env[names.urlEnv] || process.env.LASTRO_URL;
  const token = process.env[names.tokenEnv] || process.env.LASTRO_TOKEN;
  if (url && token) return { url, token };
  if (!existsSync(file())) return null;
  return JSON.parse(readFileSync(file(), "utf8")) as Credentials;
}

export function writeCredentials(credentials: Credentials) {
  mkdirSync(dirname(file()), { recursive: true });
  writeFileSync(file(), JSON.stringify(credentials, null, 2), { mode: 0o600 });
}

export function requireCredentials(): Credentials {
  const credentials = readCredentials();
  if (!credentials) {
    const names = serverSettings(process.cwd());
    throw new Error(`not logged in: run \`lastro login --url <server> --token <token>\` or set ${names.urlEnv} and ${names.tokenEnv}`);
  }
  return credentials;
}
