import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { BlobStore } from "./blob-store";
import { assertKey } from "./key";

export interface S3StoreOptions {
  /** Omit for AWS itself; set it for Cloudflare R2, MinIO and other S3-compatible services. */
  endpoint?: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
}

function isMissing(error: unknown): boolean {
  const failure = error as { name?: string; $metadata?: { httpStatusCode?: number } } | null;
  return failure?.name === "NoSuchKey" || failure?.name === "NotFound" || failure?.$metadata?.httpStatusCode === 404;
}

/** S3-compatible object storage. Path-style addressing keeps it working with MinIO and R2. */
export function s3Store(options: S3StoreOptions): BlobStore {
  const client = new S3Client({
    region: options.region,
    ...(options.endpoint ? { endpoint: options.endpoint } : {}),
    forcePathStyle: true,
    credentials: { accessKeyId: options.accessKeyId, secretAccessKey: options.secretAccessKey },
  });
  const Bucket = options.bucket;

  return {
    async put(key, bytes, contentType) {
      assertKey(key);
      await client.send(new PutObjectCommand({ Bucket, Key: key, Body: bytes, ContentType: contentType, ContentLength: bytes.byteLength }));
    },

    async get(key) {
      assertKey(key);
      try {
        const object = await client.send(new GetObjectCommand({ Bucket, Key: key }));
        return object.Body ? await object.Body.transformToByteArray() : new Uint8Array();
      } catch (error) {
        if (isMissing(error)) return null;
        throw error;
      }
    },

    async delete(key) {
      assertKey(key);
      await client.send(new DeleteObjectCommand({ Bucket, Key: key }));
    },
  };
}
