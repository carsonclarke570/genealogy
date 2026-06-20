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
import { db } from "@/db/client";
import * as schema from "@/db/schema";
import type { Person, MediaItem, Dataset } from "./family-data";
import { buildUnits } from "./units";

const provStatuses = ["verified", "unverified", "estimated", "disputed"] as const;

// Keys are validated structurally (string); values carry the real constraints.
const docsSchema = z.record(z.string(), z.number()).catch({});
const provSchema = z.record(z.string(), z.enum(provStatuses)).catch({});

function parseJson<T>(raw: string, schema: z.ZodType<T>): T {
  try {
    return schema.parse(JSON.parse(raw));
  } catch {
    return schema.parse({});
  }
}

export function getDataset(): Dataset {
  const personRows = db.select().from(schema.person).all();
  const relationshipRows = db.select().from(schema.relationship).all();
  const mediaRows = db.select().from(schema.media).all();
  const links = db.select().from(schema.personMedia).all();

  const people: Record<string, Person> = {};
  for (const r of personRows) {
    people[r.id] = {
      id: r.id,
      given: r.given,
      surname: r.surname,
      maiden: r.maiden,
      sex: r.sex,
      born: r.bornYear,
      bornPlace: r.bornPlace,
      died: r.diedYear,
      diedPlace: r.diedPlace,
      living: r.living,
      docs: parseJson(r.docs, docsSchema),
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
  }));

  return { people, units: buildUnits(relationshipRows), media };
}
