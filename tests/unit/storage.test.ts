import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { contentKey, localStore, storeFromEnv, type BlobStore } from "@lastro/storage";

let dir = "";
let store: BlobStore;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "lastro-storage-test-"));
  store = localStore(join(dir, "blobs"));
});
afterEach(() => rm(dir, { recursive: true, force: true }));

describe("localStore", () => {
  it("puts, gets and deletes bytes, creating folders on the way", async () => {
    const bytes = new TextEncoder().encode("hello");
    await store.put("a/b/c.txt", bytes, "text/plain");
    expect(await store.get("a/b/c.txt")).toEqual(bytes);
    await store.delete("a/b/c.txt");
    expect(await store.get("a/b/c.txt")).toBeNull();
    await store.delete("a/b/c.txt");
  });

  it("returns null for a key that was never stored", async () => {
    expect(await store.get("missing")).toBeNull();
  });

  it.each(["../escape", "a/../../escape", "/etc/passwd", "a\\..\\b", "", "a//b", "./a"])("refuses the key %p", async (key) => {
    await expect(store.put(key, new Uint8Array([1]), "application/octet-stream")).rejects.toThrow(/invalid storage key/);
    await expect(store.get(key)).rejects.toThrow(/invalid storage key/);
  });
});

describe("contentKey", () => {
  it("is stable for the same bytes and different for other bytes", () => {
    const a = contentKey(new TextEncoder().encode("same"));
    expect(a).toBe(contentKey(new TextEncoder().encode("same")));
    expect(a).toMatch(/^sha256\/[0-9a-f]{64}$/);
    expect(contentKey(new TextEncoder().encode("other"))).not.toBe(a);
  });
});

describe("storeFromEnv", () => {
  it("uses the local folder from LASTRO_STORAGE_DIR by default", async () => {
    const fromEnv = storeFromEnv({ LASTRO_STORAGE_DIR: join(dir, "env") });
    await fromEnv.put("k", new Uint8Array([7]), "application/octet-stream");
    expect(await localStore(join(dir, "env")).get("k")).toEqual(new Uint8Array([7]));
  });

  it("names the missing S3 settings without printing any value", () => {
    const failure = (() => {
      try {
        storeFromEnv({ LASTRO_STORAGE: "s3", LASTRO_S3_BUCKET: "bucket-value", LASTRO_S3_ACCESS_KEY_ID: "id-value" });
      } catch (error) {
        return (error as Error).message;
      }
      return "";
    })();
    expect(failure).toBe("LASTRO_STORAGE=s3 needs LASTRO_S3_SECRET_ACCESS_KEY");
  });

  it("builds an S3 store when every setting is there", () => {
    const env = { LASTRO_STORAGE: "s3", LASTRO_S3_ENDPOINT: "http://localhost:9000", LASTRO_S3_BUCKET: "b", LASTRO_S3_ACCESS_KEY_ID: "id", LASTRO_S3_SECRET_ACCESS_KEY: "secret" };
    expect(typeof storeFromEnv(env).put).toBe("function");
  });

  it("rejects an unknown driver", () => {
    expect(() => storeFromEnv({ LASTRO_STORAGE: "ftp" })).toThrow(/local" or "s3/);
  });
});
