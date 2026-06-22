/**
 * S3-compatible object store, backed by the `minio` client.
 *
 * The `minio` client speaks the plain S3 API, so this one implementation targets
 * both local dev (a MinIO container, see docker-compose.yml) and production (a
 * Railway managed Bucket) — only the STORAGE_* env vars change. We use `minio`
 * rather than `@aws-sdk/client-s3` deliberately: it's a single small dependency,
 * returns Node `Readable` streams straight from `getObject`/`getPartialObject`
 * (clean to pipe into a Web `Response`), and keeps the project free of the
 * AWS-branded SDK tree.
 *
 * Config is read from the environment at point of use (matching the repo's
 * no-central-config convention, cf. lib/search/config.ts):
 *   STORAGE_ENDPOINT     host only, e.g. "localhost" or "bucket.railway.internal"
 *   STORAGE_PORT         default 9000
 *   STORAGE_USE_SSL      "true" | "false"   (default false)
 *   STORAGE_ACCESS_KEY   required
 *   STORAGE_SECRET_KEY   required
 *   STORAGE_BUCKET       default "family-media"
 *   STORAGE_REGION       default "us-east-1"
 */
import "server-only";
import { Client } from "minio";
import type { ObjectStore, ObjectStream, ObjectStat, ByteRange } from "./types";

function env(name: string): string | undefined {
  const v = process.env[name];
  return v && v.length > 0 ? v : undefined;
}

export function storageBucket(): string {
  return env("STORAGE_BUCKET") ?? "family-media";
}

let clientPromise: Client | null = null;

function getClient(): Client {
  if (clientPromise) return clientPromise;
  const endPoint = env("STORAGE_ENDPOINT");
  const accessKey = env("STORAGE_ACCESS_KEY");
  const secretKey = env("STORAGE_SECRET_KEY");
  if (!endPoint) throw new Error("STORAGE_ENDPOINT is not set");
  if (!accessKey || !secretKey) throw new Error("STORAGE_ACCESS_KEY / STORAGE_SECRET_KEY are not set");

  clientPromise = new Client({
    endPoint,
    port: Number(env("STORAGE_PORT") ?? 9000),
    useSSL: env("STORAGE_USE_SSL") === "true",
    accessKey,
    secretKey,
    region: env("STORAGE_REGION") ?? "us-east-1",
  });
  return clientPromise;
}

// Create the bucket on first use if it's missing — mirrors getDb()'s
// migrate-on-boot. Memoized so the existence check runs at most once per process.
let bucketReady: Promise<void> | null = null;

function ensureBucket(): Promise<void> {
  if (bucketReady) return bucketReady;
  bucketReady = (async () => {
    const client = getClient();
    const bucket = storageBucket();
    const exists = await client.bucketExists(bucket).catch(() => false);
    if (!exists) {
      await client.makeBucket(bucket, env("STORAGE_REGION") ?? "us-east-1");
    }
  })().catch((err) => {
    // Don't cache a failed attempt — let the next call retry.
    bucketReady = null;
    throw err;
  });
  return bucketReady;
}

class S3ObjectStore implements ObjectStore {
  async put(key: string, body: Buffer, opts: { contentType: string; size: number }): Promise<void> {
    await ensureBucket();
    await getClient().putObject(storageBucket(), key, body, opts.size, {
      "Content-Type": opts.contentType,
    });
  }

  async stat(key: string): Promise<ObjectStat | null> {
    try {
      const s = await getClient().statObject(storageBucket(), key);
      return {
        size: s.size,
        contentType: s.metaData?.["content-type"] ?? "application/octet-stream",
      };
    } catch (err) {
      if (isNotFound(err)) return null;
      throw err;
    }
  }

  async getStream(key: string, range?: ByteRange): Promise<ObjectStream> {
    await ensureBucket();
    const stat = await this.stat(key);
    if (!stat) throw new ObjectNotFoundError(key);
    const client = getClient();
    const bucket = storageBucket();
    const stream = range
      ? await client.getPartialObject(bucket, key, range.start, range.end - range.start + 1)
      : await client.getObject(bucket, key);
    return { stream, size: stat.size, contentType: stat.contentType };
  }

  async delete(key: string): Promise<void> {
    try {
      await getClient().removeObject(storageBucket(), key);
    } catch (err) {
      if (isNotFound(err)) return; // idempotent
      throw err;
    }
  }
}

export class ObjectNotFoundError extends Error {
  constructor(key: string) {
    super(`Object not found: ${key}`);
    this.name = "ObjectNotFoundError";
  }
}

function isNotFound(err: unknown): boolean {
  const code = (err as { code?: string } | null)?.code;
  return code === "NoSuchKey" || code === "NotFound" || code === "NoSuchBucket";
}

let store: ObjectStore | null = null;

/** The process-wide object store. Single seam for swapping the backend later. */
export function getS3Store(): ObjectStore {
  return (store ??= new S3ObjectStore());
}
