/**
 * Record write core (server-side) — the transaction-aware primitives that persist
 * mutations to the family archive.
 *
 * These were originally inlined in actions.ts, but the staged-upload applier
 * (lib/staged-upload/apply.ts) needs to run them *inside one transaction* so a
 * multi-person upload is all-or-nothing. They only ever touch the passed query
 * builder (never `getDb()` themselves), so they accept a {@link DbOrTx} and work
 * equally as a standalone call (auto-commit, from the server actions) or as one
 * step of a larger transaction. Pure form-parsing and the public server actions
 * stay in actions.ts; the place gazetteer + search index stay out of here (they
 * do network I/O and must run post-commit).
 *
 * NOTE: not a `"use server"` module — these are internal helpers, not callable
 * server actions, so they can take a `db`/`tx` handle and be imported freely by
 * other server code.
 */
import "server-only";
import { randomUUID } from "node:crypto";
import { and, eq, inArray, or } from "drizzle-orm";
import { z } from "zod";
import type { DB } from "@/db/client";
import { person, personName, relationship, event, eventPerson, media, residence, residencePerson } from "@/db/schema";
import { provStatuses, type ProvStatus } from "./prov";
import { dateSortKey, type NameReason } from "./family-data";
import { parsePartialDate, serializePartialDate, residenceDateKinds } from "./dates";
import { composeMarriageNameDrafts, type FlaggedSpouse } from "./marriage-names";
import { locationToColumns } from "./locations";
import type { LocationValue } from "@family-archive/ui";

/** A drizzle db handle or a transaction handle — both expose the query builder. */
export type DbOrTx = DB | Parameters<Parameters<DB["transaction"]>[0]>[0];

/**
 * The event types a user can add by hand (births/deaths/etc. are derived;
 * residence is a first-class span persisted via createResidence, not here).
 * `census` is normally auto-generated from a Census upload (see lib/census.ts),
 * but lives here too so an auto-generated census event can be hand-edited.
 */
export const STORED_EVENT_TYPE_VALUES = [
  "immigration",
  "military",
  "education",
  "career",
  "religious",
  "census",
  "other",
] as const;

// ── shared field validators ──────────────────────────────────────────────────

/** Optional free-text field → trimmed string or null. */
export const optionalText = z
  .string()
  .trim()
  .transform((v) => (v.length ? v : null))
  .nullable()
  .catch(null);

/** Canonical partial-date string ("YYYY" / "YYYY-MM" / "YYYY-MM-DD") → PartialDate, else null. */
export const partialDateFromString = z
  .string()
  .transform((v) => parsePartialDate(v))
  .catch(null);

/**
 * A {@link LocationValue} as the pickers submit it — label + structured parts +
 * optional coordinates. Shared by events, residencies and the person form's
 * place fields, so capture-at-entry can store the coordinate the picker collected.
 */
export const locationInputSchema = z
  .object({
    label: z.string(),
    country: z.string().nullish(),
    region: z.string().nullish(),
    locality: z.string().nullish(),
    address: z.string().nullish(),
    lat: z.number().nullish(),
    lng: z.number().nullish(),
    placeId: z.string().nullish(),
  })
  .nullable();

const optionalMediaId = z
  .string()
  .nullish()
  .transform((v) => (v && v.length && v !== "__new" ? v : null));

// ── person ───────────────────────────────────────────────────────────────────

export const createPersonSchema = z.object({
  // given/surname are the *birth* name (the first name in the person's history);
  // later names live in `person_name`, edited via the form's Names section. The
  // current-name cache on `person` is recomputed from the whole history on save.
  given: z.string().trim().min(1, "Given names are required"),
  surname: z.string().trim().min(1, "A surname is required"),
  sex: z.enum(["f", "m", "o"], { message: "Select a sex" }),
  birthDate: partialDateFromString,
  bornPlace: optionalText,
  deathDate: partialDateFromString,
  diedPlace: optionalText,
  living: z.boolean(),
  notes: optionalText,
});

// The form keys provenance by UI field; the read model keys it by domain field
// (lib/family-data.ts). Remap on the way in so confidence marks actually render;
// identity keys (given/surname/maiden) have no reader and are dropped.
const PROV_KEY_MAP: Record<string, string> = {
  birthDate: "born",
  birthPlace: "bornPlace",
  deathDate: "died",
  deathPlace: "diedPlace",
};

// The form serialises each mark under the unified model `{ status, mediaId?, note? }`
// (ProvenanceMark cites a *document* when verified). Tolerate a bare status string,
// and a legacy `{ status, source }` free-text label, so older callers still work.
const provStatusSchema = z.enum(provStatuses);
const provFactInput = z.union([
  provStatusSchema.transform((status) => ({ status, mediaId: null as string | null, note: null as string | null, source: null as string | null })),
  z.object({
    status: provStatusSchema,
    mediaId: z
      .string()
      .nullish()
      .transform((s) => (s && s.length && s !== "__new" ? s : null)),
    note: z
      .string()
      .nullish()
      .transform((s) => (s && s.length ? s : null)),
    source: z
      .string()
      .nullish()
      .transform((s) => (s && s.length ? s : null)),
  }),
]);
const provInputSchema = z.record(z.string(), provFactInput).catch({});

/** Remap the form's UI-keyed provenance blob onto the domain-keyed JSON stored on `person`. */
export function remapProv(raw: unknown): string {
  let parsed: unknown = {};
  if (typeof raw === "string" && raw.length) {
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = {};
    }
  } else if (raw && typeof raw === "object") {
    parsed = raw;
  }
  const validated = provInputSchema.parse(parsed);
  const out: Record<string, { status: string; mediaId: string | null; note: string | null; source: string | null }> = {};
  for (const [formKey, fact] of Object.entries(validated)) {
    const domainKey = PROV_KEY_MAP[formKey];
    if (domainKey) out[domainKey] = { status: fact.status, mediaId: fact.mediaId, note: fact.note, source: fact.source };
  }
  return JSON.stringify(out);
}

/**
 * Map validated person data onto the `person` table's column shape. `given`/
 * `surname` here are the birth name; `maiden` is owned by syncPersonNames (it
 * derives née from the name history), so it isn't written here.
 */
export function personColumns(data: z.infer<typeof createPersonSchema>) {
  return {
    given: data.given,
    surname: data.surname,
    sex: data.sex,
    bornYear: data.birthDate?.year ?? null,
    bornDate: serializePartialDate(data.birthDate),
    bornPlace: data.bornPlace,
    diedYear: data.deathDate?.year ?? null,
    diedDate: serializePartialDate(data.deathDate),
    diedPlace: data.diedPlace,
    living: data.living,
    notes: data.notes,
  };
}

/**
 * Merge a few verified facts into a person's `prov` JSON, preserving every other
 * entry. The staged upload uses this to cite the uploaded document as the source
 * for each birth/death fact it sets (the existing `remapProv` rebuilds the whole
 * blob from a form field; this is a targeted merge for the applier).
 */
export async function mergePersonProv(
  db: DbOrTx,
  personId: string,
  entries: Record<string, { status: ProvStatus; mediaId: string | null; note?: string | null }>,
): Promise<void> {
  if (Object.keys(entries).length === 0) return;
  const [row] = await db.select({ prov: person.prov }).from(person).where(eq(person.id, personId));
  let current: Record<string, unknown> = {};
  if (row?.prov) {
    try {
      const parsed = JSON.parse(row.prov);
      if (parsed && typeof parsed === "object") current = parsed as Record<string, unknown>;
    } catch {
      current = {};
    }
  }
  for (const [key, fact] of Object.entries(entries)) {
    current[key] = { status: fact.status, mediaId: fact.mediaId, note: fact.note ?? null, source: null };
  }
  await db.update(person).set({ prov: JSON.stringify(current) }).where(eq(person.id, personId));
}

// ── relationships ─────────────────────────────────────────────────────────────

/** A relationship the form drafts, relative to the subject person. */
export type RelationDraft = {
  /** How the chosen person relates to the one being added. */
  type: "parent" | "spouse" | "child" | "sibling";
  /** The existing person on the other end. */
  personId: string;
  /** Spouse rows only: canonical partial-date strings for the timeline. */
  marriedDate?: string | null;
  divorcedDate?: string | null;
  /** Spouse rows only: the person being added adopted this spouse's surname. */
  tookSpouseSurname?: boolean;
  /** Spouse rows only: confidence + cited source for the marriage (staged upload). */
  marriedProv?: string;
  marriedMediaId?: string | null;
};

export const relationDraftSchema = z
  .array(
    z.object({
      type: z.enum(["parent", "spouse", "child", "sibling"]),
      personId: z.string().min(1),
      marriedDate: z.string().nullish(),
      divorcedDate: z.string().nullish(),
      tookSpouseSurname: z.boolean().optional().catch(false),
    }),
  )
  .catch([]);

/** An edit to an existing relationship edge: remove it, or set a spouse edge's dates + provenance. */
export type RelationOp =
  | { op: "remove"; id: string }
  | {
      op: "setDates";
      id: string;
      marriedDate: string | null;
      divorcedDate: string | null;
      marriedProv?: string;
      marriedMediaId?: string | null;
      divorcedProv?: string;
      divorcedMediaId?: string | null;
      /** The subject adopted this spouse's surname (only emitted when not already recorded). */
      tookSpouseSurname?: boolean;
    };

export const relationOpSchema = z
  .array(
    z.union([
      z.object({ op: z.literal("remove"), id: z.string().min(1) }),
      z.object({
        op: z.literal("setDates"),
        id: z.string().min(1),
        marriedDate: z.string().nullable(),
        divorcedDate: z.string().nullable(),
        marriedProv: z.enum(provStatuses).catch("unverified"),
        marriedMediaId: optionalMediaId,
        divorcedProv: z.enum(provStatuses).catch("unverified"),
        divorcedMediaId: optionalMediaId,
        tookSpouseSurname: z.boolean().optional().catch(false),
      }),
    ]),
  )
  .catch([]);

interface RelEdge {
  kind: "spouse" | "parent";
  personId: string;
  relatedId: string;
  status?: "married" | "divorced";
  marriedDate?: string | null;
  divorcedDate?: string | null;
  marriedProv?: string;
  marriedMediaId?: string | null;
}

/**
 * Translate a person's relationship drafts into `relationship` rows, then insert
 * them. Edges follow the schema convention (see schema.ts): parent → chosen is
 * subject's parent; child → chosen is subject's child; spouse → a partnership;
 * sibling → the subject inherits the chosen sibling's recorded parents.
 *
 * Additive only: existing edges are skipped, so re-saving never duplicates.
 * Returns the ids of any chosen siblings that couldn't be linked (no recorded
 * parents to share) so the caller can surface them.
 */
export async function persistRelationships(
  db: DbOrTx,
  subjectId: string,
  drafts: RelationDraft[],
): Promise<{ unlinkedSiblings: string[] }> {
  if (drafts.length === 0) return { unlinkedSiblings: [] };
  const newId = subjectId;

  const targetIds = [...new Set(drafts.map((d) => d.personId))].filter((pid) => pid !== newId);
  if (targetIds.length === 0) return { unlinkedSiblings: [] };
  const existing = await db.select({ id: person.id }).from(person).where(inArray(person.id, targetIds));
  const valid = new Set(existing.map((r) => r.id));

  // Siblings need the chosen person's parents; gather them in one query.
  const siblingIds = drafts
    .filter((d) => d.type === "sibling" && valid.has(d.personId))
    .map((d) => d.personId);
  const parentsBySibling = new Map<string, string[]>();
  if (siblingIds.length > 0) {
    const parentRows = await db
      .select({ parent: relationship.personId, child: relationship.relatedId })
      .from(relationship)
      .where(and(eq(relationship.kind, "parent"), inArray(relationship.relatedId, siblingIds)));
    for (const r of parentRows) {
      const list = parentsBySibling.get(r.child) ?? [];
      list.push(r.parent);
      parentsBySibling.set(r.child, list);
    }
  }

  const edges: RelEdge[] = [];
  const unlinkedSiblings: string[] = [];
  for (const d of drafts) {
    if (!valid.has(d.personId)) continue;
    switch (d.type) {
      case "parent":
        edges.push({ kind: "parent", personId: d.personId, relatedId: newId });
        break;
      case "child":
        edges.push({ kind: "parent", personId: newId, relatedId: d.personId });
        break;
      case "spouse":
        edges.push({
          kind: "spouse",
          personId: d.personId,
          relatedId: newId,
          status: d.divorcedDate ? "divorced" : "married",
          marriedDate: d.marriedDate ?? null,
          divorcedDate: d.divorcedDate ?? null,
          marriedProv: d.marriedProv,
          marriedMediaId: d.marriedMediaId ?? null,
        });
        break;
      case "sibling": {
        const sharedParents = parentsBySibling.get(d.personId) ?? [];
        if (sharedParents.length === 0) {
          unlinkedSiblings.push(d.personId);
          break;
        }
        for (const parentId of sharedParents) {
          edges.push({ kind: "parent", personId: parentId, relatedId: newId });
        }
        break;
      }
    }
  }

  // Drop duplicate edges within this batch (e.g. two siblings sharing a parent).
  const seen = new Set<string>();
  let rows = edges
    .filter((e) => {
      const k = `${e.kind}:${e.personId}:${e.relatedId}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .map((e) => ({
      id: randomUUID(),
      kind: e.kind,
      personId: e.personId,
      relatedId: e.relatedId,
      status: e.status ?? null,
      marriedDate: e.marriedDate ?? null,
      divorcedDate: e.divorcedDate ?? null,
      marriedProv: ((provStatuses as readonly string[]).includes(e.marriedProv ?? "") ? e.marriedProv : "unverified") as ProvStatus,
      marriedMediaId: e.marriedMediaId ?? null,
    }));

  const unlinked = [...new Set(unlinkedSiblings)];
  if (rows.length === 0) return { unlinkedSiblings: unlinked };

  // Validate any cited marriage source documents (FK would otherwise reject them).
  const citedIds = [...new Set(rows.map((r) => r.marriedMediaId).filter((x): x is string => !!x))];
  const validMedia = citedIds.length
    ? new Set((await db.select({ id: media.id }).from(media).where(inArray(media.id, citedIds))).map((m) => m.id))
    : new Set<string>();
  rows = rows.map((r) => ({ ...r, marriedMediaId: r.marriedMediaId && validMedia.has(r.marriedMediaId) ? r.marriedMediaId : null }));

  // Skip edges that already exist. A `parent` edge is directional; a `spouse` edge
  // is undirected, so normalise its key on the sorted pair.
  const edgeKey = (e: { kind: string; personId: string; relatedId: string }) =>
    e.kind === "spouse"
      ? `spouse:${[e.personId, e.relatedId].sort().join("|")}`
      : `${e.kind}:${e.personId}:${e.relatedId}`;
  const ids = [...new Set(rows.flatMap((r) => [r.personId, r.relatedId]))];
  const current = await db
    .select({ kind: relationship.kind, personId: relationship.personId, relatedId: relationship.relatedId })
    .from(relationship)
    .where(or(inArray(relationship.personId, ids), inArray(relationship.relatedId, ids)));
  const have = new Set(current.map(edgeKey));
  rows = rows.filter((r) => !have.has(edgeKey(r)));

  if (rows.length > 0) await db.insert(relationship).values(rows);
  return { unlinkedSiblings: unlinked };
}

/**
 * Apply edits to a person's existing relationship edges: remove an edge, or set a
 * spouse edge's married/divorced dates + provenance. Every op is checked against
 * the rows that actually involve `subjectId`, so a tampered payload can't touch
 * unrelated relationships.
 */
export async function applyRelationshipOps(db: DbOrTx, subjectId: string, ops: RelationOp[]): Promise<void> {
  const removeIds = [...new Set(ops.filter((o) => o.op === "remove").map((o) => o.id))];
  const dateOps = ops.filter((o): o is Extract<RelationOp, { op: "setDates" }> => o.op === "setDates");
  const allIds = [...new Set([...removeIds, ...dateOps.map((o) => o.id)])];
  if (allIds.length === 0) return;

  const rows = await db
    .select({ id: relationship.id, kind: relationship.kind, personId: relationship.personId, relatedId: relationship.relatedId })
    .from(relationship)
    .where(inArray(relationship.id, allIds));
  const owned = new Set(rows.filter((r) => r.personId === subjectId || r.relatedId === subjectId).map((r) => r.id));
  const kindById = new Map(rows.map((r) => [r.id, r.kind]));

  const toRemove = removeIds.filter((id) => owned.has(id));
  if (toRemove.length > 0) await db.delete(relationship).where(inArray(relationship.id, toRemove));

  const citedIds = [
    ...new Set(dateOps.flatMap((o) => [o.marriedMediaId, o.divorcedMediaId]).filter((x): x is string => !!x)),
  ];
  const validMedia = citedIds.length
    ? new Set((await db.select({ id: media.id }).from(media).where(inArray(media.id, citedIds))).map((m) => m.id))
    : new Set<string>();
  const okMedia = (id: string | null | undefined) => (id && validMedia.has(id) ? id : null);

  for (const o of dateOps) {
    if (!owned.has(o.id) || kindById.get(o.id) !== "spouse") continue;
    await db
      .update(relationship)
      .set({
        marriedDate: o.marriedDate,
        divorcedDate: o.divorcedDate,
        status: o.divorcedDate ? "divorced" : "married",
        marriedProv: ((provStatuses as readonly string[]).includes(o.marriedProv ?? "") ? o.marriedProv : "unverified") as ProvStatus,
        marriedMediaId: okMedia(o.marriedMediaId),
        divorcedProv: ((provStatuses as readonly string[]).includes(o.divorcedProv ?? "") ? o.divorcedProv : "unverified") as ProvStatus,
        divorcedMediaId: okMedia(o.divorcedMediaId),
      })
      .where(eq(relationship.id, o.id));
  }
}

// ── names ─────────────────────────────────────────────────────────────────────

const NAME_REASON_VALUES = [
  "birth",
  "marriage",
  "immigration",
  "naturalization",
  "religious",
  "personal",
  "other",
] as const;

/** One name the form drafts (a `person_name` row to upsert). */
export type NameDraft = {
  id?: string | null;
  given: string;
  surname: string;
  effectiveDate?: string | null;
  reason: NameReason;
  causeRelationshipId?: string | null;
  causeEventId?: string | null;
  mediaId?: string | null;
  prov?: string;
  note?: string | null;
  ordinal?: number;
};

export const nameDraftSchema = z
  .array(
    z.object({
      id: z.string().nullish().transform((v) => v ?? null),
      given: z.string().trim().min(1),
      surname: z.string().trim().min(1),
      effectiveDate: z.string().nullish().transform((v) => serializePartialDate(parsePartialDate(v ?? null))),
      reason: z.enum(NAME_REASON_VALUES).catch("other"),
      causeRelationshipId: z.string().nullish().transform((v) => (v && v.length ? v : null)),
      causeEventId: z.string().nullish().transform((v) => (v && v.length ? v : null)),
      mediaId: z.string().nullish().transform((v) => (v && v.length ? v : null)),
      prov: z.enum(provStatuses).catch("unverified"),
      note: optionalText,
      ordinal: z.number().nullish().transform((v) => v ?? undefined),
    }),
  )
  .catch([]);

/**
 * Read a person's current name history back into `NameDraft`s (earliest → latest),
 * so the staged upload can append/edit one name without `syncPersonNames` wiping
 * the rest (it reconciles to *exactly* the drafts it's given).
 */
export async function loadNameDrafts(db: DbOrTx, personId: string): Promise<NameDraft[]> {
  const rows = await db
    .select({
      id: personName.id,
      given: personName.given,
      surname: personName.surname,
      effectiveDate: personName.effectiveDate,
      reason: personName.reason,
      relationshipId: personName.relationshipId,
      eventId: personName.eventId,
      mediaId: personName.mediaId,
      prov: personName.prov,
      note: personName.note,
      ordinal: personName.ordinal,
    })
    .from(personName)
    .where(eq(personName.personId, personId));
  return rows
    .map((r) => ({
      id: r.id,
      given: r.given,
      surname: r.surname,
      effectiveDate: r.effectiveDate,
      reason: r.reason as NameReason,
      causeRelationshipId: r.relationshipId,
      causeEventId: r.eventId,
      mediaId: r.mediaId,
      prov: r.prov,
      note: r.note,
      ordinal: r.ordinal,
    }))
    .sort((a, b) => {
      const ka = dateSortKey(parsePartialDate(a.effectiveDate));
      const kb = dateSortKey(parsePartialDate(b.effectiveDate));
      if (ka !== kb) return ka - kb;
      return (a.ordinal ?? 0) - (b.ordinal ?? 0);
    });
}

/**
 * Reconcile a person's `person_name` rows to exactly `drafts` (upsert by id,
 * insert new, delete the rest), then rewrite the current-name cache on `person`.
 * Drafts must be ordered earliest → latest (birth first).
 */
export async function syncPersonNames(db: DbOrTx, personId: string, drafts: NameDraft[]): Promise<void> {
  if (drafts.length === 0) return;

  const relIds = [...new Set(drafts.map((d) => d.causeRelationshipId).filter((x): x is string => !!x))];
  const evIds = [...new Set(drafts.map((d) => d.causeEventId).filter((x): x is string => !!x))];
  const medIds = [...new Set(drafts.map((d) => d.mediaId).filter((x): x is string => !!x))];
  const idsOf = <T extends { id: string }>(rows: T[]) => new Set(rows.map((r) => r.id));
  const none = Promise.resolve([] as { id: string }[]);
  const [existing, relRows, evRows, medRows] = await Promise.all([
    db.select({ id: personName.id }).from(personName).where(eq(personName.personId, personId)),
    relIds.length ? db.select({ id: relationship.id }).from(relationship).where(inArray(relationship.id, relIds)) : none,
    evIds.length ? db.select({ id: event.id }).from(event).where(inArray(event.id, evIds)) : none,
    medIds.length ? db.select({ id: media.id }).from(media).where(inArray(media.id, medIds)) : none,
  ]);
  const existingIds = idsOf(existing);
  const validRel = idsOf(relRows);
  const validEv = idsOf(evRows);
  const validMed = idsOf(medRows);

  const kept = new Set<string>();
  const rows = drafts.map((d, idx) => {
    const id = d.id && existingIds.has(d.id) ? d.id : randomUUID();
    kept.add(id);
    const date = parsePartialDate(d.effectiveDate ?? null);
    return {
      id,
      personId,
      given: d.given.trim(),
      surname: d.surname.trim(),
      effectiveDate: serializePartialDate(date),
      effectiveYear: date?.year ?? null,
      reason: ((NAME_REASON_VALUES as readonly string[]).includes(d.reason) ? d.reason : "other") as NameReason,
      relationshipId: d.causeRelationshipId && validRel.has(d.causeRelationshipId) ? d.causeRelationshipId : null,
      eventId: d.causeEventId && validEv.has(d.causeEventId) ? d.causeEventId : null,
      mediaId: d.mediaId && validMed.has(d.mediaId) ? d.mediaId : null,
      prov: ((provStatuses as readonly string[]).includes(d.prov ?? "") ? d.prov : "unverified") as ProvStatus,
      note: d.note ?? null,
      ordinal: d.ordinal ?? idx,
    };
  });

  const ordered = [...rows].sort((a, b) => {
    const ka = dateSortKey(parsePartialDate(a.effectiveDate));
    const kb = dateSortKey(parsePartialDate(b.effectiveDate));
    if (ka !== kb) return ka - kb;
    if (a.ordinal !== b.ordinal) return a.ordinal - b.ordinal;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
  const birth = ordered[0];
  const current = ordered[ordered.length - 1];
  const maiden = birth.surname !== current.surname ? birth.surname : null;

  const toDelete = [...existingIds].filter((id) => !kept.has(id));
  const toInsert = rows.filter((r) => !existingIds.has(r.id));
  const toUpdate = rows.filter((r) => existingIds.has(r.id));
  await Promise.all([
    ...(toDelete.length ? [db.delete(personName).where(inArray(personName.id, toDelete))] : []),
    ...(toInsert.length ? [db.insert(personName).values(toInsert)] : []),
    ...toUpdate.map((r) => db.update(personName).set(r).where(eq(personName.id, r.id))),
    db.update(person).set({ given: current.given, surname: current.surname, maiden }).where(eq(person.id, personId)),
  ]);
}

/**
 * Build the marriage name changes implied by "took spouse's surname" flags.
 * Idempotent: reuses an existing marriage name row for the same edge, and skips a
 * flag a manual draft already covers. Pure composition lives in ./marriage-names.
 */
export async function buildSurnameNameDrafts(
  db: DbOrTx,
  subjectId: string,
  given: string,
  flagged: FlaggedSpouse[],
  manualDrafts: NameDraft[],
): Promise<NameDraft[]> {
  if (flagged.length === 0) return [];
  const spouseIds = [...new Set(flagged.map((f) => f.spousePersonId))];

  const edges = await db
    .select({ id: relationship.id, personId: relationship.personId, relatedId: relationship.relatedId })
    .from(relationship)
    .where(
      and(
        eq(relationship.kind, "spouse"),
        or(
          and(eq(relationship.personId, subjectId), inArray(relationship.relatedId, spouseIds)),
          and(eq(relationship.relatedId, subjectId), inArray(relationship.personId, spouseIds)),
        ),
      ),
    );
  const relBySpouse = new Map<string, string>();
  for (const e of edges) {
    const other = e.personId === subjectId ? e.relatedId : e.personId;
    if (!relBySpouse.has(other)) relBySpouse.set(other, e.id);
  }

  const relIds = [...new Set(relBySpouse.values())];
  const [partners, existingNames] = await Promise.all([
    db.select({ id: person.id, surname: person.surname }).from(person).where(inArray(person.id, spouseIds)),
    relIds.length
      ? db
          .select({ id: personName.id, relationshipId: personName.relationshipId })
          .from(personName)
          .where(and(eq(personName.personId, subjectId), eq(personName.reason, "marriage"), inArray(personName.relationshipId, relIds)))
      : Promise.resolve([] as { id: string; relationshipId: string | null }[]),
  ]);
  const surnameByPerson = new Map(partners.map((p) => [p.id, p.surname]));
  const existingByRel = new Map<string, string>();
  for (const r of existingNames) if (r.relationshipId) existingByRel.set(r.relationshipId, r.id);

  const manualRelIds = new Set(manualDrafts.map((d) => d.causeRelationshipId).filter((x): x is string => !!x));
  return composeMarriageNameDrafts({ given, flagged, relBySpouse, surnameByPerson, existingByRel, manualRelIds });
}

/** Compose the full name history from the validated birth name + the form's later names. */
export function composeNameDrafts(data: z.infer<typeof createPersonSchema>, later: NameDraft[]): NameDraft[] {
  const birth: NameDraft = {
    id: null,
    given: data.given,
    surname: data.surname,
    effectiveDate: serializePartialDate(data.birthDate),
    reason: "birth",
    causeRelationshipId: null,
    causeEventId: null,
    mediaId: null,
    prov: "unverified",
    note: null,
    ordinal: 0,
  };
  return [birth, ...later.map((d, i) => ({ ...d, ordinal: i + 1 }))];
}

// ── events ─────────────────────────────────────────────────────────────────────

/** The shape the Add/Edit-event dialog submits (controlled client state, not FormData). */
export interface EventInput {
  type: string;
  title: string;
  date: string | null;
  place?: string | null;
  location?: LocationValue | null;
  prov?: string;
  mediaId?: string | null;
  people: string[];
}

export const eventInputSchema = z.object({
  type: z.enum(STORED_EVENT_TYPE_VALUES, { message: "Pick an event type" }),
  title: z.string().trim().min(1, "Describe what happened"),
  date: z.string().nullish().transform((v) => serializePartialDate(parsePartialDate(v ?? null))),
  place: optionalText,
  location: locationInputSchema.optional(),
  prov: z.enum(provStatuses).catch("unverified"),
  mediaId: z.string().nullish().transform((v) => (v && v.length ? v : null)),
  people: z.array(z.string().min(1)).catch([]),
});

/** Replace an event's participant set with the validated, existing people given. */
export async function syncEventPeople(db: DbOrTx, eventId: string, peopleIds: string[]): Promise<void> {
  await db.delete(eventPerson).where(eq(eventPerson.eventId, eventId));
  const ids = [...new Set(peopleIds)];
  if (ids.length === 0) return;
  const existing = await db.select({ id: person.id }).from(person).where(inArray(person.id, ids));
  const rows = existing.map((p) => ({ eventId, personId: p.id }));
  if (rows.length > 0) await db.insert(eventPerson).values(rows);
}

// ── residences ───────────────────────────────────────────────────────────────

/** The shape the Add/Edit-residence dialog submits (controlled client state). */
export interface ResidenceInput {
  personIds: string[];
  location: LocationValue | null;
  dateKind?: string;
  start: string | null;
  end?: string | null;
  prov?: string;
  mediaId?: string | null;
  note?: string | null;
}

export const residenceInputSchema = z.object({
  personIds: z.array(z.string().min(1)).min(1, "Pick at least one person who lived here"),
  location: locationInputSchema,
  dateKind: z.enum(residenceDateKinds).catch("range"),
  start: z.string().nullish().transform((v) => serializePartialDate(parsePartialDate(v ?? null))),
  end: z.string().nullish().transform((v) => serializePartialDate(parsePartialDate(v ?? null))),
  prov: z.enum(provStatuses).catch("unverified"),
  mediaId: z.string().nullish().transform((v) => (v && v.length && v !== "__new" ? v : null)),
  note: optionalText,
});

/** Replace a residence's resident set with the validated, existing people given. */
export async function syncResidencePeople(db: DbOrTx, residenceId: string, peopleIds: string[]): Promise<void> {
  await db.delete(residencePerson).where(eq(residencePerson.residenceId, residenceId));
  const ids = [...new Set(peopleIds)];
  if (ids.length === 0) return;
  const existing = await db.select({ id: person.id }).from(person).where(inArray(person.id, ids));
  const rows = existing.map((p) => ({ residenceId, personId: p.id }));
  if (rows.length > 0) await db.insert(residencePerson).values(rows);
}

/** Validate a residence draft into the column values to write, or field errors. */
export async function residenceColumns(
  db: DbOrTx,
  input: ResidenceInput,
): Promise<
  | { ok: true; cols: Record<string, unknown>; personIds: string[] }
  | { ok: false; errors: Record<string, string> }
> {
  const parsed = residenceInputSchema.safeParse(input);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      if (!errors[key]) errors[key] = issue.message;
    }
    return { ok: false, errors };
  }
  const data = parsed.data;

  const loc = locationToColumns(data.location as LocationValue | null);
  if (!loc) return { ok: false, errors: { location: "Choose where they lived" } };

  const ids = [...new Set(data.personIds)];
  const [people, docs] = await Promise.all([
    db.select({ id: person.id }).from(person).where(inArray(person.id, ids)),
    data.mediaId ? db.select({ id: media.id }).from(media).where(eq(media.id, data.mediaId)) : Promise.resolve([] as { id: string }[]),
  ]);
  const validPeople = people.map((p) => p.id);
  if (validPeople.length === 0) return { ok: false, errors: { personIds: "None of those people exist anymore." } };
  const mediaId = data.mediaId && docs.length ? data.mediaId : null;

  const isPoint = data.dateKind === "point";
  const end = isPoint ? null : data.end;

  return {
    ok: true,
    personIds: validPeople,
    cols: {
      ...loc,
      dateKind: data.dateKind,
      startDate: data.start,
      startYear: parsePartialDate(data.start)?.year ?? null,
      endDate: end,
      endYear: parsePartialDate(end)?.year ?? null,
      prov: data.prov,
      mediaId,
      note: data.note,
    },
  };
}
