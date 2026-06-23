"use server";

/**
 * Write path (server-only): persist mutations to the family archive.
 *
 * `createPerson` is the first write — it inserts a new `person` row from the
 * Add-person form. The form is uncontrolled, so it arrives as `FormData`; the
 * per-field provenance confidence rides along as a JSON blob in a hidden field.
 * Everything is Zod-validated at this boundary before it touches the database.
 */
import "server-only";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { and, eq, inArray, or } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db/client";
import { person, personName, relationship, event, eventPerson, media } from "@/db/schema";
import { provStatuses, type ProvStatus } from "./prov";
import { dateSortKey, type NameReason } from "./family-data";
import { parsePartialDate, serializePartialDate } from "./dates";
import { indexPerson } from "./search/index-doc";

/** The event types a user can add by hand (births/deaths/etc. are derived). */
const STORED_EVENT_TYPE_VALUES = [
  "immigration",
  "military",
  "education",
  "career",
  "residence",
  "religious",
  "other",
] as const;

export type CreatePersonResult =
  | {
      ok: true;
      id: string;
      /**
       * Sibling links the save couldn't make because the chosen person has no
       * recorded parents yet (siblings are derived from shared parents, so there
       * was nothing to share). The UI surfaces these so the link never silently
       * vanishes. Person ids — the client maps them to names.
       */
      unlinkedSiblings?: string[];
    }
  | { ok: false; errors: Record<string, string> };

/** A relationship the Add-person form drafts, relative to the new person. */
export type RelationDraft = {
  /** How the chosen person relates to the one being added. */
  type: "parent" | "spouse" | "child" | "sibling";
  /** The existing person on the other end. */
  personId: string;
  /** Spouse rows only: canonical partial-date strings for the timeline. */
  marriedDate?: string | null;
  divorcedDate?: string | null;
};

const relationDraftSchema = z
  .array(
    z.object({
      type: z.enum(["parent", "spouse", "child", "sibling"]),
      personId: z.string().min(1),
      marriedDate: z.string().nullish(),
      divorcedDate: z.string().nullish(),
    }),
  )
  .catch([]);

function parseRelationships(raw: FormDataEntryValue | null): RelationDraft[] {
  if (typeof raw !== "string" || !raw.length) return [];
  try {
    return relationDraftSchema.parse(JSON.parse(raw));
  } catch {
    return [];
  }
}

/** An edit to an existing relationship edge: remove it, or set a spouse edge's dates. */
export type RelationOp =
  | { op: "remove"; id: string }
  | { op: "setDates"; id: string; marriedDate: string | null; divorcedDate: string | null };

const relationOpSchema = z
  .array(
    z.union([
      z.object({ op: z.literal("remove"), id: z.string().min(1) }),
      z.object({
        op: z.literal("setDates"),
        id: z.string().min(1),
        marriedDate: z.string().nullable(),
        divorcedDate: z.string().nullable(),
      }),
    ]),
  )
  .catch([]);

function parseRelationOps(raw: FormDataEntryValue | null): RelationOp[] {
  if (typeof raw !== "string" || !raw.length) return [];
  try {
    return relationOpSchema.parse(JSON.parse(raw));
  } catch {
    return [];
  }
}

/** Optional free-text field → trimmed string or null. */
const optionalText = z
  .string()
  .trim()
  .transform((v) => (v.length ? v : null))
  .nullable()
  .catch(null);

/** Canonical partial-date string ("YYYY" / "YYYY-MM" / "YYYY-MM-DD") → PartialDate, else null. */
const partialDateFromString = z
  .string()
  .transform((v) => parsePartialDate(v))
  .catch(null);

const createPersonSchema = z.object({
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

// The form serialises each mark as `{ status, source? }` (ProvenanceMark cites a
// source when verified). Both status and source are persisted. Tolerate a bare
// status string too, so older/simpler callers still work.
const provStatusSchema = z.enum(provStatuses);
const provFactInput = z.union([
  provStatusSchema.transform((status) => ({ status, source: null as string | null })),
  z.object({
    status: provStatusSchema,
    source: z
      .string()
      .nullish()
      .transform((s) => s ?? null),
  }),
]);
const provInputSchema = z.record(z.string(), provFactInput).catch({});

function remapProv(raw: FormDataEntryValue | null): string {
  let parsed: unknown = {};
  if (typeof raw === "string" && raw.length) {
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = {};
    }
  }
  const validated = provInputSchema.parse(parsed);
  const out: Record<string, { status: string; source: string | null }> = {};
  for (const [formKey, fact] of Object.entries(validated)) {
    const domainKey = PROV_KEY_MAP[formKey];
    if (domainKey) out[domainKey] = { status: fact.status, source: fact.source };
  }
  return JSON.stringify(out);
}

type DB = Awaited<ReturnType<typeof getDb>>;

interface RelEdge {
  kind: "spouse" | "parent";
  personId: string;
  relatedId: string;
  status?: "married" | "divorced";
  marriedDate?: string | null;
  divorcedDate?: string | null;
}

/**
 * Translate a person's relationship drafts into `relationship` rows, then insert
 * them. Edges follow the schema convention (see schema.ts):
 *   - parent  → the chosen person is `subjectId`'s parent
 *   - child   → the chosen person is `subjectId`'s child
 *   - spouse  → a partnership; the existing person anchors the couple-unit
 *   - sibling → no sibling edge exists; instead the subject inherits the
 *               chosen sibling's recorded parents (a shared-parents link). With
 *               no recorded parents there's nothing to share, so it's skipped.
 *
 * Additive only: it inserts the drafted edges and never removes or re-anchors
 * existing ones, so it's safe both at create time (a brand-new person) and from
 * the edit form (connecting an existing/unplaced person). Edges that already
 * exist are skipped, so re-saving never duplicates a relationship.
 *
 * Drafts pointing at a person that doesn't exist are dropped (the picker only
 * offers real people, but validate at the boundary anyway).
 *
 * Returns the ids of any chosen siblings that couldn't be linked because they
 * have no recorded parents to share — the caller surfaces these so the user
 * knows the link didn't take (rather than it vanishing silently).
 */
async function persistRelationships(
  db: DB,
  subjectId: string,
  drafts: RelationDraft[],
): Promise<{ unlinkedSiblings: string[] }> {
  if (drafts.length === 0) return { unlinkedSiblings: [] };
  const newId = subjectId;

  const targetIds = [...new Set(drafts.map((d) => d.personId))].filter((pid) => pid !== newId);
  if (targetIds.length === 0) return { unlinkedSiblings: [] };
  const existing = await db
    .select({ id: person.id })
    .from(person)
    .where(inArray(person.id, targetIds));
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
        });
        break;
      case "sibling": {
        const sharedParents = parentsBySibling.get(d.personId) ?? [];
        if (sharedParents.length === 0) {
          // No parents on the chosen sibling means no shared-parent link to make.
          // Record it so the caller can tell the user instead of dropping it.
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
    }));

  const unlinked = [...new Set(unlinkedSiblings)];
  if (rows.length === 0) return { unlinkedSiblings: unlinked };

  // Skip edges that already exist, so editing an already-connected person (or
  // re-saving) never duplicates a relationship. A `parent` edge is directional
  // (parent→child); a `spouse` edge is undirected, so normalise its key on the
  // sorted pair to catch the same couple recorded with the anchor swapped.
  const edgeKey = (e: { kind: string; personId: string; relatedId: string }) =>
    e.kind === "spouse"
      ? `spouse:${[e.personId, e.relatedId].sort().join("|")}`
      : `${e.kind}:${e.personId}:${e.relatedId}`;
  const ids = [...new Set(rows.flatMap((r) => [r.personId, r.relatedId]))];
  const current = await db
    .select({
      kind: relationship.kind,
      personId: relationship.personId,
      relatedId: relationship.relatedId,
    })
    .from(relationship)
    .where(or(inArray(relationship.personId, ids), inArray(relationship.relatedId, ids)));
  const have = new Set(current.map(edgeKey));
  rows = rows.filter((r) => !have.has(edgeKey(r)));

  if (rows.length > 0) await db.insert(relationship).values(rows);
  return { unlinkedSiblings: unlinked };
}

/**
 * Apply edits to a person's existing relationship edges: remove an edge, or set
 * a spouse edge's married/divorced dates. Every op is checked against the rows
 * that actually involve `subjectId`, so a tampered payload can't touch unrelated
 * relationships. Siblings aren't edges (they're derived from shared parents), so
 * they're never removed here; the parent links are what you remove to change them.
 */
async function applyRelationshipOps(db: DB, subjectId: string, ops: RelationOp[]): Promise<void> {
  const removeIds = [...new Set(ops.filter((o) => o.op === "remove").map((o) => o.id))];
  const dateOps = ops.filter(
    (o): o is Extract<RelationOp, { op: "setDates" }> => o.op === "setDates",
  );
  const allIds = [...new Set([...removeIds, ...dateOps.map((o) => o.id)])];
  if (allIds.length === 0) return;

  const rows = await db
    .select({
      id: relationship.id,
      kind: relationship.kind,
      personId: relationship.personId,
      relatedId: relationship.relatedId,
    })
    .from(relationship)
    .where(inArray(relationship.id, allIds));
  const owned = new Set(
    rows.filter((r) => r.personId === subjectId || r.relatedId === subjectId).map((r) => r.id),
  );
  const kindById = new Map(rows.map((r) => [r.id, r.kind]));

  const toRemove = removeIds.filter((id) => owned.has(id));
  if (toRemove.length > 0) await db.delete(relationship).where(inArray(relationship.id, toRemove));

  // Dates only apply to spouse edges; status follows whether a divorce was recorded.
  for (const o of dateOps) {
    if (!owned.has(o.id) || kindById.get(o.id) !== "spouse") continue;
    await db
      .update(relationship)
      .set({
        marriedDate: o.marriedDate,
        divorcedDate: o.divorcedDate,
        status: o.divorcedDate ? "divorced" : "married",
      })
      .where(eq(relationship.id, o.id));
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
    // Schema keys already match the form field names (only identity/sex fields
    // can fail; dates and optional text never throw).
    const key = String(issue.path[0] ?? "form");
    if (!errors[key]) errors[key] = issue.message;
  }
  return errors;
}

/**
 * Map validated person data onto the `person` table's column shape. `given`/
 * `surname` here are the birth name; `maiden` is owned by syncPersonNames (it
 * derives née from the name history), so it isn't written here.
 */
function personColumns(data: z.infer<typeof createPersonSchema>) {
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

// ── Names ─────────────────────────────────────────────────────────────────────
// A person's name history lives in `person_name`. The form submits the *later*
// names (the birth name comes from the Identity fields); syncPersonNames is the
// single chokepoint that reconciles the rows and rewrites the current-name cache
// on `person`, so the graph node / record header / search never fall out of sync.

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
  /** Existing row id (preserved across edits), or null/absent for a new name. */
  id?: string | null;
  given: string;
  surname: string;
  /** Canonical partial-date string when this name took effect, or null. */
  effectiveDate?: string | null;
  reason: NameReason;
  /** Optional causing event — at most one is set. */
  causeRelationshipId?: string | null;
  causeEventId?: string | null;
  mediaId?: string | null;
  prov?: string;
  note?: string | null;
  ordinal?: number;
};

const nameDraftSchema = z
  .array(
    z.object({
      id: z
        .string()
        .nullish()
        .transform((v) => v ?? null),
      given: z.string().trim().min(1),
      surname: z.string().trim().min(1),
      effectiveDate: z
        .string()
        .nullish()
        .transform((v) => serializePartialDate(parsePartialDate(v ?? null))),
      reason: z.enum(NAME_REASON_VALUES).catch("other"),
      causeRelationshipId: z
        .string()
        .nullish()
        .transform((v) => (v && v.length ? v : null)),
      causeEventId: z
        .string()
        .nullish()
        .transform((v) => (v && v.length ? v : null)),
      mediaId: z
        .string()
        .nullish()
        .transform((v) => (v && v.length ? v : null)),
      prov: z.enum(provStatuses).catch("unverified"),
      note: optionalText,
      ordinal: z
        .number()
        .nullish()
        .transform((v) => v ?? undefined),
    }),
  )
  .catch([]);

function parseNames(raw: FormDataEntryValue | null): NameDraft[] {
  if (typeof raw !== "string" || !raw.length) return [];
  try {
    return nameDraftSchema.parse(JSON.parse(raw));
  } catch {
    return [];
  }
}

/**
 * Reconcile a person's `person_name` rows to exactly `drafts` (upsert by id,
 * insert new, delete the rest), then rewrite the current-name cache on `person`
 * (given/surname = the most recent name; maiden = the birth surname when it
 * differs). This is the ONLY writer of that cache — every name mutation flows
 * through here, so the cache can never drift from the history.
 *
 * `drafts` must be ordered earliest → latest (birth first); the caller composes
 * the birth name from the Identity fields and appends the form's later names.
 */
async function syncPersonNames(db: DB, personId: string, drafts: NameDraft[]): Promise<void> {
  if (drafts.length === 0) return;

  // The current rows for this person, plus FK existence for any cited
  // relationship/event/media — all independent, so fetch them concurrently.
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

  // Most-recent (current) and earliest (birth) name, ordered like the read model
  // (effective date, then ordinal, then id) — drives the denormalised cache.
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

  // Reconcile the rows (delete removed, insert new in one batch, update kept) and
  // rewrite the cache — all disjoint targets, so run them concurrently.
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

/** Compose the full name history from the validated birth name + the form's later names. */
function composeNameDrafts(
  data: z.infer<typeof createPersonSchema>,
  later: NameDraft[],
): NameDraft[] {
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

  // Record the name history (birth name + any later names), which also rewrites
  // the current-name cache. Runs after relationships so a name change linked to an
  // existing marriage resolves; links to brand-new edges drafted here are dropped.
  await syncPersonNames(db, id, composeNameDrafts(parsed.data, parseNames(formData.get("names"))));

  // Best-effort: index the new person for search. A failure here (embedding
  // server down, etc.) must never fail the create — the boot/`db:reindex`
  // backfill will reconcile any missed rows.
  try {
    await indexPerson(db, id);
  } catch (err) {
    console.error("Failed to index new person for search:", err);
  }

  revalidatePath("/");
  return { ok: true, id, unlinkedSiblings };
}

// ── Life events ─────────────────────────────────────────────────────────────
// Custom events (immigration, military, education…) are the only events that are
// *stored*: births, deaths, marriages and divorces are derived from person /
// relationship rows on read (lib/timeline.ts), so they're edited through the
// person form, not here.

export type EventResult =
  | { ok: true; id: string }
  | { ok: false; errors: Record<string, string> };

/** The shape the Add/Edit-event dialog submits (controlled client state, not FormData). */
export interface EventInput {
  type: string;
  title: string;
  /** Canonical partial-date string ("YYYY" / "YYYY-MM" / "YYYY-MM-DD"), or null. */
  date: string | null;
  place?: string | null;
  prov?: string;
  /** A cited source document id, or null. */
  mediaId?: string | null;
  /** People this event involves (it appears on each of their timelines). */
  people: string[];
}

const eventInputSchema = z.object({
  type: z.enum(STORED_EVENT_TYPE_VALUES, { message: "Pick an event type" }),
  title: z.string().trim().min(1, "Describe what happened"),
  date: z
    .string()
    .nullish()
    .transform((v) => serializePartialDate(parsePartialDate(v ?? null))),
  place: optionalText,
  prov: z.enum(provStatuses).catch("unverified"),
  mediaId: z
    .string()
    .nullish()
    .transform((v) => (v && v.length ? v : null)),
  people: z.array(z.string().min(1)).catch([]),
});

/** Replace an event's participant set with the validated, existing people given. */
async function syncEventPeople(db: DB, eventId: string, peopleIds: string[]): Promise<void> {
  await db.delete(eventPerson).where(eq(eventPerson.eventId, eventId));
  const ids = [...new Set(peopleIds)];
  if (ids.length === 0) return;
  const existing = await db.select({ id: person.id }).from(person).where(inArray(person.id, ids));
  const rows = existing.map((p) => ({ eventId, personId: p.id }));
  if (rows.length > 0) await db.insert(eventPerson).values(rows);
}

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
      updatedAt: new Date(),
    })
    .where(eq(event.id, id))
    .returning({ id: event.id });
  if (updated.length === 0) return { ok: false, errors: { form: "That event no longer exists." } };
  await syncEventPeople(db, id, data.people);
  revalidatePath("/");
  return { ok: true, id };
}

export async function deleteEvent(id: string): Promise<{ ok: boolean }> {
  if (!id) return { ok: false };
  const db = await getDb();
  // event_person rows cascade on the FK.
  await db.delete(event).where(eq(event.id, id));
  revalidatePath("/");
  return { ok: true };
}

/**
 * Update an existing person's own fields (identity, life events, notes,
 * provenance) from the edit form, then reconcile their relationships: remove any
 * edges the user struck out (applyRelationshipOps) and add any newly drafted
 * ones (persistRelationships). Linking is how someone leaves the Explorer's
 * "unplaced" shelf; removal returns a now-isolated person to it. `docs` is left
 * alone (it's a separate tally).
 */
export async function updatePerson(
  id: string,
  formData: FormData,
): Promise<CreatePersonResult> {
  if (!id) return { ok: false, errors: { form: "Missing the person to update." } };

  const parsed = createPersonSchema.safeParse(personFieldsFromForm(formData));
  if (!parsed.success) return { ok: false, errors: mapPersonErrors(parsed.error) };

  const db = await getDb();
  const updated = await db
    .update(person)
    .set({
      ...personColumns(parsed.data),
      prov: remapProv(formData.get("prov")),
    })
    .where(eq(person.id, id))
    .returning({ id: person.id });

  if (updated.length === 0) {
    return { ok: false, errors: { form: "That person no longer exists." } };
  }

  // Remove any edges the user struck out, then add any newly drafted ones.
  await applyRelationshipOps(db, id, parseRelationOps(formData.get("relationshipOps")));
  const { unlinkedSiblings } = await persistRelationships(
    db,
    id,
    parseRelationships(formData.get("relationships")),
  );

  // Reconcile the name history (birth name from the Identity fields + later names),
  // which also rewrites the current-name cache the person UPDATE above seeded.
  await syncPersonNames(db, id, composeNameDrafts(parsed.data, parseNames(formData.get("names"))));

  // Best-effort re-index so edits to names/places/notes surface in search.
  try {
    await indexPerson(db, id);
  } catch (err) {
    console.error("Failed to re-index updated person for search:", err);
  }

  revalidatePath("/");
  return { ok: true, id, unlinkedSiblings };
}
