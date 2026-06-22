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
import type { Person, MediaItem, Dataset, EventType } from "./family-data";
import { buildFamilyGraph, type RelationshipEdge } from "./family-graph";
import { buildTimeline, type StoredEvent } from "./timeline";
import { provStatuses, type ProvStatus } from "./prov";
import { parsePartialDate } from "./dates";

// Keys are validated structurally (string); values carry the real constraints.
const docsSchema = z.record(z.string(), z.number()).catch({});
// A fact is stored as `{ status, source? }`; legacy rows hold a bare status
// string. Accept both and normalise to the object shape on the way out.
const provFactSchema = z.union([
  z.enum(provStatuses).transform((status) => ({ status, source: null })),
  z.object({
    status: z.enum(provStatuses),
    source: z
      .string()
      .nullish()
      .transform((s) => s ?? null),
  }),
]);
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
  const personRows = await db.select().from(schema.person);
  const relationshipRows = await db.select().from(schema.relationship);
  const mediaRows = await db.select().from(schema.media);
  const links = await db.select().from(schema.personMedia);
  const eventRows = await db.select().from(schema.event);
  const eventLinks = await db.select().from(schema.eventPerson);

  // Real attached-media count per person, derived from the link table.
  const mediaCountByPerson = new Map<string, number>();
  for (const l of links) {
    mediaCountByPerson.set(l.personId, (mediaCountByPerson.get(l.personId) ?? 0) + 1);
  }

  const people: Record<string, Person> = {};
  for (const r of personRows) {
    const bornDate = parsePartialDate(r.bornDate);
    const diedDate = parsePartialDate(r.diedDate);
    people[r.id] = {
      id: r.id,
      given: r.given,
      surname: r.surname,
      maiden: r.maiden,
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
      prov: parseJson(r.prov, provSchema),
    };
  }

  const peopleByMedia = new Map<string, string[]>();
  for (const l of links) {
    (peopleByMedia.get(l.mediaId) ?? peopleByMedia.set(l.mediaId, []).get(l.mediaId)!).push(l.personId);
  }
  const media: MediaItem[] = mediaRows.map((m) => ({
    id: m.id,
    type: m.type,
    title: m.title,
    year: m.year ?? 0,
    people: peopleByMedia.get(m.id) ?? [],
    mimeType: m.mimeType,
    hasFile: m.filePath != null,
  }));

  const relationships: RelationshipEdge[] = relationshipRows.map((r) => ({
    id: r.id,
    kind: r.kind,
    personId: r.personId,
    relatedId: r.relatedId,
    status: r.status,
    marriedDate: r.marriedDate,
    divorcedDate: r.divorcedDate,
  }));

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

  return {
    people,
    graph: buildFamilyGraph(relationships),
    relationships,
    media,
    events: buildTimeline({ people, relationships, media, events }),
  };
}
