import { database, type Prisma } from "@lastro/database";

export type Tx = Prisma.TransactionClient;

export const db = () => database();

/** Runs work in one transaction. Long writes (a run with thousands of results) pass a larger timeout. */
export function transaction<T>(work: (tx: Tx) => Promise<T>, options: { timeout?: number } = {}): Promise<T> {
  return db().$transaction(work, { timeout: options.timeout ?? 15_000, maxWait: 10_000 });
}
