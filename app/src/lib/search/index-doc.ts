/**
 * Search indexing pipeline (server-only).
 *
 * Keeps `search_doc` in sync with the source-of-truth tables: builds the
 * searchable text for a person or media item, embeds it with the self-hosted
 * model (when configured), and upserts the row. Indexing is best-effort — the
 * write path and boot reindex wrap these in try/catch so a search-index failure
 * never blocks a real mutation or app boot (lib/queries stays the truth).
 *
 * The content builders are pure and work off raw DB rows (the server has rows,
 * not the client-facing `Person` shape), so they're easy to test and reuse from
 * the backfill script (db/reindex.ts).
 *
 * Not marked `server-only`: the standalone `npm run db:reindex` script (tsx,
 * outside Next) imports this, and the server-only guard throws outside the React
 * Server runtime. It is still a server module — only server code imports it.
 */
import { eq, sql } from "drizzle-orm";
import type { DB } from "@/db/client";
import { person, media, personMedia, searchDoc } from "@/db/schema";
import type { PersonRow, MediaRow } from "@/db/schema";
import { getEmbedder } from "./embed";

type Kind = "person" | "media";

const docId = (kind: Kind, refId: string) => `${kind}:${refId}`;

/** Free-text corpus for a person: names, places, years, notes. */
export function personContent(p: PersonRow): string {
  return [
    `${p.given} ${p.surname}`,
    p.maiden ? `née ${p.maiden}` : null,
    p.bornPlace ? `born in ${p.bornPlace}` : null,
    p.bornYear ? `born ${p.bornYear}` : null,
    p.diedPlace ? `died in ${p.diedPlace}` : null,
    p.diedYear ? `died ${p.diedYear}` : null,
    p.notes,
  ]
    .filter(Boolean)
    .join(". ");
}

/** Place text denormalised onto search_doc — drives the Places scope. */
export function personPlace(p: PersonRow): string | null {
  const places = [p.bornPlace, p.diedPlace].filter(Boolean);
  return places.length ? places.join(" · ") : null;
}

/** Free-text corpus for a media item: title, type, year, linked people. */
export function mediaContent(m: MediaRow, linkedNames: string[]): string {
  return [m.title, m.type, m.year ? String(m.year) : null, ...linkedNames, m.description]
    .filter(Boolean)
    .join(". ");
}

/**
 * Embed `content` if an embedder is configured, else null (lexical-only row).
 * A transient embedding-server error degrades to null (a lexical row is still
 * written and searchable) rather than failing the whole index op — `db:reindex`
 * can backfill the vector later.
 */
async function embedContent(content: string): Promise<number[] | null> {
  const embedder = getEmbedder();
  if (!embedder) return null;
  try {
    const [vector] = await embedder.embed([content]);
    return vector ?? null;
  } catch (err) {
    console.error("Embedding failed; indexing lexical-only:", err);
    return null;
  }
}

/** Upsert one search_doc row by its `${kind}:${refId}` id. */
export async function upsertDoc(
  db: DB,
  kind: Kind,
  refId: string,
  content: string,
  place: string | null,
  embedding: number[] | null,
): Promise<void> {
  const id = docId(kind, refId);
  await db
    .insert(searchDoc)
    .values({ id, kind, refId, content, place, embedding })
    .onConflictDoUpdate({
      target: searchDoc.id,
      set: { content, place, embedding, updatedAt: sql`now()` },
    });
}

/** (Re)index a single person. No-op if the person no longer exists. */
export async function indexPerson(db: DB, personId: string): Promise<void> {
  const [row] = await db.select().from(person).where(eq(person.id, personId));
  if (!row) return;
  const content = personContent(row);
  await upsertDoc(db, "person", row.id, content, personPlace(row), await embedContent(content));
}

/** (Re)index a single media item with its linked people's names. */
export async function indexMedia(db: DB, mediaId: string): Promise<void> {
  const [row] = await db.select().from(media).where(eq(media.id, mediaId));
  if (!row) return;
  const linked = await db
    .select({ given: person.given, surname: person.surname })
    .from(personMedia)
    .innerJoin(person, eq(person.id, personMedia.personId))
    .where(eq(personMedia.mediaId, mediaId));
  const names = linked.map((p) => `${p.given} ${p.surname}`);
  const content = mediaContent(row, names);
  await upsertDoc(db, "media", row.id, content, null, await embedContent(content));
}

/** Drop a search_doc row (call when the source entity is deleted). */
export async function removeDoc(db: DB, kind: Kind, refId: string): Promise<void> {
  await db.delete(searchDoc).where(eq(searchDoc.id, docId(kind, refId)));
}
