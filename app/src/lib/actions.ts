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

/** "1990-01-01" / "c. 1915" → 1990 / 1915; anything without a 4-digit year → null. */
const yearFromDate = z
  .string()
  .transform((v) => {
    const m = v.match(/\b(\d{4})\b/);
    return m ? Number(m[1]) : null;
  })
  .catch(null);

const createPersonSchema = z.object({
  given: z.string().trim().min(1, "Given names are required"),
  surname: z.string().trim().min(1, "A surname is required"),
  maiden: optionalText,
  sex: z.enum(["f", "m", "o"], { message: "Select a sex" }),
  bornYear: yearFromDate,
  bornPlace: optionalText,
  diedYear: yearFromDate,
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

const provInputSchema = z.record(z.string(), z.enum(provStatuses)).catch({});

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
  const out: Record<string, string> = {};
  for (const [formKey, status] of Object.entries(validated)) {
    const domainKey = PROV_KEY_MAP[formKey];
    if (domainKey) out[domainKey] = status;
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

export async function createPerson(formData: FormData): Promise<CreatePersonResult> {
  const parsed = createPersonSchema.safeParse({
    given: formData.get("given") ?? "",
    surname: formData.get("surname") ?? "",
    maiden: formData.get("maiden") ?? "",
    sex: formData.get("sex") ?? "",
    bornYear: formData.get("birthDate") ?? "",
    bornPlace: formData.get("birthPlace") ?? "",
    diedYear: formData.get("deathDate") ?? "",
    diedPlace: formData.get("deathPlace") ?? "",
    living: formData.get("living") === "on",
    notes: formData.get("notes") ?? "",
  });

  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      // Map domain field names back to the form field they came from.
      const formKey =
        key === "bornYear" ? "birthDate" : key === "diedYear" ? "deathDate" : key;
      if (!errors[formKey]) errors[formKey] = issue.message;
    }
    return { ok: false, errors };
  }

  const id = randomUUID();
  const db = await getDb();
  const relationships = parseRelationships(formData.get("relationships"));
  await db.insert(person).values({
    id,
    given: parsed.data.given,
    surname: parsed.data.surname,
    maiden: parsed.data.maiden,
    sex: parsed.data.sex,
    bornYear: parsed.data.bornYear,
    bornPlace: parsed.data.bornPlace,
    diedYear: parsed.data.diedYear,
    diedPlace: parsed.data.diedPlace,
    living: parsed.data.living,
    notes: parsed.data.notes,
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
