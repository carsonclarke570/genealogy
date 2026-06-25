/**
 * Batch backfill the coordinate gazetteer (`place`) from the archive.
 *
 * Scans every place string the archive references (person birth/death places,
 * stored-event places, residence labels) and geocodes the ones not already
 * resolved — once per unique label, via the env-gated Photon geocoder
 * (lib/places.ts `ensurePlaces`). Idempotent: re-running only touches places
 * still unresolved. A no-op for coordinates when `GEOCODER_URL` is unset (it just
 * registers the labels so they surface in the map's "Places to locate"; the
 * seeded starter coordinates still cover the demo family).
 *
 * Wired into boot (db/client.ts) after migrate → seed → reindex, and runnable
 * directly via `npm run db:geocode`.
 */
import { type NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./schema";
import { archivePlaceLabels, ensurePlaces } from "../lib/places";

type DB = NodePgDatabase<typeof schema>;

export async function geocodeArchive(
  db: DB,
): Promise<{ resolved: number; unresolved: number; skipped: number }> {
  const labels = await archivePlaceLabels(db);
  return ensurePlaces(db, labels);
}

// Allow running directly: `npm run db:geocode` (tsx src/db/geocode.ts). Opens its
// own connection so this stays a plain Node script (client.ts is server-side).
if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  void (async () => {
    const { Pool } = await import("pg");
    const { drizzle } = await import("drizzle-orm/node-postgres");

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle(pool, { schema });
    const { resolved, unresolved, skipped } = await geocodeArchive(db);
    console.log(
      `Gazetteer backfill: ${resolved} resolved, ${unresolved} unresolved, ${skipped} already cached.`,
    );
    await pool.end();
  })();
}
