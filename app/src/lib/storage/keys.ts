/**
 * Object-key derivation — pure, unit-tested (keys.test.ts).
 *
 * A media object's key is `media/<id>/<sanitized-filename>` where `id` is the
 * server-generated UUID for the media row. The key *prefix* is therefore never
 * user-controlled, so path traversal is structurally impossible — the worst a
 * hostile filename can do is name the trailing label. `sanitizeFilename` still
 * scrubs separators, `..`, and control characters and clamps the length as
 * defense in depth (and so the label stays a sensible single path segment).
 */

const MAX_FILENAME_LEN = 120;

/**
 * Reduce an uploaded filename to a single safe path segment: strip directory
 * separators and traversal, drop control chars, collapse whitespace, clamp
 * length. Falls back to "file" when nothing usable remains. The extension is
 * preserved when present (it's just part of the cleaned string).
 */
export function sanitizeFilename(name: string): string {
  const base = name
    // Anything up to the last slash (forward or back) is a directory — drop it.
    .replace(/^.*[/\\]/, "")
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x1f\x7f]/g, "")
    // Keep a conservative, filesystem/URL-safe set; everything else → "-".
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    // No leading dots (".." / hidden files); collapse repeats.
    .replace(/^\.+/, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_FILENAME_LEN);
  return base.length > 0 ? base : "file";
}

/** The storage key for a media item's file. */
export function mediaKey(id: string, originalFilename: string): string {
  return `media/${id}/${sanitizeFilename(originalFilename)}`;
}
