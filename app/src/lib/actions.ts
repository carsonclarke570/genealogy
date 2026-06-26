"use server";

/**
 * Write path (server actions): persist mutations to the family archive.
 *
 * These are the user-facing server actions the forms call. Each opens a `getDb()`
 * handle, validates at the boundary with Zod, delegates the actual table writes to
 * the transaction-aware primitives in lib/records-core.ts, then captures places +
 * (best-effort) re-indexes for search and revalidates. The staged-upload applier
 * reuses those same primitives inside one transaction (lib/staged-upload/apply.ts).
 */
import "server-only";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db/client";
import { person, relationship, event, residence } from "@/db/schema";
import type { LocationValue } from "@family-archive/ui";
import { indexPerson } from "./search/index-doc";
import { capturePlace, capturePlaces, setPlaceCoords as setPlaceCoordsRow } from "./places";
import type { FlaggedSpouse } from "./marriage-names";
import { parsePartialDate } from "./dates";
import {
  createPersonSchema,
  personColumns,
  remapProv,
  persistRelationships,
  applyRelationshipOps,
  buildSurnameNameDrafts,
  syncPersonNames,
  composeNameDrafts,
  syncEventPeople,
  syncResidencePeople,
  residenceColumns,
  eventInputSchema,
  relationDraftSchema,
  relationOpSchema,
  nameDraftSchema,
  locationInputSchema,
  type RelationDraft,
  type RelationOp,
  type NameDraft,
  type EventInput,
  type ResidenceInput,
} from "./records-core";

// Re-export the input/draft types so existing form components keep importing them
// from "@/lib/actions" unchanged.
export type { RelationDraft, RelationOp, NameDraft, EventInput, ResidenceInput } from "./records-core";

export type CreatePersonResult =
  | { ok: true; id: string; unlinkedSiblings?: string[] }
  | { ok: false; errors: Record<string, string> };

// ── form parsing helpers ───────────────────────────────────────────────────────

function parseRelationships(raw: FormDataEntryValue | null): RelationDraft[] {
  if (typeof raw !== "string" || !raw.length) return [];
  try {
    return relationDraftSchema.parse(JSON.parse(raw));
  } catch {
    return [];
  }
}

function parseRelationOps(raw: FormDataEntryValue | null): RelationOp[] {
  if (typeof raw !== "string" || !raw.length) return [];
  try {
    return relationOpSchema.parse(JSON.parse(raw));
  } catch {
    return [];
  }
}

function parseNames(raw: FormDataEntryValue | null): NameDraft[] {
  if (typeof raw !== "string" || !raw.length) return [];
  try {
    return nameDraftSchema.parse(JSON.parse(raw));
  } catch {
    return [];
  }
}

/** Parse a hidden JSON location field (the person form's birth/death place) → value or null. */
function parseLocationField(raw: FormDataEntryValue | null): LocationValue | null {
  if (typeof raw !== "string" || !raw.length) return null;
  try {
    const parsed = locationInputSchema.parse(JSON.parse(raw));
    return parsed as LocationValue | null;
  } catch {
    return null;
  }
}

/** Pull the person fields out of the (uncontrolled) form, ready for Zod. */
function personFieldsFromForm(formData: FormData) {
  return {
    given: formData.get("given") ?? "",
    surname: formData.get("surname") ?? "",
    sex: formData.get("sex") ?? "",
    birthDate: formData.get("birthDate") ?? "",
    bornPlace: formData.get("birthPlace") ?? "",
    deathDate: formData.get("deathDate") ?? "",
    diedPlace: formData.get("deathPlace") ?? "",
    living: formData.get("living") === "on",
    notes: formData.get("notes") ?? "",
  };
}

/** Turn a Zod failure into form-field-keyed messages the UI can render. */
function mapPersonErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!errors[key]) errors[key] = issue.message;
  }
  return errors;
}

// ── people ─────────────────────────────────────────────────────────────────────

export async function createPerson(formData: FormData): Promise<CreatePersonResult> {
  const parsed = createPersonSchema.safeParse(personFieldsFromForm(formData));
  if (!parsed.success) return { ok: false, errors: mapPersonErrors(parsed.error) };

  const id = randomUUID();
  const db = await getDb();
  const relationships = parseRelationships(formData.get("relationships"));
  await db.insert(person).values({
    id,
    ...personColumns(parsed.data),
    docs: "{}",
    prov: remapProv(formData.get("prov")),
  });

  const { unlinkedSiblings } = await persistRelationships(db, id, relationships);

  // Record the name history (birth name + later names), which also rewrites the
  // current-name cache. After relationships so a marriage name change resolves to
  // a now-persisted edge.
  const manualNames = parseNames(formData.get("names"));
  const flaggedSpouses = relationships
    .filter((d) => d.type === "spouse" && d.tookSpouseSurname)
    .map((d) => ({ spousePersonId: d.personId, marriedDate: d.marriedDate ?? null, prov: "unverified" }));
  const autoNames = await buildSurnameNameDrafts(db, id, parsed.data.given, flaggedSpouses, manualNames);
  await syncPersonNames(db, id, composeNameDrafts(parsed.data, [...manualNames, ...autoNames]));

  await capturePlaces(db, [
    parseLocationField(formData.get("birthPlaceLoc")),
    parseLocationField(formData.get("deathPlaceLoc")),
  ]);

  try {
    await indexPerson(db, id);
  } catch (err) {
    console.error("Failed to index new person for search:", err);
  }

  revalidatePath("/");
  return { ok: true, id, unlinkedSiblings };
}

/**
 * Update an existing person's own fields, then reconcile their relationships:
 * remove struck-out edges and add newly drafted ones. `docs` is left alone.
 */
export async function updatePerson(id: string, formData: FormData): Promise<CreatePersonResult> {
  if (!id) return { ok: false, errors: { form: "Missing the person to update." } };

  const parsed = createPersonSchema.safeParse(personFieldsFromForm(formData));
  if (!parsed.success) return { ok: false, errors: mapPersonErrors(parsed.error) };

  const db = await getDb();
  const updated = await db
    .update(person)
    .set({ ...personColumns(parsed.data), prov: remapProv(formData.get("prov")) })
    .where(eq(person.id, id))
    .returning({ id: person.id });

  if (updated.length === 0) return { ok: false, errors: { form: "That person no longer exists." } };

  const relationshipOps = parseRelationOps(formData.get("relationshipOps"));
  await applyRelationshipOps(db, id, relationshipOps);
  const relationships = parseRelationships(formData.get("relationships"));
  const { unlinkedSiblings } = await persistRelationships(db, id, relationships);

  const flaggedFromDrafts = relationships
    .filter((d) => d.type === "spouse" && d.tookSpouseSurname)
    .map((d) => ({ spousePersonId: d.personId, marriedDate: d.marriedDate ?? null, prov: "unverified" }));
  const flaggedOps = relationshipOps.filter(
    (o): o is Extract<RelationOp, { op: "setDates" }> => o.op === "setDates" && !!o.tookSpouseSurname,
  );
  let flaggedFromOps: FlaggedSpouse[] = [];
  if (flaggedOps.length) {
    const rows = await db
      .select({ id: relationship.id, personId: relationship.personId, relatedId: relationship.relatedId })
      .from(relationship)
      .where(inArray(relationship.id, flaggedOps.map((o) => o.id)));
    const byId = new Map(rows.map((r) => [r.id, r]));
    flaggedFromOps = flaggedOps.flatMap((o) => {
      const row = byId.get(o.id);
      if (!row) return [];
      const other = row.personId === id ? row.relatedId : row.personId;
      return [{ spousePersonId: other, marriedDate: o.marriedDate, prov: o.marriedProv ?? "unverified" }];
    });
  }

  const manualNames = parseNames(formData.get("names"));
  const autoNames = await buildSurnameNameDrafts(db, id, parsed.data.given, [...flaggedFromDrafts, ...flaggedFromOps], manualNames);
  await syncPersonNames(db, id, composeNameDrafts(parsed.data, [...manualNames, ...autoNames]));

  await capturePlaces(db, [
    parseLocationField(formData.get("birthPlaceLoc")),
    parseLocationField(formData.get("deathPlaceLoc")),
  ]);

  try {
    await indexPerson(db, id);
  } catch (err) {
    console.error("Failed to re-index updated person for search:", err);
  }

  revalidatePath("/");
  return { ok: true, id, unlinkedSiblings };
}

// ── life events ─────────────────────────────────────────────────────────────────

export type EventResult = { ok: true; id: string } | { ok: false; errors: Record<string, string> };

export async function createEvent(input: EventInput): Promise<EventResult> {
  const parsed = eventInputSchema.safeParse(input);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      if (!errors[key]) errors[key] = issue.message;
    }
    return { ok: false, errors };
  }
  const data = parsed.data;
  const id = randomUUID();
  const db = await getDb();
  await db.insert(event).values({
    id,
    type: data.type,
    title: data.title,
    date: data.date,
    year: parsePartialDate(data.date)?.year ?? null,
    place: data.place,
    prov: data.prov,
    mediaId: data.mediaId,
  });
  await syncEventPeople(db, id, data.people);
  await capturePlace(db, data.location as LocationValue | null);
  revalidatePath("/");
  return { ok: true, id };
}

export async function updateEvent(id: string, input: EventInput): Promise<EventResult> {
  if (!id) return { ok: false, errors: { form: "Missing the event to update." } };
  const parsed = eventInputSchema.safeParse(input);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      if (!errors[key]) errors[key] = issue.message;
    }
    return { ok: false, errors };
  }
  const data = parsed.data;
  const db = await getDb();
  const updated = await db
    .update(event)
    .set({
      type: data.type,
      title: data.title,
      date: data.date,
      year: parsePartialDate(data.date)?.year ?? null,
      place: data.place,
      prov: data.prov,
      mediaId: data.mediaId,
      // A hand edit takes ownership: stop the census sync overwriting this row.
      autoManaged: false,
      updatedAt: new Date(),
    })
    .where(eq(event.id, id))
    .returning({ id: event.id });
  if (updated.length === 0) return { ok: false, errors: { form: "That event no longer exists." } };
  await syncEventPeople(db, id, data.people);
  await capturePlace(db, data.location as LocationValue | null);
  revalidatePath("/");
  return { ok: true, id };
}

export async function deleteEvent(id: string): Promise<{ ok: boolean }> {
  if (!id) return { ok: false };
  const db = await getDb();
  await db.delete(event).where(eq(event.id, id));
  revalidatePath("/");
  return { ok: true };
}

// ── residencies ───────────────────────────────────────────────────────────────

export type ResidenceResult = { ok: true; id: string } | { ok: false; errors: Record<string, string> };

export async function createResidence(input: ResidenceInput): Promise<ResidenceResult> {
  const db = await getDb();
  const built = await residenceColumns(db, input);
  if (!built.ok) return built;
  const id = randomUUID();
  await db.insert(residence).values({ id, ...built.cols } as typeof residence.$inferInsert);
  await syncResidencePeople(db, id, built.personIds);
  await capturePlace(db, input.location);
  revalidatePath("/");
  return { ok: true, id };
}

export async function updateResidence(id: string, input: ResidenceInput): Promise<ResidenceResult> {
  if (!id) return { ok: false, errors: { form: "Missing the residence to update." } };
  const db = await getDb();
  const built = await residenceColumns(db, input);
  if (!built.ok) return built;
  const updated = await db
    .update(residence)
    .set({ ...built.cols, autoManaged: false, updatedAt: new Date() } as Partial<typeof residence.$inferInsert>)
    .where(eq(residence.id, id))
    .returning({ id: residence.id });
  if (updated.length === 0) return { ok: false, errors: { form: "That residence no longer exists." } };
  await syncResidencePeople(db, id, built.personIds);
  await capturePlace(db, input.location);
  revalidatePath("/");
  return { ok: true, id };
}

export async function deleteResidence(id: string): Promise<{ ok: boolean }> {
  if (!id) return { ok: false };
  const db = await getDb();
  await db.delete(residence).where(eq(residence.id, id));
  revalidatePath("/");
  return { ok: true };
}

// ── place gazetteer (Family Map) ─────────────────────────────────────────────────

const pinDropSchema = z.object({
  label: z.string().trim().min(1),
  lat: z.number().gte(-90).lte(90),
  lng: z.number().gte(-180).lte(180),
});

export async function setPlaceCoords(label: string, lat: number, lng: number): Promise<{ ok: boolean }> {
  const parsed = pinDropSchema.safeParse({ label, lat, lng });
  if (!parsed.success) return { ok: false };
  const db = await getDb();
  await setPlaceCoordsRow(db, parsed.data.label, parsed.data.lat, parsed.data.lng);
  revalidatePath("/");
  return { ok: true };
}
