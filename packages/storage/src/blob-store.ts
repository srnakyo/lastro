/** Binary storage for artifacts and original source files. Keys are relative, slash-separated paths. */
export interface BlobStore {
  put(key: string, bytes: Uint8Array, contentType: string): Promise<void>;
  /** The stored bytes, or null when nothing is stored under the key. */
  get(key: string): Promise<Uint8Array | null>;
  /** Removes the key; removing a missing key is not an error. */
  delete(key: string): Promise<void>;
}
