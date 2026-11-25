import { createInterface } from "node:readline/promises";

/** Human commands ask on a terminal and refuse to run without one, unless --yes is given. */
export async function confirmHuman(question: string, yes: boolean): Promise<void> {
  if (yes) return;
  if (!process.stdin.isTTY) {
    console.error("this command needs a person: run it in a terminal, or pass --yes with a person's token");
    process.exit(2);
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = (await rl.question(`${question} [y/N] `)).trim().toLowerCase();
  rl.close();
  if (answer !== "y" && answer !== "yes") {
    console.error("cancelled");
    process.exit(1);
  }
}
