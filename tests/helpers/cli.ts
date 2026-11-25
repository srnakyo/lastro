import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { handleApi } from "../../apps/web/src/api-lib";

const entry = fileURLToPath(new URL("../../packages/cli/src/index.ts", import.meta.url));

/** The REST API on a free port, in this process: the CLI under test talks to it like to a real server. */
export function startApi() {
  const server = Bun.serve({ port: 0, fetch: (request) => (new URL(request.url).pathname.startsWith("/api/v1") ? handleApi(request) : new Response("not found", { status: 404 })) });
  return { url: `http://localhost:${server.port}`, stop: () => server.stop(true) };
}

/** Runs `lastro <args>` in a folder, with no terminal attached and no stored login. */
export async function lastro(args: string[], options: { cwd: string; url: string; token: string; env?: Record<string, string> }) {
  const proc = Bun.spawn(["bun", entry, ...args], {
    cwd: options.cwd,
    env: { PATH: process.env.PATH ?? "", HOME: options.cwd, XDG_CONFIG_HOME: join(options.cwd, ".config"), LASTRO_URL: options.url, LASTRO_TOKEN: options.token, ...options.env },
    stdin: "ignore",
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, code] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text(), proc.exited]);
  return { code, stdout, stderr };
}

export const tempRepo = () => mkdtempSync(join(tmpdir(), "lastro-cli-"));
