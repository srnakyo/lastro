import { join } from "node:path";
import type { BlobStore } from "./blob-store";
import { localStore } from "./local";
import { s3Store } from "./s3";

type Env = Record<string, string | undefined>;

function required(env: Env, names: string[]): Record<string, string> {
  const missing = names.filter((name) => !env[name]);
  // Only names go into the message: values may be secrets.
  if (missing.length > 0) throw new Error(`LASTRO_STORAGE=s3 needs ${missing.join(", ")}`);
  return Object.fromEntries(names.map((name) => [name, env[name] ?? ""]));
}

/** Picks the store from LASTRO_STORAGE (local by default) and its LASTRO_STORAGE_* / LASTRO_S3_* settings. */
export function storeFromEnv(env: Env = process.env): BlobStore {
  const driver = env.LASTRO_STORAGE || "local";
  if (driver === "local") return localStore(env.LASTRO_STORAGE_DIR || join(process.cwd(), ".lastro-storage"));
  if (driver !== "s3") throw new Error(`LASTRO_STORAGE must be "local" or "s3", got "${driver}"`);
  const s3 = required(env, ["LASTRO_S3_BUCKET", "LASTRO_S3_ACCESS_KEY_ID", "LASTRO_S3_SECRET_ACCESS_KEY"]);
  return s3Store({
    endpoint: env.LASTRO_S3_ENDPOINT || undefined,
    region: env.LASTRO_S3_REGION || "auto",
    bucket: s3.LASTRO_S3_BUCKET ?? "",
    accessKeyId: s3.LASTRO_S3_ACCESS_KEY_ID ?? "",
    secretAccessKey: s3.LASTRO_S3_SECRET_ACCESS_KEY ?? "",
  });
}
