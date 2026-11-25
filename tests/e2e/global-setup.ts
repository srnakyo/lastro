import { execFileSync } from "node:child_process";

/** Fresh e2e-demo project before every run, so the tests never depend on what ran before. */
export default function globalSetup() {
  execFileSync("bun", ["scripts/seed-e2e.ts"], { stdio: "inherit" });
}
