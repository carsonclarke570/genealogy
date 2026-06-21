/**
 * Postgres connection + Drizzle client (server-only).
 *
 * The database is a managed Railway Postgres instance, addressed by DATABASE_URL
 * (a Railway reference variable in prod; a local Postgres in dev — see CLAUDE.md
 * "Deployment"). Pending migrations are applied once per process on first use so
 * the schema is always current. Outside production, an empty database is also
 * auto-seeded with a demo family so dev is never staring at a blank tree;
 * production stays empty so the real family is entered by hand. Both steps are
 * idempotent.
 *
 * `pg`'s Pool is constructed synchronously but queries are async, so the client
 * is exposed as a memoized `getDb(): Promise<DB>` rather than a bare value — the
 * promise is cached, so migrate + seed run exactly once and concurrent first
 * callers share a single pool.
 */
import "server-only";
import path from "node:path";
import { Pool } from "pg";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { count } from "drizzle-orm";
import * as schema from "./schema";
import { seed } from "./seed";
import { reindex } from "./reindex";

export type DB = NodePgDatabase<typeof schema>;

const MIGRATIONS_DIR = path.join(process.cwd(), "src", "db", "migrations");

declare global {
  // Reuse one init across dev hot-reloads / module re-evaluation.
  // eslint-disable-next-line no-var
  var __familyDbPromise: Promise<DB> | undefined;
}

async function init(): Promise<DB> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  const pool = new Pool({ connectionString });
  const db = drizzle(pool, { schema });
  await migrate(db, { migrationsFolder: MIGRATIONS_DIR });
  // Auto-seed demo data outside production only; prod boots empty (see header).
  // Still idempotent — no-ops once the family table is populated.
  if (process.env.NODE_ENV !== "production") await seed(db);
  await reindexIfStale(db);
  return db;
}

/**
 * Backfill the search index for any people/media missing a search_doc row.
 * Best-effort: an embedding-server or extension error must never block boot
 * (search degrades to whatever rows exist; `npm run db:reindex` can reconcile).
 * Future media-create / person-edit / delete paths should call
 * indexMedia/indexPerson/removeDoc directly, the way createPerson does.
 */
async function reindexIfStale(db: DB): Promise<void> {
  try {
    const [{ n: people }] = await db.select({ n: count() }).from(schema.person);
    const [{ n: docsMedia }] = await db.select({ n: count() }).from(schema.media);
    const [{ n: indexed }] = await db.select({ n: count() }).from(schema.searchDoc);
    if (indexed === people + docsMedia) return; // already in sync — skip
    await reindex(db);
  } catch (err) {
    console.error("Search reindex on boot failed (continuing):", err);
  }
}

export function getDb(): Promise<DB> {
  return (globalThis.__familyDbPromise ??= init());
}
