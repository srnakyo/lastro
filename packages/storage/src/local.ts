import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve, sep } from "node:path";
import type { BlobStore } from "./blob-store";
import { assertKey } from "./key";

function isMissing(error: unknown): boolean {
  return (error as NodeJS.ErrnoException | null)?.code === "ENOENT";
}

/** Files on disk under dir. Writes go to a temporary file first, so a reader never sees half a blob. */
export function localStore(dir: string): BlobStore {
  const root = resolve(dir);
  const pathOf = (key: string) => {
    assertKey(key);
    const path = resolve(join(root, key));
    if (!path.startsWith(`${root}${sep}`)) throw new Error(`invalid storage key "${key}": outside the storage folder`);
    return path;
  };

  return {
    async put(key, bytes) {
      const path = pathOf(key);
      await mkdir(dirname(path), { recursive: true });
      const temporary = `${path}.${process.pid}.${crypto.randomUUID()}.tmp`;
      await writeFile(temporary, bytes);
      await rename(temporary, path);
    },

    async get(key) {
      try {
        return new Uint8Array(await readFile(pathOf(key)));
      } catch (error) {
        if (isMissing(error)) return null;
        throw error;
      }
    },

    async delete(key) {
      await rm(pathOf(key), { force: true });
    },
  };
}
