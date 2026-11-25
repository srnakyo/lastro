import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export interface Credentials {
  url: string;
  token: string;
}

const file = () => join(process.env.XDG_CONFIG_HOME ?? join(homedir(), ".config"), "lastro", "credentials.json");

/** LASTRO_URL and LASTRO_TOKEN win (CI); otherwise the file written by `lastro login`. */
export function readCredentials(): Credentials | null {
  if (process.env.LASTRO_URL && process.env.LASTRO_TOKEN) return { url: process.env.LASTRO_URL, token: process.env.LASTRO_TOKEN };
  if (!existsSync(file())) return null;
  return JSON.parse(readFileSync(file(), "utf8")) as Credentials;
}

export function writeCredentials(credentials: Credentials) {
  mkdirSync(dirname(file()), { recursive: true });
  writeFileSync(file(), JSON.stringify(credentials, null, 2), { mode: 0o600 });
}

export function requireCredentials(): Credentials {
  const credentials = readCredentials();
  if (!credentials) throw new Error("not logged in: run `lastro login --url <server> --token <token>` or set LASTRO_URL and LASTRO_TOKEN");
  return credentials;
}
