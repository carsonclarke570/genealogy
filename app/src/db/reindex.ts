/**
 * Backfill / rebuild the search index (search_doc) from the source tables.
 *
 * `reindex(db)` is idempotent (upserts by id) and batch-embeds for throughput.
 * It runs on boot for missing rows (db/client.ts) and can be invoked directly
 * via `npm run db:reindex` after changing the embedding model or content shape.
 * In lexical-only mode (no embedding server) it still writes every row, with
 * null embeddings, so full-text search works.
 *
 * Not marked `server-only` so it can run as a plain `tsx` script (db:reindex);
 * the server-only guard throws outside the React Server runtime.
 */
import { eq } from "drizzle-orm";
import type { DB } from "./client";
import * as schema from "./schema";
import { mediaContent, personContent, personPlace, upsertDoc } from "@/lib/search/index-doc";
import { getEmbedder } from "@/lib/search/embed";

interface PendingDoc {
  kind: "person" | "media";
  refId: string;
  content: string;
  place: string | null;
}

const EMBED_BATCH = 64;

export async function reindex(db: DB): Promise<{ indexed: number; mode: "vector" | "lexical" }> {
  const docs: PendingDoc[] = [];

  for (const p of await db.select().from(schema.person)) {
    docs.push({ kind: "person", refId: p.id, content: personContent(p), place: personPlace(p) });
  }

  const links = await db
    .select({ mediaId: schema.personMedia.mediaId, given: schema.person.given, surname: schema.person.surname })
    .from(schema.personMedia)
    .innerJoin(schema.person, eq(schema.person.id, schema.personMedia.personId));
  const namesByMedia = new Map<string, string[]>();
  for (const l of links) {
    const arr = namesByMedia.get(l.mediaId) ?? namesByMedia.set(l.mediaId, []).get(l.mediaId)!;
    arr.push(`${l.given} ${l.surname}`);
  }
  for (const m of await db.select().from(schema.media)) {
    docs.push({ kind: "media", refId: m.id, content: mediaContent(m, namesByMedia.get(m.id) ?? []), place: null });
  }

  const embedder = getEmbedder();
  const embeddings: (number[] | null)[] = new Array(docs.length).fill(null);
  let embedded = false;
  if (embedder) {
    for (let i = 0; i < docs.length; i += EMBED_BATCH) {
      const batch = docs.slice(i, i + EMBED_BATCH);
      try {
        const vectors = await embedder.embed(batch.map((d) => d.content));
        vectors.forEach((v, j) => (embeddings[i + j] = v));
        embedded = true;
      } catch (err) {
        // Leave this batch's rows lexical-only rather than aborting the rebuild.
        console.error(`Embedding batch at ${i} failed; those rows stay lexical-only:`, err);
      }
    }
  }

  for (let i = 0; i < docs.length; i++) {
    const d = docs[i];
    await upsertDoc(db, d.kind, d.refId, d.content, d.place, embeddings[i]);
  }

  return { indexed: docs.length, mode: embedded ? "vector" : "lexical" };
}

// Allow running directly: `npm run db:reindex` (tsx src/db/reindex.ts). Opens its
// own connection so it runs as a plain Node script (client.ts is server-only).
if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  void (async () => {
    const path = (await import("node:path")).default;
    const { Pool } = await import("pg");
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const { migrate } = await import("drizzle-orm/node-postgres/migrator");

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle(pool, { schema });
    await migrate(db, { migrationsFolder: path.join(process.cwd(), "src", "db", "migrations") });

    const { indexed, mode } = await reindex(db as unknown as DB);
    console.log(`Reindexed ${indexed} documents (${mode} mode).`);
    await pool.end();
  })();
}
