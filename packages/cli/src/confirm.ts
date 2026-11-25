import { createInterface } from "node:readline/promises";
import type { LastroClient } from "./api/client";
import { findRoot, humanIdentities } from "./config/project";

async function ask(question: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = (await rl.question(`${question} [y/N] `)).trim().toLowerCase();
  rl.close();
  return answer === "y" || answer === "yes";
}

/**
 * Human commands ask on a terminal. Without one they refuse (exit 2), unless --yes is given with the token
 * of a person listed in gate.human_identities of lastro.yml.
 */
export async function confirmHuman(question: string, yes: boolean, client?: LastroClient): Promise<void> {
  if (yes) {
    if (!client) return;
    const me = await client.get<{ kind: string; email: string | null }>("/me");
    const allowed = humanIdentities(findRoot());
    if (me.kind === "person" && me.email && allowed.includes(me.email)) return;
    console.error(`--yes needs a person's token whose e-mail is listed in gate.human_identities of lastro.yml${me.email ? ` (this token is ${me.email})` : ""}`);
    process.exit(2);
  }
  if (!process.stdin.isTTY) {
    console.error("this command needs a person: run it in a terminal, or pass --yes with the token of a person listed in gate.human_identities");
    process.exit(2);
  }
  if (!(await ask(question))) {
    console.error("cancelled");
    process.exit(1);
  }
}
