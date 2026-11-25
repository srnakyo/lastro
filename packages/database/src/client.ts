import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/client";

export type Database = PrismaClient;

/** Opens a Prisma client over the pg driver adapter. */
export function createDatabase(url: string): Database {
  if (!url) throw new Error("database URL is empty: set LASTRO_DATABASE_URL");
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
}

let shared: Database | undefined;

/** The process-wide client, from LASTRO_DATABASE_URL. */
export function database(): Database {
  shared ??= createDatabase(process.env.LASTRO_DATABASE_URL ?? "");
  return shared;
}
