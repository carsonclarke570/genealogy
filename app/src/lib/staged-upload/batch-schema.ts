/**
 * Staged upload — boundary validation for the record-changes payload.
 *
 * The wizard posts its {@link BatchUpdates} as a JSON field alongside the file.
 * This Zod schema validates that untrusted JSON at the route before the applier
 * touches the database; the applier (apply.ts) and the existing record schemas in
 * records-core.ts re-check the finer rules (event/residence shape, FK existence),
 * so this layer just enforces structure and drops anything malformed.
 */
import { z } from "zod";
import { locationInputSchema } from "../records-core";

const pointer = z.union([
  z.object({ ref: z.literal("existing"), id: z.string().min(1) }),
  z.object({ ref: z.literal("temp"), id: z.string().min(1) }),
]);

const nameData = z.object({
  given: z.string(),
  surname: z.string(),
  effectiveDate: z.string().nullable(),
  reason: z.enum(["birth", "marriage", "immigration", "naturalization", "religious", "personal", "other"]),
  note: z.string().nullish(),
});

const relData = z.object({
  type: z.enum(["parent", "child", "spouse", "sibling"]),
  target: pointer,
  marriedDate: z.string().nullish(),
  divorcedDate: z.string().nullish(),
  tookSpouseSurname: z.boolean().optional(),
});

const residenceData = z.object({
  location: locationInputSchema,
  dateKind: z.enum(["range", "point"]),
  start: z.string().nullable(),
  end: z.string().nullable(),
  note: z.string().nullish(),
  otherResidents: z.array(pointer).optional(),
});

const eventData = z.object({
  type: z.string(),
  title: z.string(),
  date: z.string().nullable(),
  place: z.string().nullish(),
  location: locationInputSchema.optional(),
  otherPeople: z.array(pointer).optional(),
});

/** add / update / remove ops for one collection model. */
function collection<M extends string, T extends z.ZodTypeAny>(model: M, data: T) {
  return z.discriminatedUnion("op", [
    z.object({ model: z.literal(model), op: z.literal("add-item"), tempItemId: z.string().min(1), data }),
    z.object({ model: z.literal(model), op: z.literal("update-item"), itemId: z.string().min(1), data }),
    z.object({ model: z.literal(model), op: z.literal("remove-item"), itemId: z.string().min(1) }),
  ]);
}

const change = z.union([
  z.object({
    model: z.literal("person"),
    op: z.literal("set-field"),
    field: z.enum(["given", "surname", "sex", "living", "notes"]),
    value: z.union([z.string(), z.boolean(), z.null()]),
  }),
  z.object({
    model: z.literal("life"),
    op: z.literal("set-field"),
    field: z.enum(["bornDate", "bornPlace", "diedDate", "diedPlace"]),
    value: z.union([z.string(), locationInputSchema]),
  }),
  collection("names", nameData),
  collection("rels", relData),
  collection("residences", residenceData),
  collection("events", eventData),
]);

const subjectRef = z.union([
  z.object({ kind: z.literal("existing"), personId: z.string().min(1) }),
  z.object({
    kind: z.literal("new"),
    spec: z.object({
      tempId: z.string().min(1),
      given: z.string().trim().min(1),
      surname: z.string().trim().min(1),
      sex: z.enum(["m", "f", "o"]),
      bornYear: z.number().nullish(),
    }),
  }),
]);

export const batchUpdatesSchema = z.object({
  subjects: z.array(z.object({ ref: subjectRef, changes: z.array(change) })),
});

export type ParsedBatchUpdates = z.infer<typeof batchUpdatesSchema>;
