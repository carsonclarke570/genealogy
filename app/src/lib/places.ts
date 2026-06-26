/**
 * Place resolver (server-only) — populate + maintain the `place` gazetteer.
 *
 * The coordinate cache is filled three ways, all funnelled through here:
 *   - **capture-at-entry** — when a person/event/residence is saved with a place
 *     the picker already geocoded, `capturePlace` stores its coordinate so the
 *     map can plot it with no extra geocode.
 *   - **batch backfill** — `ensurePlaces` (driven by `npm run db:geocode`) takes
 *     every place string in the archive and geocodes the ones still unresolved,
 *     once per unique label (Photon, env-gated; a no-op when `GEOCODER_URL` is
 *     unset — the seeded starter coordinates still cover the demo).
 *   - **manual pin-drop** — `setPlaceCoords` records a coordinate a curator
 *     placed by hand for a place the geocoder couldn't find.
 *
 * Everything keys on the normalised label (lib/place-key.ts), so identical places
 * share one coordinate row. Reads never block on population: lib/queries.ts just
 * reads whatever rows exist.
 *
 * NOTE: not marked `server-only` (like lib/geocode.ts) so the `db:geocode` CLI
 * can import it under plain Node. It is server-side logic regardless — only
 * actions.ts and the geocode script import it, never a client component.
 */
import { inArray } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "@/db/schema";
import type { LocationValue } from "@family-archive/ui";
import { geocode, geocoderConfigured } from "./geocode";
import { locationLabel } from "./locations";
import { normalizePlace, placeKeyId } from "./place-key";

type DB = NodePgDatabase<typeof schema>;
/** A drizzle db handle or a transaction handle — both expose the query builder, so
 *  capture-at-entry can run inside the staged-upload transaction. */
type DbOrTx = DB | Parameters<Parameters<DB["transaction"]>[0]>[0];
type PlaceSource = "geocoder" | "user" | "archive";

const clean = (v: string | null | undefined): string | null => {
  const t = (v ?? "").trim();
  return t.length ? t : null;
};

/** Coordinate + structured parts to write for a place (any field may be null). */
interface Coord {
  lat: number | null;
  lng: number | null;
  country?: string | null;
  region?: string | null;
  locality?: string | null;
  address?: string | null;
  placeId?: string | null;
}

/**
 * Upsert a *resolved* coordinate for `label` (overwrites any existing row — a
 * known coordinate, whatever its source, supersedes an earlier guess). No-op for
 * a blank label or a coordinate with no lat/lng (use {@link registerPlaceLabel}
 * to merely note an unlocated place).
 */
async function upsertResolved(db: DbOrTx, label: string, coord: Coord, source: PlaceSource): Promise<void> {
  const normalized = normalizePlace(label);
  if (!normalized || coord.lat == null || coord.lng == null) return;
  const row = {
    id: placeKeyId(normalized),
    normalized,
    label: label.trim(),
    country: clean(coord.country),
    region: clean(coord.region),
    locality: clean(coord.locality),
    address: clean(coord.address),
    lat: coord.lat,
    lng: coord.lng,
    placeId: clean(coord.placeId),
    source,
    status: "resolved" as const,
    geocodedAt: new Date(),
  };
  await db
    .insert(schema.place)
    .values(row)
    .onConflictDoUpdate({
      target: schema.place.normalized,
      set: {
        label: row.label,
        country: row.country,
        region: row.region,
        locality: row.locality,
        address: row.address,
        lat: row.lat,
        lng: row.lng,
        placeId: row.placeId,
        source: row.source,
        status: row.status,
        geocodedAt: row.geocodedAt,
        updatedAt: new Date(),
      },
    });
}

/** Note a place that exists in the archive but has no coordinate yet (insert-if-missing). */
async function registerPlaceLabel(db: DbOrTx, label: string): Promise<void> {
  const normalized = normalizePlace(label);
  if (!normalized) return;
  await db
    .insert(schema.place)
    .values({ id: placeKeyId(normalized), normalized, label: label.trim(), status: "unresolved" })
    .onConflictDoNothing({ target: schema.place.normalized });
}

/**
 * Capture-at-entry: store the coordinate a picker already collected for a place
 * being saved. When the value carries lat/lng it upserts a resolved row; with
 * only a label it registers the place as unresolved so the map (and the batch
 * geocoder) know it exists. Best-effort — never throws into the write path.
 */
export async function capturePlace(
  db: DbOrTx,
  value: LocationValue | null | undefined,
  source: PlaceSource = "archive",
): Promise<void> {
  if (!value) return;
  const label = locationLabel(value);
  if (!label) return;
  try {
    if (value.lat != null && value.lng != null) {
      await upsertResolved(
        db,
        label,
        {
          lat: value.lat,
          lng: value.lng,
          country: value.country,
          region: value.region,
          locality: value.locality,
          address: value.address,
          placeId: value.placeId,
        },
        source,
      );
    } else {
      await registerPlaceLabel(db, label);
    }
  } catch (err) {
    console.error("capturePlace failed (continuing):", err);
  }
}

/** Capture several places at once (skips blanks/dupes via the normalised key). */
export async function capturePlaces(
  db: DbOrTx,
  values: (LocationValue | null | undefined)[],
  source: PlaceSource = "archive",
): Promise<void> {
  const seen = new Set<string>();
  for (const v of values) {
    if (!v) continue;
    const key = normalizePlace(locationLabel(v));
    if (!key || seen.has(key)) continue;
    seen.add(key);
    await capturePlace(db, v, source);
  }
}

/** Record a coordinate a curator placed by hand for an otherwise-unlocated place. */
export async function setPlaceCoords(db: DbOrTx, label: string, lat: number, lng: number): Promise<void> {
  await upsertResolved(db, label, { lat, lng }, "user");
}

/**
 * Batch backfill: ensure every label in `labels` has a gazetteer row, geocoding
 * the ones not already resolved. De-dupes by normalised key and geocodes each
 * unique miss at most once. When no geocoder is configured it only registers the
 * labels (so they surface in "Places to locate") and returns. Returns a small
 * tally for the CLI/boot log.
 */
export async function ensurePlaces(
  db: DB,
  labels: (string | null | undefined)[],
): Promise<{ resolved: number; unresolved: number; skipped: number }> {
  // Collapse to unique, non-blank labels keyed by their normalised form.
  const byKey = new Map<string, string>();
  for (const l of labels) {
    const key = normalizePlace(l);
    if (key && !byKey.has(key)) byKey.set(key, (l as string).trim());
  }
  if (byKey.size === 0) return { resolved: 0, unresolved: 0, skipped: 0 };

  // What's already resolved — skip those entirely.
  const keys = [...byKey.keys()];
  const existing = await db
    .select({ normalized: schema.place.normalized, status: schema.place.status })
    .from(schema.place)
    .where(inArray(schema.place.normalized, keys));
  const resolvedKeys = new Set(existing.filter((r) => r.status === "resolved").map((r) => r.normalized));

  let resolved = 0;
  let unresolved = 0;
  let skipped = resolvedKeys.size;

  for (const [key, label] of byKey) {
    if (resolvedKeys.has(key)) continue;

    if (!geocoderConfigured()) {
      await registerPlaceLabel(db, label);
      unresolved++;
      continue;
    }

    const hits = await geocode(label, 1);
    const hit = hits[0];
    if (hit && hit.lat != null && hit.lng != null) {
      await upsertResolved(
        db,
        label,
        {
          lat: hit.lat,
          lng: hit.lng,
          country: hit.country,
          region: hit.region,
          locality: hit.locality,
          address: hit.address,
          placeId: hit.placeId,
        },
        "geocoder",
      );
      resolved++;
    } else {
      // Looked up, found nothing — mark it so it shows in "Places to locate" and
      // the geocodedAt timestamp records the attempt.
      await db
        .insert(schema.place)
        .values({ id: placeKeyId(key), normalized: key, label, status: "unresolved", geocodedAt: new Date() })
        .onConflictDoUpdate({
          target: schema.place.normalized,
          set: { status: "unresolved", geocodedAt: new Date(), updatedAt: new Date() },
        });
      unresolved++;
    }
  }

  return { resolved, unresolved, skipped };
}

/**
 * Every distinct place string the archive references — person birth/death places,
 * stored-event places (an immigration "A → B" contributes both endpoints) and
 * residence labels. The batch backfill's input set.
 */
export async function archivePlaceLabels(db: DB): Promise<string[]> {
  const [personRows, eventRows, residenceRows] = await Promise.all([
    db.select({ born: schema.person.bornPlace, died: schema.person.diedPlace }).from(schema.person),
    db.select({ place: schema.event.place }).from(schema.event),
    db.select({ label: schema.residence.placeLabel }).from(schema.residence),
  ]);
  const out: string[] = [];
  for (const p of personRows) {
    if (p.born) out.push(p.born);
    if (p.died) out.push(p.died);
  }
  for (const e of eventRows) {
    if (!e.place) continue;
    // An immigration place can be "Liverpool → Boston": split into both stops.
    if (/[→>]/.test(e.place)) out.push(...e.place.split(/→|>/).map((s) => s.trim()).filter(Boolean));
    else out.push(e.place);
  }
  for (const r of residenceRows) if (r.label) out.push(r.label);
  return out;
}
