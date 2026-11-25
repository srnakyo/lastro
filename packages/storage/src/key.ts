import { createHash } from "node:crypto";

/** Rejects keys that could escape the store: empty, absolute, with "..", backslashes or NUL bytes. */
export function assertKey(key: string): void {
  const unsafe =
    key === "" ||
    key.startsWith("/") ||
    /^[A-Za-z]:/.test(key) ||
    key.includes("\\") ||
    key.includes("\0") ||
    key.split("/").some((part) => part === ".." || part === "." || part === "");
  if (unsafe) throw new Error(`invalid storage key "${key}": use a relative path without "..", "." or empty parts`);
}

/** Content-addressed key: identical bytes always map to the same key, so they are stored once. */
export function contentKey(bytes: Uint8Array): string {
  return `sha256/${createHash("sha256").update(bytes).digest("hex")}`;
}
