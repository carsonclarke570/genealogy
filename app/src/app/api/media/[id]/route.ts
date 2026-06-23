/**
 * Media edit + delete — `PUT|DELETE /api/media/[id]`.
 *
 * Auth-gated by middleware.ts. PUT edits metadata (title/type/year/description)
 * and re-syncs the person_media links — the file itself is immutable (re-upload
 * for a new file). DELETE removes the stored object (idempotent — a missing
 * object is fine), then the `media` row (the person_media links cascade away),
 * then best-effort drops the search-index doc.
 */
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import { person, media as mediaTable, personMedia } from "@/db/schema";
import { getStore } from "@/lib/storage";
import { indexMedia, removeDoc } from "@/lib/search/index-doc";
import { mediaMetaSchema } from "@/lib/media-validation";

export const dynamic = "force-dynamic";

export async function PUT(
  req: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, errors: { form: "Could not read the request." } }, { status: 400 });
  }

  const parsed = mediaMetaSchema.safeParse(body);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      if (!errors[key]) errors[key] = issue.message;
    }
    return NextResponse.json({ ok: false, errors }, { status: 400 });
  }
  const meta = parsed.data;

  try {
    const db = await getDb();

    const updated = await db
      .update(mediaTable)
      .set({
        type: meta.type,
        title: meta.title,
        year: meta.year,
        description: meta.description,
        prov: meta.prov,
      })
      .where(eq(mediaTable.id, params.id))
      .returning({ id: mediaTable.id });
    if (updated.length === 0) {
      return NextResponse.json({ ok: false, errors: { form: "That media no longer exists." } }, { status: 404 });
    }

    // Re-sync the person links: keep only ids that exist, replace the set wholesale.
    let validPeople: string[] = [];
    if (meta.personIds.length > 0) {
      const rows = await db
        .select({ id: person.id })
        .from(person)
        .where(inArray(person.id, meta.personIds));
      validPeople = rows.map((r) => r.id);
    }
    await db.delete(personMedia).where(eq(personMedia.mediaId, params.id));
    if (validPeople.length > 0) {
      await db.insert(personMedia).values(validPeople.map((personId) => ({ personId, mediaId: params.id })));
    }

    // Best-effort: keep the search index in step with the new title/description.
    try {
      await indexMedia(db, params.id);
    } catch (err) {
      console.error("Failed to re-index edited media for search:", err);
    }

    revalidatePath("/");
    return NextResponse.json({ ok: true, id: params.id });
  } catch (err) {
    console.error("Media edit failed:", err);
    return NextResponse.json({ ok: false, errors: { form: "Save failed. Please try again." } }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  try {
    const db = await getDb();
    const [row] = await db.select().from(mediaTable).where(eq(mediaTable.id, params.id));
    if (!row) return NextResponse.json({ ok: false, errors: { form: "Not found." } }, { status: 404 });

    if (row.filePath) {
      await getStore().delete(row.filePath);
    }
    await db.delete(mediaTable).where(eq(mediaTable.id, params.id)); // cascades person_media

    try {
      await removeDoc(db, "media", params.id);
    } catch (err) {
      console.error("Failed to drop media from search index:", err);
    }

    revalidatePath("/");
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Media delete failed:", err);
    return NextResponse.json({ ok: false, errors: { form: "Delete failed. Please try again." } }, { status: 500 });
  }
}
