import { database, type Prisma } from "@lastro/database";

export type Tx = Prisma.TransactionClient;

export const db = () => database();

/** Runs work in one transaction. */
export function transaction<T>(work: (tx: Tx) => Promise<T>): Promise<T> {
  return db().$transaction(work);
}
