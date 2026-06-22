/**
 * Media serve — `GET /api/media/[id]/file`.
 *
 * The ONLY way uploaded bytes leave storage. Auth-gated by middleware.ts (the
 * matcher excludes only login/health/static), so an unauthenticated request is
 * redirected to /login before reaching here — uploaded files are never on a
 * public path (CLAUDE.md mandate).
 *
 * Streams the object from the store with the stored MIME type. Supports HTTP
 * Range (PDF/image seeking). `?download=1` flips Content-Disposition to an
 * attachment for the detail dialog's Download button. Hardened against any
 * residual served-byte XSS with `nosniff` + a locked-down CSP (SVG/HTML are
 * already rejected at upload, so this is belt-and-braces).
 */
import { Readable } from "node:stream";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { media as mediaTable } from "@/db/schema";
import { getStore, ObjectNotFoundError } from "@/lib/storage";

export const dynamic = "force-dynamic";

/** Parse a single-range `bytes=start-end` header against a known size. */
function parseRange(header: string | null, size: number): { start: number; end: number } | null {
  if (!header) return null;
  const m = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!m) return null;
  const [, rawStart, rawEnd] = m;
  let start: number;
  let end: number;
  if (rawStart === "") {
    // Suffix range: last N bytes.
    const suffix = parseInt(rawEnd, 10);
    if (!Number.isFinite(suffix) || suffix === 0) return null;
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = parseInt(rawStart, 10);
    end = rawEnd === "" ? size - 1 : parseInt(rawEnd, 10);
  }
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= size) return null;
  return { start, end: Math.min(end, size - 1) };
}

function contentDisposition(download: boolean, filename: string | null): string {
  const type = download ? "attachment" : "inline";
  if (!filename) return type;
  // RFC 5987: an ASCII fallback plus a UTF-8 encoded form.
  const ascii = filename.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  return `${type}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

export async function GET(
  req: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  const db = await getDb();
  const [row] = await db.select().from(mediaTable).where(eq(mediaTable.id, params.id));
  if (!row || !row.filePath) {
    return new Response("Not found", { status: 404 });
  }

  const download = new URL(req.url).searchParams.get("download") === "1";

  try {
    const store = getStore();
    const stat = await store.stat(row.filePath);
    if (!stat) return new Response("Not found", { status: 404 });

    const range = parseRange(req.headers.get("range"), stat.size);
    // A Range header that's present but unsatisfiable → 416.
    if (req.headers.get("range") && !range) {
      return new Response("Range not satisfiable", {
        status: 416,
        headers: { "Content-Range": `bytes */${stat.size}`, "Accept-Ranges": "bytes" },
      });
    }

    const { stream } = await store.getStream(row.filePath, range ?? undefined);
    const length = range ? range.end - range.start + 1 : stat.size;

    const headers = new Headers({
      "Content-Type": row.mimeType ?? stat.contentType,
      "Content-Length": String(length),
      "Content-Disposition": contentDisposition(download, row.originalFilename),
      "Accept-Ranges": "bytes",
      // Object bytes for an id never change (a re-upload would be a new id), and
      // the response is per-session private because the route is auth-gated.
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    });
    if (range) {
      headers.set("Content-Range", `bytes ${range.start}-${range.end}/${stat.size}`);
    }

    // Node Readable → Web ReadableStream for the Response body.
    const body = Readable.toWeb(stream) as unknown as ReadableStream;
    return new Response(body, { status: range ? 206 : 200, headers });
  } catch (err) {
    if (err instanceof ObjectNotFoundError) return new Response("Not found", { status: 404 });
    console.error("Media serve failed:", err);
    return new Response("Internal error", { status: 500 });
  }
}
