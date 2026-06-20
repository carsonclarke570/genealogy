/**
 * SQLite connection + Drizzle client (server-only).
 *
 * The database file lives under DATA_DIR — a Railway persistent volume in prod
 * (see CLAUDE.md "Deployment"), or ./data locally. Pending migrations are
 * applied on first connection so the schema is always current; the first boot
 * of an empty database is also auto-seeded with the Whitfield family so the app
 * is never staring at a blank tree. Both steps are idempotent.
 */
import "server-only";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "./schema";
import { seed } from "./seed";

export type DB = BetterSQLite3Database<typeof schema>;

const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), "data");
const MIGRATIONS_DIR = path.join(process.cwd(), "src", "db", "migrations");

declare global {
  // Reuse one connection across dev hot-reloads / module re-evaluation.
  // eslint-disable-next-line no-var
  var __familyDb: DB | undefined;
}

function create(): DB {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  const sqlite = new Database(path.join(DATA_DIR, "family.db"));
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: MIGRATIONS_DIR });
  seed(db); // no-ops once the family table is populated
  return db;
}

export const db: DB = globalThis.__familyDb ?? create();
if (process.env.NODE_ENV !== "production") globalThis.__familyDb = db;
