/**
 * Staged upload — the transactional batch applier (server-only).
 *
 * Given the uploaded document's id and a validated {@link BatchUpdates} payload,
 * this writes every record change — for existing *and* newly-created people — as
 * one transaction, so a multi-person upload is all-or-nothing. It runs in two
 * passes: first it creates the new people (so relationships/links can reference
 * them), building a temp-id → real-id map; then it resolves every person pointer
 * and applies each subject's changes, citing the document as a **verified** source
 * for every fact.
 *
 * The per-model appliers are keyed by `ModelKey` in {@link APPLIERS}, mirroring the
 * client registry — adding a new record model is one entry here plus its payload
 * member and registry descriptor, with no change to the two-pass orchestration.
 * Must be called inside a `db.transaction(...)` (it only ever touches the passed
 * `tx`); the route handles the file object + post-commit search index.
 */
import "server-only";
import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import type { LocationValue } from "@family-archive/ui";
import { person, event, residence } from "@/db/schema";
import type { ProvStatus } from "../prov";
import { parsePartialDate } from "../dates";
import { capturePlace } from "../places";
import {
  type DbOrTx,
  type RelationDraft,
  type RelationOp,
  type NameDraft,
  type EventInput,
  type ResidenceInput,
  persistRelationships,
  applyRelationshipOps,
  syncPersonNames,
  loadNameDrafts,
  mergePersonProv,
  syncEventPeople,
  syncResidencePeople,
  residenceColumns,
  eventInputSchema,
} from "../records-core";
import {
  changesForModel,
  type BatchUpdates,
  type ModelKey,
  type NewPersonSpec,
  type PersonPointer,
  type RecordChange,
} from "./payload";

/** The document is the source: every fact this flow records is verified, cited to it. */
const VERIFIED: ProvStatus = "verified";

/** Everything a per-model applier needs to write one subject's changes. */
interface ApplyCtx {
  tx: DbOrTx;
  /** The resolved (real) id of the subject these changes belong to. */
  subjectId: string;
  /** The uploaded document — the cited source for every fact. */
  mediaId: string;
  /** Resolve a person pointer (existing id or this upload's temp id) → real id, or null. */
  resolve: (p: PersonPointer) => string | null;
}

// ── new-person creation (pass 1) ──────────────────────────────────────────────

async function createSubjectPerson(tx: DbOrTx, spec: NewPersonSpec): Promise<string> {
  const id = randomUUID();
  const bornDate = spec.bornYear != null ? String(spec.bornYear) : null;
  await tx.insert(person).values({
    id,
    given: spec.given,
    surname: spec.surname,
    sex: spec.sex,
    bornYear: spec.bornYear ?? null,
    bornDate,
    living: true,
    docs: "{}",
    prov: "{}",
  });
  // Seed the birth name + the current-name cache through the single chokepoint.
  await syncPersonNames(tx, id, [
    { id: null, given: spec.given, surname: spec.surname, effectiveDate: bornDate, reason: "birth", prov: "unverified", ordinal: 0 },
  ]);
  return id;
}

// ── per-model appliers (pass 2) ───────────────────────────────────────────────

async function applyPerson(ctx: ApplyCtx, changes: Extract<RecordChange, { model: "person" }>[]): Promise<void> {
  // Identity (given/surname) flows through the name history — handled in applyNames.
  const set: Record<string, unknown> = {};
  for (const c of changes) {
    if (c.field === "sex") set.sex = c.value;
    else if (c.field === "living") set.living = !!c.value;
    else if (c.field === "notes") set.notes = (c.value as string) || null;
  }
  if (Object.keys(set).length) await ctx.tx.update(person).set(set).where(eq(person.id, ctx.subjectId));
}

async function applyLife(ctx: ApplyCtx, changes: Extract<RecordChange, { model: "life" }>[]): Promise<void> {
  if (changes.length === 0) return;
  const set: Record<string, unknown> = {};
  const prov: Record<string, { status: ProvStatus; mediaId: string | null }> = {};
  const places: (LocationValue | null)[] = [];
  for (const c of changes) {
    if (c.field === "bornDate") {
      const s = c.value as string | null;
      set.bornDate = s;
      set.bornYear = parsePartialDate(s)?.year ?? null;
      prov.born = { status: VERIFIED, mediaId: ctx.mediaId };
    } else if (c.field === "diedDate") {
      const s = c.value as string | null;
      set.diedDate = s;
      set.diedYear = parsePartialDate(s)?.year ?? null;
      // Recording a death marks the person deceased (the registry warns about this).
      if (s) set.living = false;
      prov.died = { status: VERIFIED, mediaId: ctx.mediaId };
    } else if (c.field === "bornPlace") {
      const loc = c.value as LocationValue | null;
      set.bornPlace = loc?.label ?? null;
      places.push(loc);
      prov.bornPlace = { status: VERIFIED, mediaId: ctx.mediaId };
    } else if (c.field === "diedPlace") {
      const loc = c.value as LocationValue | null;
      set.diedPlace = loc?.label ?? null;
      places.push(loc);
      prov.diedPlace = { status: VERIFIED, mediaId: ctx.mediaId };
    }
  }
  if (Object.keys(set).length) await ctx.tx.update(person).set(set).where(eq(person.id, ctx.subjectId));
  await mergePersonProv(ctx.tx, ctx.subjectId, prov);
  for (const p of places) await capturePlace(ctx.tx, p);
}

async function applyRels(ctx: ApplyCtx, changes: Extract<RecordChange, { model: "rels" }>[]): Promise<void> {
  const drafts: RelationDraft[] = [];
  const ops: RelationOp[] = [];
  for (const c of changes) {
    if (c.op === "add-item") {
      const target = ctx.resolve(c.data.target);
      if (!target) continue;
      drafts.push({
        type: c.data.type,
        personId: target,
        marriedDate: c.data.marriedDate ?? null,
        divorcedDate: c.data.divorcedDate ?? null,
        marriedProv: VERIFIED,
        marriedMediaId: ctx.mediaId,
      });
    } else if (c.op === "remove-item") {
      ops.push({ op: "remove", id: c.itemId });
    } else if (c.op === "update-item") {
      ops.push({
        op: "setDates",
        id: c.itemId,
        marriedDate: c.data.marriedDate ?? null,
        divorcedDate: c.data.divorcedDate ?? null,
        marriedProv: VERIFIED,
        marriedMediaId: ctx.mediaId,
        divorcedProv: VERIFIED,
        divorcedMediaId: ctx.mediaId,
      });
    }
  }
  // Removals/date edits before additions, matching the person edit form's order.
  if (ops.length) await applyRelationshipOps(ctx.tx, ctx.subjectId, ops);
  if (drafts.length) await persistRelationships(ctx.tx, ctx.subjectId, drafts);
}

async function applyResidences(ctx: ApplyCtx, changes: Extract<RecordChange, { model: "residences" }>[]): Promise<void> {
  for (const c of changes) {
    if (c.op === "remove-item") {
      await ctx.tx.delete(residence).where(eq(residence.id, c.itemId));
      continue;
    }
    const others = (c.data.otherResidents ?? []).map((p) => ctx.resolve(p)).filter((x): x is string => !!x);
    const input: ResidenceInput = {
      personIds: [ctx.subjectId, ...others],
      location: c.data.location,
      dateKind: c.data.dateKind,
      start: c.data.start,
      end: c.data.end,
      prov: VERIFIED,
      mediaId: ctx.mediaId,
      note: c.data.note ?? null,
    };
    const built = await residenceColumns(ctx.tx, input);
    if (!built.ok) continue; // a residence with no usable place is silently skipped
    if (c.op === "add-item") {
      const id = randomUUID();
      await ctx.tx.insert(residence).values({ id, ...built.cols } as typeof residence.$inferInsert);
      await syncResidencePeople(ctx.tx, id, built.personIds);
    } else {
      await ctx.tx
        .update(residence)
        .set({ ...built.cols, autoManaged: false, updatedAt: new Date() } as Partial<typeof residence.$inferInsert>)
        .where(eq(residence.id, c.itemId));
      await syncResidencePeople(ctx.tx, c.itemId, built.personIds);
    }
    await capturePlace(ctx.tx, c.data.location);
  }
}

async function applyEvents(ctx: ApplyCtx, changes: Extract<RecordChange, { model: "events" }>[]): Promise<void> {
  for (const c of changes) {
    if (c.op === "remove-item") {
      await ctx.tx.delete(event).where(eq(event.id, c.itemId));
      continue;
    }
    const others = (c.data.otherPeople ?? []).map((p) => ctx.resolve(p)).filter((x): x is string => !!x);
    const input: EventInput = {
      type: c.data.type,
      title: c.data.title,
      date: c.data.date,
      place: c.data.place ?? null,
      location: c.data.location ?? null,
      prov: VERIFIED,
      mediaId: ctx.mediaId,
      people: [ctx.subjectId, ...others],
    };
    const parsed = eventInputSchema.safeParse(input);
    if (!parsed.success) continue; // an event missing a type/title is silently skipped
    const data = parsed.data;
    if (c.op === "add-item") {
      const id = randomUUID();
      await ctx.tx.insert(event).values({
        id,
        type: data.type,
        title: data.title,
        date: data.date,
        year: parsePartialDate(data.date)?.year ?? null,
        place: data.place,
        prov: data.prov,
        mediaId: data.mediaId,
      });
      await syncEventPeople(ctx.tx, id, data.people);
    } else {
      await ctx.tx
        .update(event)
        .set({
          type: data.type,
          title: data.title,
          date: data.date,
          year: parsePartialDate(data.date)?.year ?? null,
          place: data.place,
          prov: data.prov,
          mediaId: data.mediaId,
          autoManaged: false,
          updatedAt: new Date(),
        })
        .where(eq(event.id, c.itemId));
      await syncEventPeople(ctx.tx, c.itemId, data.people);
    }
    await capturePlace(ctx.tx, c.data.location ?? null);
  }
}

/**
 * Names + identity. The person row's given/surname is a cache of the name history,
 * so an identity change edits the *current* (latest) name, and name-change items
 * add/edit/remove entries — all reconciled in one `syncPersonNames` so the cache
 * never drifts. Each touched name is cited to the document (verified).
 */
async function applyNames(
  ctx: ApplyCtx,
  personChanges: Extract<RecordChange, { model: "person" }>[],
  nameChanges: Extract<RecordChange, { model: "names" }>[],
): Promise<void> {
  const identity = personChanges.filter((c) => c.field === "given" || c.field === "surname");
  if (identity.length === 0 && nameChanges.length === 0) return;

  let drafts = await loadNameDrafts(ctx.tx, ctx.subjectId);
  if (drafts.length === 0) {
    const [row] = await ctx.tx.select({ given: person.given, surname: person.surname }).from(person).where(eq(person.id, ctx.subjectId));
    drafts = [{ id: null, given: row?.given ?? "Unknown", surname: row?.surname ?? "Unknown", reason: "birth", prov: "unverified", ordinal: 0 }];
  }

  const removeIds = new Set(nameChanges.filter((c) => c.op === "remove-item").map((c) => c.itemId));
  drafts = drafts.filter((d) => !d.id || !removeIds.has(d.id));

  for (const c of nameChanges) {
    if (c.op === "update-item") {
      const d = drafts.find((x) => x.id === c.itemId);
      if (d) {
        d.given = c.data.given;
        d.surname = c.data.surname;
        d.effectiveDate = c.data.effectiveDate;
        d.reason = c.data.reason;
        d.prov = VERIFIED;
        d.mediaId = ctx.mediaId;
      }
    } else if (c.op === "add-item") {
      drafts.push({
        id: null,
        given: c.data.given,
        surname: c.data.surname,
        effectiveDate: c.data.effectiveDate,
        reason: c.data.reason,
        prov: VERIFIED,
        mediaId: ctx.mediaId,
        ordinal: drafts.length,
      } as NameDraft);
    }
  }

  if (identity.length) {
    const current = drafts[drafts.length - 1];
    for (const c of identity) {
      if (c.field === "given") current.given = String(c.value ?? "");
      else current.surname = String(c.value ?? "");
    }
    current.prov = VERIFIED;
    current.mediaId = ctx.mediaId;
  }

  await syncPersonNames(ctx.tx, ctx.subjectId, drafts);
}

/** Per-model appliers, keyed like the client registry — the scalable seam. */
const APPLIERS: Record<Exclude<ModelKey, "person" | "names">, (ctx: ApplyCtx, changes: RecordChange[]) => Promise<void>> = {
  life: (ctx, ch) => applyLife(ctx, changesForModel(ch, "life")),
  rels: (ctx, ch) => applyRels(ctx, changesForModel(ch, "rels")),
  residences: (ctx, ch) => applyResidences(ctx, changesForModel(ch, "residences")),
  events: (ctx, ch) => applyEvents(ctx, changesForModel(ch, "events")),
};

// ── orchestration ─────────────────────────────────────────────────────────────

/**
 * Apply a whole batch of record updates within an open transaction. Returns the
 * resolved ids of every subject (existing + newly created) so the route can link
 * `person_media` and run any census derivation over the full household.
 */
export async function applyBatch(tx: DbOrTx, mediaId: string, batch: BatchUpdates): Promise<{ subjectIds: string[] }> {
  // Pass 1 — create the new people so relationships/links can reference them.
  const tempIdMap = new Map<string, string>();
  for (const s of batch.subjects) {
    if (s.ref.kind === "new") tempIdMap.set(s.ref.spec.tempId, await createSubjectPerson(tx, s.ref.spec));
  }

  // Validate existing-subject ids up front (skip any that vanished).
  const existingIds = batch.subjects.filter((s) => s.ref.kind === "existing").map((s) => (s.ref as { personId: string }).personId);
  const present = existingIds.length
    ? new Set((await tx.select({ id: person.id }).from(person).where(inArray(person.id, existingIds))).map((r) => r.id))
    : new Set<string>();

  const resolve = (p: PersonPointer): string | null =>
    p.ref === "existing" ? (present.has(p.id) ? p.id : null) : (tempIdMap.get(p.id) ?? null);

  // Pass 2 — resolve pointers and apply each subject's changes.
  const subjectIds: string[] = [];
  for (const s of batch.subjects) {
    const subjectId = s.ref.kind === "new" ? tempIdMap.get(s.ref.spec.tempId)! : present.has(s.ref.personId) ? s.ref.personId : null;
    if (!subjectId) continue;
    subjectIds.push(subjectId);

    const ctx: ApplyCtx = { tx, subjectId, mediaId, resolve };
    await applyPerson(ctx, changesForModel(s.changes, "person"));
    for (const key of ["life", "rels", "residences", "events"] as const) {
      await APPLIERS[key](ctx, s.changes);
    }
    await applyNames(ctx, changesForModel(s.changes, "person"), changesForModel(s.changes, "names"));
  }

  return { subjectIds: [...new Set(subjectIds)] };
}
