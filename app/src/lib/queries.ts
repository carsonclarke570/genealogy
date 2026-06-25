/**
 * Read model (server-only): assemble the in-memory `Dataset` the UI consumes
 * — `{ people, units, media }` — from the normalised tables.
 *
 * The couple-unit view that drives the Explorer layout is *derived* here from
 * `relationship` rows, so storage stays normalised while the layout engine keeps
 * its simple unit input. JSON `docs`/`prov` columns are Zod-validated on the way
 * out.
 */
import "server-only";
import { z } from "zod";
import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import type { Person, MediaItem, Dataset, EventType, NameReason, Residence, ProvFact, PlaceCoord } from "./family-data";
import { assemblePersonNames } from "./family-data";
import { buildFamilyGraph, type RelationshipEdge } from "./family-graph";
import { buildTimeline, type StoredEvent } from "./timeline";
import { provStatuses, type ProvStatus } from "./prov";
import { parsePartialDate } from "./dates";
import { locationFromColumns } from "./locations";
import { locationSchema } from "./media-validation";

// Keys are validated structurally (string); values carry the real constraints.
const docsSchema = z.record(z.string(), z.number()).catch({});
// The unified fact shape is `{ status, mediaId?, note? }`. Legacy rows hold either
// a bare status string or `{ status, source: <free-text> }`; accept all three and
// normalise. The free-text legacy `source` is preserved (shown until a real
// document is linked); `source` is otherwise resolved from `mediaId` on read.
const provFactSchema = z
  .union([
    z.enum(provStatuses).transform((status) => ({ status, mediaId: null, note: null, source: null })),
    z.object({
      status: z.enum(provStatuses),
      mediaId: z
        .string()
        .nullish()
        .transform((s) => s ?? null),
      note: z
        .string()
        .nullish()
        .transform((s) => s ?? null),
      source: z
        .string()
        .nullish()
        .transform((s) => s ?? null),
    }),
  ])
  .transform((f) => ({ status: f.status, mediaId: f.mediaId ?? null, note: f.note ?? null, source: f.source ?? null }));
const provSchema = z.record(z.string(), provFactSchema).catch({});

function parseJson<T>(raw: string, schema: z.ZodType<T>): T {
  try {
    return schema.parse(JSON.parse(raw));
  } catch {
    return schema.parse({});
  }
}

export async function getDataset(): Promise<Dataset> {
  const db = await getDb();
  // Independent table reads — fetch concurrently rather than round-trip by round-trip.
  const [
    personRows,
    relationshipRows,
    mediaRows,
    links,
    eventRows,
    eventLinks,
    nameRows,
    residenceRows,
    residenceLinks,
    placeRows,
  ] = await Promise.all([
    db.select().from(schema.person),
    db.select().from(schema.relationship),
    db.select().from(schema.media),
    db.select().from(schema.personMedia),
    db.select().from(schema.event),
    db.select().from(schema.eventPerson),
    db.select().from(schema.personName),
    db.select().from(schema.residence),
    db.select().from(schema.residencePerson),
    db.select().from(schema.place),
  ]);

  // Real attached-media count per person, derived from the link table.
  const mediaCountByPerson = new Map<string, number>();
  for (const l of links) {
    mediaCountByPerson.set(l.personId, (mediaCountByPerson.get(l.personId) ?? 0) + 1);
  }

  // Names: the per-person history, with cited sources resolved from media rows.
  const mediaById = new Map(mediaRows.map((m) => [m.id, { id: m.id, title: m.title, type: m.type }]));

  /** Resolve a parsed prov map's linked-doc ids to display source titles. */
  const resolveProv = (
    raw: Record<string, { status: ProvStatus; mediaId: string | null; note: string | null; source: string | null }>,
  ): Partial<Record<string, ProvFact>> => {
    const out: Partial<Record<string, ProvFact>> = {};
    for (const [field, fact] of Object.entries(raw)) {
      const doc = fact.mediaId ? mediaById.get(fact.mediaId) : null;
      out[field] = {
        status: fact.status,
        mediaId: fact.mediaId,
        note: fact.note,
        source: doc ? doc.title : fact.source,
      };
    }
    return out;
  };
  const namesByPerson = assemblePersonNames(
    nameRows.map((r) => ({
      id: r.id,
      personId: r.personId,
      given: r.given,
      surname: r.surname,
      effectiveDate: r.effectiveDate,
      reason: r.reason as NameReason,
      relationshipId: r.relationshipId,
      eventId: r.eventId,
      mediaId: r.mediaId,
      prov: ((provStatuses as readonly string[]).includes(r.prov) ? r.prov : "unverified") as ProvStatus,
      note: r.note,
      ordinal: r.ordinal,
    })),
    mediaById,
  );

  const people: Record<string, Person> = {};
  for (const r of personRows) {
    const bornDate = parsePartialDate(r.bornDate);
    const diedDate = parsePartialDate(r.diedDate);
    const names = namesByPerson.get(r.id) ?? [];
    // Re-derive the current-name cache on read as a safety net, so a stale
    // person.given/surname can never surface a name the history doesn't hold.
    const current = names.length > 0 ? names[names.length - 1] : null;
    people[r.id] = {
      id: r.id,
      given: current?.given ?? r.given,
      surname: current?.surname ?? r.surname,
      maiden: r.maiden,
      names,
      sex: r.sex,
      born: bornDate?.year ?? r.bornYear,
      bornDate,
      bornPlace: r.bornPlace,
      died: diedDate?.year ?? r.diedYear,
      diedDate,
      diedPlace: r.diedPlace,
      living: r.living,
      notes: r.notes,
      docs: parseJson(r.docs, docsSchema),
      mediaCount: mediaCountByPerson.get(r.id) ?? 0,
      prov: resolveProv(parseJson(r.prov, provSchema)),
    };
  }

  const peopleByMedia = new Map<string, string[]>();
  // Per-person dates a media item records (a Grave's date per person), keyed
  // mediaId → { personId: canonical date string }.
  const datesByMedia = new Map<string, Record<string, string | null>>();
  for (const l of links) {
    (peopleByMedia.get(l.mediaId) ?? peopleByMedia.set(l.mediaId, []).get(l.mediaId)!).push(l.personId);
    if (l.date != null) {
      (datesByMedia.get(l.mediaId) ?? datesByMedia.set(l.mediaId, {}).get(l.mediaId)!)[l.personId] = l.date;
    }
  }
  /** Parse a media row's JSON `location` column back into a LocationValue (or null). */
  const parseMediaLocation = (raw: string | null): ReturnType<typeof locationSchema.parse> => {
    if (!raw) return null;
    try {
      return locationSchema.parse(JSON.parse(raw));
    } catch {
      return null;
    }
  };
  const normProv = (raw: string | null | undefined): ProvStatus =>
    ((provStatuses as readonly string[]).includes(raw ?? "") ? raw : "unverified") as ProvStatus;

  const media: MediaItem[] = mediaRows.map((m) => ({
    id: m.id,
    type: m.type,
    title: m.title,
    year: m.year ?? 0,
    people: peopleByMedia.get(m.id) ?? [],
    description: m.description ?? null,
    prov: normProv(m.prov),
    mimeType: m.mimeType,
    hasFile: m.filePath != null,
    location: parseMediaLocation(m.location),
    personDates: datesByMedia.get(m.id) ?? {},
  }));

  const relationships: RelationshipEdge[] = relationshipRows.map((r) => ({
    id: r.id,
    kind: r.kind,
    personId: r.personId,
    relatedId: r.relatedId,
    status: r.status,
    marriedDate: r.marriedDate,
    divorcedDate: r.divorcedDate,
    marriedProv: normProv(r.marriedProv),
    marriedMediaId: r.marriedMediaId,
    marriedSource: r.marriedMediaId ? mediaById.get(r.marriedMediaId) ?? null : null,
    divorcedProv: normProv(r.divorcedProv),
    divorcedMediaId: r.divorcedMediaId,
    divorcedSource: r.divorcedMediaId ? mediaById.get(r.divorcedMediaId) ?? null : null,
  }));

  // People who lived in each residence — a household is many-to-many with homes.
  const peopleByResidence = new Map<string, string[]>();
  for (const l of residenceLinks) {
    (peopleByResidence.get(l.residenceId) ?? peopleByResidence.set(l.residenceId, []).get(l.residenceId)!).push(
      l.personId,
    );
  }

  const residences: Residence[] = residenceRows.map((r) => {
    const start = parsePartialDate(r.startDate);
    const end = parsePartialDate(r.endDate);
    return {
      id: r.id,
      personIds: peopleByResidence.get(r.id) ?? [],
      location: locationFromColumns(r),
      place: r.placeLabel,
      dateKind: r.dateKind === "point" ? "point" : "range",
      start,
      end,
      startYear: start?.year ?? r.startYear ?? null,
      endYear: end?.year ?? r.endYear ?? null,
      prov: normProv(r.prov),
      source: r.mediaId ? mediaById.get(r.mediaId) ?? null : null,
      note: r.note,
    };
  });

  // Stored custom events + their linked people, for the timeline read model.
  const peopleByEvent = new Map<string, string[]>();
  for (const l of eventLinks) {
    (peopleByEvent.get(l.eventId) ?? peopleByEvent.set(l.eventId, []).get(l.eventId)!).push(l.personId);
  }
  const events: StoredEvent[] = eventRows.map((e) => ({
    id: e.id,
    type: e.type as EventType,
    title: e.title,
    date: e.date,
    place: e.place,
    prov: ((provStatuses as readonly string[]).includes(e.prov ?? "")
      ? (e.prov as ProvStatus)
      : "unverified"),
    mediaId: e.mediaId,
    people: peopleByEvent.get(e.id) ?? [],
  }));

  // Coordinate gazetteer (normalised label → coordinate) — one map, no N+1.
  const places: Record<string, PlaceCoord> = {};
  for (const r of placeRows) {
    places[r.normalized] = {
      normalized: r.normalized,
      label: r.label,
      lat: r.lat,
      lng: r.lng,
      country: r.country,
      region: r.region,
      locality: r.locality,
      status: r.status === "resolved" ? "resolved" : "unresolved",
    };
  }

  return {
    people,
    graph: buildFamilyGraph(relationships),
    relationships,
    media,
    residences,
    events: buildTimeline({ people, relationships, media, residences, events }),
    places,
  };
}
