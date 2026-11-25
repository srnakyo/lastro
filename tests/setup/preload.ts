import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../..", import.meta.url));
// bun loads the root .env on its own when tests run from the repository root.

const testUrl = process.env.LASTRO_TEST_DATABASE_URL ?? "";
if (!/\/lastro_test(\?|$)/.test(testUrl)) {
  throw new Error("LASTRO_TEST_DATABASE_URL must point to a database named lastro_test; tests never touch other databases");
}
process.env.LASTRO_DATABASE_URL = testUrl;

execFileSync("bunx", ["prisma", "migrate", "deploy"], {
  cwd: `${root}/packages/database`,
  env: { ...process.env, LASTRO_DATABASE_URL: testUrl },
  stdio: "ignore",
});
