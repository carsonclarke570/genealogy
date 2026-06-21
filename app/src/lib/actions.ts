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
import { z } from "zod";
import { getDb } from "@/db/client";
import { person } from "@/db/schema";
import { provStatuses } from "./prov";

export type CreatePersonResult =
  | { ok: true; id: string }
  | { ok: false; errors: Record<string, string> };

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

  revalidatePath("/");
  return { ok: true, id };
}
