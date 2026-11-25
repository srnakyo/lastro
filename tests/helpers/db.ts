import { database } from "@lastro/database";

/** Empties every table of the test database. TRUNCATE skips the append-only row trigger on purpose. */
export async function resetDatabase() {
  const rows = await database().$queryRawUnsafe<{ tablename: string }[]>(
    "select tablename from pg_tables where schemaname = 'public' and tablename <> '_prisma_migrations'",
  );
  if (rows.length === 0) return;
  await database().$executeRawUnsafe(`truncate table ${rows.map((r) => `"${r.tablename}"`).join(", ")} cascade`);
}
