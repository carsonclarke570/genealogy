/**
 * Census → derived residence + event.
 *
 * A census record names a household, a place and a year all at once — the richest
 * residence source we have. When a "census" media item is created (or edited), we
 * auto-generate two first-class records from it, linked to everyone on the media
 * and citing it as their source:
 *   - a **residence** (a "point" — we know they lived there around that year), and
 *   - a **census event** (that they appeared in the census).
 *
 * The rows use *deterministic* ids derived from the media id, so generation is
 * idempotent (re-running never duplicates) and the rows can be found and removed
 * when the census is deleted or its type changed. Each row carries `autoManaged`:
 * true while the sync owns it, flipped to false the moment a user edits it by hand
 * (see updateResidence/updateEvent) — after which the sync leaves it alone.
 *
 * `buildCensusRows` is pure (no DB) so it can be unit-tested in isolation;
 * `syncCensusDerived` performs the upsert/cleanup and is called from the media
 * route handlers (inside their transaction).
 */
import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import type { DB } from "@/db/client";
import { person, residence, residencePerson, event, eventPerson } from "@/db/schema";
import type { LocationValue } from "./locations";
import type { ProvStatus } from "./prov";
import { buildCensusRows, censusResidenceId, censusEventId } from "./census-derive";

export { buildCensusRows, censusResidenceId, censusEventId } from "./census-derive";

/** A drizzle db handle or a transaction handle — both expose the query builder. */
type DbOrTx = DB | Parameters<Parameters<DB["transaction"]>[0]>[0];

/** The household ids that actually exist, de-duplicated. */
async function existingPeople(db: DbOrTx, peopleIds: string[]): Promise<string[]> {
  const ids = [...new Set(peopleIds)];
  if (ids.length === 0) return [];
  const rows = await db.select({ id: person.id }).from(person).where(inArray(person.id, ids));
  return rows.map((r) => r.id);
}

/** Replace the residence's resident set with the validated, existing people given. */
async function syncResidenceResidents(db: DbOrTx, residenceId: string, peopleIds: string[]): Promise<void> {
  await db.delete(residencePerson).where(eq(residencePerson.residenceId, residenceId));
  const ids = await existingPeople(db, peopleIds);
  if (ids.length > 0) await db.insert(residencePerson).values(ids.map((personId) => ({ residenceId, personId })));
}

/** Replace the event's participant set with the validated, existing people given. */
async function syncEventParticipants(db: DbOrTx, eventId: string, peopleIds: string[]): Promise<void> {
  await db.delete(eventPerson).where(eq(eventPerson.eventId, eventId));
  const ids = await existingPeople(db, peopleIds);
  if (ids.length > 0) await db.insert(eventPerson).values(ids.map((personId) => ({ eventId, personId })));
}

export interface CensusSyncInput {
  mediaId: string;
  /** The media item's current type — derivation only runs while it's "census". */
  type: string;
  year: number | null;
  /** Everyone on the media (the household). */
  personIds: string[];
  /** The census place. Required when type is "census" (validated at the boundary). */
  location: LocationValue | null;
  prov: ProvStatus;
}

/**
 * Reconcile the derived residence + event for a media item with its current state.
 *
 * - type !== "census": remove the derived rows we still own (autoManaged), leaving
 *   any a user has adopted by hand. Join rows cascade.
 * - type === "census": upsert both rows. A row that doesn't exist is created; one we
 *   still own is updated; one a user has adopted (autoManaged=false) is left alone.
 */
export async function syncCensusDerived(db: DbOrTx, input: CensusSyncInput): Promise<void> {
  const resId = censusResidenceId(input.mediaId);
  const evId = censusEventId(input.mediaId);

  if (input.type !== "census") {
    await db.delete(residence).where(and(eq(residence.id, resId), eq(residence.autoManaged, true)));
    await db.delete(event).where(and(eq(event.id, evId), eq(event.autoManaged, true)));
    return;
  }

  // A census must have a place to seed a residence (the route enforces this; guard
  // anyway so a malformed call is a no-op rather than a half-built record).
  if (!input.location) return;

  const { residence: resRow, event: evRow } = buildCensusRows({
    mediaId: input.mediaId,
    year: input.year,
    location: input.location,
    prov: input.prov,
  });

  // Residence: insert when absent, update while we own it, skip once user-adopted.
  const [existingRes] = await db
    .select({ autoManaged: residence.autoManaged })
    .from(residence)
    .where(eq(residence.id, resId));
  if (!existingRes) {
    await db.insert(residence).values(resRow);
    await syncResidenceResidents(db, resId, input.personIds);
  } else if (existingRes.autoManaged) {
    const { id: _id, ...rest } = resRow;
    void _id;
    await db.update(residence).set({ ...rest, updatedAt: new Date() }).where(eq(residence.id, resId));
    await syncResidenceResidents(db, resId, input.personIds);
  }

  // Event: same upsert-while-owned rule.
  const [existingEv] = await db
    .select({ autoManaged: event.autoManaged })
    .from(event)
    .where(eq(event.id, evId));
  if (!existingEv) {
    await db.insert(event).values(evRow);
    await syncEventParticipants(db, evId, input.personIds);
  } else if (existingEv.autoManaged) {
    const { id: _id, ...rest } = evRow;
    void _id;
    await db.update(event).set({ ...rest, updatedAt: new Date() }).where(eq(event.id, evId));
    await syncEventParticipants(db, evId, input.personIds);
  }
}

/** Remove the derived rows for a media item being deleted (only those we own). */
export async function removeCensusDerived(db: DbOrTx, mediaId: string): Promise<void> {
  await db
    .delete(residence)
    .where(and(eq(residence.id, censusResidenceId(mediaId)), eq(residence.autoManaged, true)));
  await db.delete(event).where(and(eq(event.id, censusEventId(mediaId)), eq(event.autoManaged, true)));
}
