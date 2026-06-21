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
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db/client";
import { person, relationship } from "@/db/schema";
import { provStatuses } from "./prov";
import { parsePartialDate, serializePartialDate } from "./dates";
import { indexPerson } from "./search/index-doc";

export type CreatePersonResult =
  | { ok: true; id: string }
  | { ok: false; errors: Record<string, string> };

/** A relationship the Add-person form drafts, relative to the new person. */
export type RelationDraft = {
  /** How the chosen person relates to the one being added. */
  type: "parent" | "spouse" | "child" | "sibling";
  /** The existing person on the other end. */
  personId: string;
};

const relationDraftSchema = z
  .array(
    z.object({
      type: z.enum(["parent", "spouse", "child", "sibling"]),
      personId: z.string().min(1),
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
  given: z.string().trim().min(1, "Given names are required"),
  surname: z.string().trim().min(1, "A surname is required"),
  maiden: optionalText,
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
}

/**
 * Translate the form's person-relative relationship drafts into `relationship`
 * rows, then insert them. Edges follow the schema convention (see schema.ts):
 *   - parent  → the chosen person is the new person's parent
 *   - child   → the chosen person is the new person's child
 *   - spouse  → a partnership; the existing person anchors the couple-unit
 *   - sibling → no sibling edge exists; instead the new person inherits the
 *               chosen sibling's recorded parents (a shared-parents link). With
 *               no recorded parents there's nothing to share, so it's skipped.
 *
 * Drafts pointing at a person that doesn't exist are dropped (the picker only
 * offers real people, but validate at the boundary anyway).
 */
async function persistRelationships(
  db: DB,
  newId: string,
  drafts: RelationDraft[],
): Promise<void> {
  if (drafts.length === 0) return;

  const targetIds = [...new Set(drafts.map((d) => d.personId))].filter((pid) => pid !== newId);
  if (targetIds.length === 0) return;
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
        edges.push({ kind: "spouse", personId: d.personId, relatedId: newId, status: "married" });
        break;
      case "sibling":
        for (const parentId of parentsBySibling.get(d.personId) ?? []) {
          edges.push({ kind: "parent", personId: parentId, relatedId: newId });
        }
        break;
    }
  }

  // Drop duplicate edges (e.g. two siblings sharing a parent).
  const seen = new Set<string>();
  const rows = edges
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
    }));

  if (rows.length > 0) await db.insert(relationship).values(rows);
}

/** Pull the person fields out of the (uncontrolled) form, ready for Zod. */
function personFieldsFromForm(formData: FormData) {
  return {
    given: formData.get("given") ?? "",
    surname: formData.get("surname") ?? "",
    maiden: formData.get("maiden") ?? "",
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

/** Map validated person data onto the `person` table's column shape. */
function personColumns(data: z.infer<typeof createPersonSchema>) {
  return {
    given: data.given,
    surname: data.surname,
    maiden: data.maiden,
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

  await persistRelationships(db, id, relationships);

  // Best-effort: index the new person for search. A failure here (embedding
  // server down, etc.) must never fail the create — the boot/`db:reindex`
  // backfill will reconcile any missed rows.
  try {
    await indexPerson(db, id);
  } catch (err) {
    console.error("Failed to index new person for search:", err);
  }

  revalidatePath("/");
  return { ok: true, id };
}

/**
 * Update an existing person's own fields (identity, life events, notes,
 * provenance) from the edit form. Relationships are *not* touched here — they're
 * connected at create time and edited through their own flow — so this is a
 * pure column update. `docs` is likewise left alone (it's a separate tally).
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

  // Best-effort re-index so edits to names/places/notes surface in search.
  try {
    await indexPerson(db, id);
  } catch (err) {
    console.error("Failed to re-index updated person for search:", err);
  }

  revalidatePath("/");
  return { ok: true, id };
}
