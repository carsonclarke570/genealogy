/**
 * Media upload — `POST /api/media` (multipart/form-data).
 *
 * A route handler, not a server action: server actions cap request bodies near
 * 1 MB, and photos/PDFs need up to MAX_UPLOAD_BYTES (25 MB). Auth is already
 * enforced by middleware.ts, so this handler assumes an authenticated caller.
 *
 * Two modes, sharing one validate → store → transaction pipeline:
 *   - plain upload: file + metadata + `personIds` (+ census/grave extras).
 *   - staged upload: additionally an `updates` JSON field — the wizard's batch of
 *     incremental record changes. When present we create any new people, link the
 *     document to every subject, and apply each subject's changes (citing the doc
 *     as a verified source) — all inside the same transaction, so the whole upload
 *     is atomic. The linked people then drive census derivation + search indexing.
 *
 * Put-then-insert by design: the object is stored before the row, so a failure
 * leaves a harmless orphan object, never a row with a broken image. If the
 * transaction itself fails, we delete that just-stored object to keep storage clean.
 */
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import { person, media as mediaTable, personMedia } from "@/db/schema";
import { getStore, mediaKey } from "@/lib/storage";
import { indexMedia, indexPerson } from "@/lib/search/index-doc";
import { mediaMetaSchema, sniffMime, MAX_UPLOAD_BYTES } from "@/lib/media-validation";
import { syncCensusDerived } from "@/lib/census";
import { batchUpdatesSchema } from "@/lib/staged-upload/batch-schema";
import { applyBatch } from "@/lib/staged-upload/apply";
import type { BatchUpdates } from "@/lib/staged-upload/payload";

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

  // JSON fields arrive as strings; tolerate absence/garbage.
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
  const personDates = parseJsonField("personDates") ?? {};

  const parsed = mediaMetaSchema.safeParse({
    title: form.get("title") ?? "",
    type: form.get("type") ?? "",
    year: form.get("year") ?? "",
    description: form.get("description") ?? "",
    prov: form.get("prov") ?? undefined,
    personIds,
    location,
    personDates,
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

  // Staged-upload batch of record changes (optional). Malformed JSON is rejected
  // rather than silently dropped — the wizard always sends a valid shape.
  let batch: BatchUpdates | null = null;
  const rawUpdates = parseJsonField("updates");
  if (rawUpdates !== undefined) {
    const parsedBatch = batchUpdatesSchema.safeParse(rawUpdates);
    if (!parsedBatch.success) return bad({ form: "The record changes couldn't be read." });
    batch = parsedBatch.data as BatchUpdates;
  }

  const id = randomUUID();
  const originalFilename = file.name || "upload";
  const key = mediaKey(id, originalFilename);
  let stored = false;

  try {
    const db = await getDb();

    // Keep only person ids that actually exist (the picker offers real people,
    // but validate at the boundary anyway).
    let validPeople: string[] = [];
    if (meta.personIds.length > 0) {
      const rows = await db.select({ id: person.id }).from(person).where(inArray(person.id, meta.personIds));
      validPeople = rows.map((r) => r.id);
    }

    await getStore().put(key, buffer, { contentType: mimeType, size: buffer.length });
    stored = true;

    // Row + links + new people + record changes + census derivation are one atomic
    // unit: a multi-person upload that can't finish must not leave a half-built archive.
    const linkedIds = await db.transaction(async (tx) => {
      await tx.insert(mediaTable).values({
        id,
        type: meta.type,
        title: meta.title,
        year: meta.year,
        filePath: key,
        mimeType,
        originalFilename,
        description: meta.description,
        // A Grave stores its burial place on the row; other types derive/ignore it.
        location: meta.type === "grave" && meta.location ? JSON.stringify(meta.location) : null,
        prov: meta.prov,
      });

      // The staged wizard creates new people + applies each subject's changes, and
      // tells us every subject (existing + new) so the document links to them all.
      const subjectIds = batch ? (await applyBatch(tx, id, batch)).subjectIds : [];
      const peopleToLink = [...new Set([...validPeople, ...subjectIds])];

      if (peopleToLink.length > 0) {
        await tx.insert(personMedia).values(
          peopleToLink.map((personId) => ({
            personId,
            mediaId: id,
            // Per-person grave date (the headstone's date for this person); null otherwise.
            date: meta.type === "grave" ? meta.personDates?.[personId] ?? null : null,
          })),
        );
      }

      // A Census auto-generates a residence + event for the household it records.
      if (meta.type === "census") {
        await syncCensusDerived(tx, {
          mediaId: id,
          type: meta.type,
          year: meta.year,
          personIds: peopleToLink,
          location: meta.location,
          prov: meta.prov,
        });
      }

      return peopleToLink;
    });

    // Best-effort: index the document + every affected person for search. A failure
    // here must never fail the upload — the boot/`db:reindex` backfill reconciles.
    try {
      await indexMedia(db, id);
      for (const personId of linkedIds) await indexPerson(db, personId);
    } catch (err) {
      console.error("Failed to index upload for search:", err);
    }

    revalidatePath("/");
    return NextResponse.json({ ok: true, id });
  } catch (err) {
    console.error("Media upload failed:", err);
    // The transaction rolled back; remove the orphaned object so storage stays clean.
    if (stored) {
      try {
        await getStore().delete(key);
      } catch (cleanupErr) {
        console.error("Failed to remove orphaned upload object:", cleanupErr);
      }
    }
    return NextResponse.json({ ok: false, errors: { form: "Upload failed. Please try again." } }, { status: 500 });
  }
}
