/**
 * Media validation — the boundary rules for an upload. Pure and unit-tested
 * (media-validation.test.ts), so the upload route stays a thin orchestrator.
 *
 * Two layers:
 *  - `mediaMetaSchema` (Zod) validates the form fields (title/type/year/…).
 *  - `sniffMime` validates the *bytes*: we never trust the client-declared
 *    Content-Type. The leading "magic" bytes decide the real type, and only an
 *    allow-listed image/PDF passes. SVG and HTML are deliberately excluded — they
 *    can carry script and would be an XSS vector when served same-origin.
 */
import { z } from "zod";
import { provStatuses } from "./prov";

/** Hard ceiling on an uploaded file. */
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25 MB

/** The media `type` enum — must match the `media.type` column in db/schema.ts. */
export const MEDIA_TYPES = ["photo", "certificate", "article", "obituary", "other"] as const;
export type MediaType = (typeof MEDIA_TYPES)[number];

/** MIME types we accept (and will store + serve inline). */
export const ALLOWED_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
] as const;
export type AllowedMime = (typeof ALLOWED_MIME)[number];

const optionalText = z
  .string()
  .trim()
  .transform((v) => (v.length ? v : null))
  .nullable()
  .catch(null);

const CURRENT_YEAR = 2026;

/** Metadata that rides alongside the file in the multipart upload. */
export const mediaMetaSchema = z.object({
  title: z.string().trim().min(1, "A title is required").max(200),
  type: z.enum(MEDIA_TYPES, { message: "Choose a document type" }),
  year: z
    .union([z.string(), z.number()])
    .transform((v) => {
      const n = typeof v === "number" ? v : parseInt(v, 10);
      return Number.isFinite(n) ? n : null;
    })
    .nullable()
    .refine((n) => n === null || (n >= 1500 && n <= CURRENT_YEAR + 1), {
      message: "Enter a year between 1500 and today",
    })
    .catch(null),
  description: optionalText,
  // How confident we are this item is authentic (unified provenance). Optional on
  // the wire so older upload callers (which omit it) still validate.
  prov: z.enum(provStatuses).catch("unverified"),
  personIds: z
    .array(z.string().min(1))
    .transform((ids) => [...new Set(ids)])
    .catch([]),
});

export type MediaMeta = z.infer<typeof mediaMetaSchema>;

/**
 * Inspect the leading bytes of `buf` and return the true MIME type, or null if
 * it isn't one of our allow-listed types. This is authoritative — a file renamed
 * `photo.jpg` that is actually HTML returns null and is rejected.
 */
export function sniffMime(buf: Uint8Array): AllowedMime | null {
  const b = buf;
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (
    b.length >= 8 &&
    b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
    b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a
  )
    return "image/png";
  if (b.length >= 6 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38 && (b[4] === 0x37 || b[4] === 0x39) && b[5] === 0x61)
    return "image/gif";
  // RIFF....WEBP
  if (
    b.length >= 12 &&
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50
  )
    return "image/webp";
  // %PDF-
  if (b.length >= 5 && b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46 && b[4] === 0x2d)
    return "application/pdf";
  return null;
}
