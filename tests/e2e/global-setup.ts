import { execFileSync } from "node:child_process";

/** Fresh e2e-demo and shop-demo projects before every run, so the tests never depend on what ran before. E2E_SKIP_SEED=1 keeps the data as it is. */
export default function globalSetup() {
  if (process.env.E2E_SKIP_SEED === "1") return;
  execFileSync("bun", ["scripts/seed-e2e.ts"], { stdio: "inherit" });
}
