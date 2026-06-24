/**
 * Media upload — `POST /api/media` (multipart/form-data).
 *
 * A route handler, not a server action: server actions cap request bodies near
 * 1 MB, and photos/PDFs need up to MAX_UPLOAD_BYTES (25 MB). Auth is already
 * enforced by middleware.ts (the matcher gates everything but login/health/
 * static), so this handler assumes an authenticated caller.
 *
 * Flow: parse form → size + magic-byte checks (never trust the client MIME) →
 * Zod-validate metadata → put the object → insert the `media` row + person_media
 * links → best-effort search index → revalidate. Put-then-insert by design: a
 * later failure leaves a harmless orphan object, never a row with a broken image.
 */
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import { person, media as mediaTable, personMedia } from "@/db/schema";
import { getStore, mediaKey } from "@/lib/storage";
import { indexMedia } from "@/lib/search/index-doc";
import { mediaMetaSchema, sniffMime, MAX_UPLOAD_BYTES } from "@/lib/media-validation";
import { syncCensusDerived } from "@/lib/census";

export const dynamic = "force-dynamic";

function bad(errors: Record<string, string>, status = 400) {
  return NextResponse.json({ ok: false, errors }, { status });
}

export async function POST(req: Request): Promise<Response> {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return bad({ form: "Could not read the upload." });
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return bad({ file: "Choose a file to upload." });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return bad({ file: `File is too large (max ${Math.floor(MAX_UPLOAD_BYTES / (1024 * 1024))} MB).` });
  }

  // Sniff the real type from the bytes — the declared Content-Type is ignored.
  const buffer = Buffer.from(await file.arrayBuffer());
  const mimeType = sniffMime(buffer);
  if (!mimeType) {
    return bad({ file: "Unsupported file type. Upload a JPEG, PNG, WebP, GIF, or PDF." });
  }

  // personIds + location arrive as JSON strings; tolerate absence/garbage.
  const parseJsonField = (name: string): unknown => {
    const raw = form.get(name);
    if (typeof raw === "string" && raw.length) {
      try {
        return JSON.parse(raw);
      } catch {
        return undefined;
      }
    }
    return undefined;
  };
  const personIds = parseJsonField("personIds") ?? [];
  const location = parseJsonField("location") ?? null;

  const parsed = mediaMetaSchema.safeParse({
    title: form.get("title") ?? "",
    type: form.get("type") ?? "",
    year: form.get("year") ?? "",
    description: form.get("description") ?? "",
    prov: form.get("prov") ?? undefined,
    personIds,
    location,
  });
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      if (!errors[key]) errors[key] = issue.message;
    }
    return bad(errors);
  }
  const meta = parsed.data;

  const id = randomUUID();
  const originalFilename = file.name || "upload";
  const key = mediaKey(id, originalFilename);

  try {
    const db = await getDb();

    // Keep only person ids that actually exist (the picker offers real people,
    // but validate at the boundary anyway — cf. persistRelationships in actions.ts).
    let validPeople: string[] = [];
    if (meta.personIds.length > 0) {
      const rows = await db
        .select({ id: person.id })
        .from(person)
        .where(inArray(person.id, meta.personIds));
      validPeople = rows.map((r) => r.id);
    }

    await getStore().put(key, buffer, { contentType: mimeType, size: buffer.length });

    // Row + links + any census-derived records are one atomic unit: a Census that
    // can't seed its residence/event must not leave a half-built archive.
    await db.transaction(async (tx) => {
      await tx.insert(mediaTable).values({
        id,
        type: meta.type,
        title: meta.title,
        year: meta.year,
        filePath: key,
        mimeType,
        originalFilename,
        description: meta.description,
        prov: meta.prov,
      });

      if (validPeople.length > 0) {
        await tx.insert(personMedia).values(validPeople.map((personId) => ({ personId, mediaId: id })));
      }

      // A Census auto-generates a residence + event for the household it records.
      // A fresh upload has no prior derived rows, so only the census path matters.
      if (meta.type === "census") {
        await syncCensusDerived(tx, {
          mediaId: id,
          type: meta.type,
          year: meta.year,
          personIds: validPeople,
          location: meta.location,
          prov: meta.prov,
        });
      }
    });

    // Best-effort: index for search. A failure here must never fail the upload —
    // the boot/`db:reindex` backfill reconciles any missed rows.
    try {
      await indexMedia(db, id);
    } catch (err) {
      console.error("Failed to index new media for search:", err);
    }

    revalidatePath("/");
    return NextResponse.json({ ok: true, id });
  } catch (err) {
    console.error("Media upload failed:", err);
    return NextResponse.json({ ok: false, errors: { form: "Upload failed. Please try again." } }, { status: 500 });
  }
}
