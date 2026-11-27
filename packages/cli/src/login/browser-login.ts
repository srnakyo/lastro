import { hostname } from "node:os";
import { saveLogin, serverKey } from "../config/credentials";
import { openBrowser } from "./open-browser";

interface Started {
  id: string;
  code: string;
  secret: string;
  expiresAt: string;
}

type Collected = { status: "pending" | "denied" | "expired" } | { status: "approved"; token: string; workspace: { name: string; slug: string } };

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(data.error ?? `${res.status} ${res.statusText}`);
  return data as T;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * `lastro login` without a token: asks the server for a login, opens /cli/authorize/<id> in the browser where
 * the person is signed in, and waits for their answer. Authorized, it stores an agent token that works in
 * every project of the workspace, so the CLI never switches tokens between repositories.
 */
export async function browserLogin(url: string, options: { open: boolean; pollMs?: number }) {
  const base = serverKey(url);
  const login = await post<Started>(`${base}/api/v1/cli/login`, { host: hostname() });
  const page = `${base}/cli/authorize/${login.id}`;
  console.log(`Authorize this terminal in the browser:\n  ${page}\nCheck that the page shows the code ${login.code}. Waiting for your answer...`);
  if (options.open) openBrowser(page);
  const pollMs = options.pollMs ?? 2000;
  const deadline = new Date(login.expiresAt).getTime() + pollMs;
  while (Date.now() < deadline) {
    await sleep(pollMs);
    const answer = await post<Collected>(`${base}/api/v1/cli/login/${login.id}`, { secret: login.secret });
    if (answer.status === "pending") continue;
    if (answer.status === "approved") {
      saveLogin(base, answer.token);
      console.log(`logged in to ${base}: an agent token for every project of the ${answer.workspace.name} workspace`);
      return;
    }
    throw new Error(answer.status === "denied" ? "the login was refused in the browser" : "the login expired: run lastro login again");
  }
  throw new Error("the login expired: run lastro login again");
}
