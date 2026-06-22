/**
 * Object-storage abstraction — a thin, backend-agnostic interface over an
 * S3-compatible store. Uploaded media bytes live here, never on the (ephemeral)
 * app container disk. The concrete implementation (lib/storage/s3.ts) speaks the
 * S3 API, so the same code targets MinIO in local dev and a Railway managed
 * Bucket in production — only env vars differ (see lib/storage/s3.ts).
 *
 * Bytes are only ever read back through the authenticated serve route
 * (app/api/media/[id]/file), satisfying the CLAUDE.md mandate that uploaded
 * files never sit on a public/static path.
 */
import type { Readable } from "node:stream";

/** A byte range request (inclusive bounds), as parsed from an HTTP `Range` header. */
export interface ByteRange {
  start: number;
  /** Inclusive end offset. */
  end: number;
}

/** A readable object plus the metadata the serve route needs to set headers. */
export interface ObjectStream {
  stream: Readable;
  /** Total size of the full object in bytes (not the range length). */
  size: number;
  contentType: string;
}

/** Object metadata without fetching the body. */
export interface ObjectStat {
  size: number;
  contentType: string;
}

/**
 * The storage contract. Keys are opaque, "/"-delimited paths (see
 * lib/storage/keys.ts); callers never pass user input as a key prefix.
 */
export interface ObjectStore {
  /** Store `body` under `key`. Overwrites any existing object at that key. */
  put(key: string, body: Buffer, opts: { contentType: string; size: number }): Promise<void>;
  /** Open a read stream for `key`, optionally a byte range (for HTTP Range). */
  getStream(key: string, range?: ByteRange): Promise<ObjectStream>;
  /** Object metadata, or null if the object does not exist. */
  stat(key: string): Promise<ObjectStat | null>;
  /** Remove `key`. A missing object is not an error (idempotent). */
  delete(key: string): Promise<void>;
}
