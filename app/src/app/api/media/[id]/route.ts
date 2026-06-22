/**
 * Media delete — `DELETE /api/media/[id]`.
 *
 * Auth-gated by middleware.ts. Removes the stored object (idempotent — a missing
 * object is fine), then the `media` row (the person_media links cascade away),
 * then best-effort drops the search-index doc.
 */
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { media as mediaTable } from "@/db/schema";
import { getStore } from "@/lib/storage";
import { removeDoc } from "@/lib/search/index-doc";

export const dynamic = "force-dynamic";

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
