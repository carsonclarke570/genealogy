/**
 * Storage entrypoint — `getStore()` returns the process-wide ObjectStore.
 *
 * Today that's the S3-compatible (MinIO / Railway Bucket) implementation; this
 * indirection is the single seam to swap backends without touching callers.
 */
import "server-only";
import type { ObjectStore } from "./types";
import { getS3Store } from "./s3";

export type { ObjectStore, ObjectStream, ObjectStat, ByteRange } from "./types";
export { ObjectNotFoundError } from "./s3";
export { mediaKey, sanitizeFilename } from "./keys";

export function getStore(): ObjectStore {
  return getS3Store();
}
