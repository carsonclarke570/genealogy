/**
 * Drizzle schema — the durable source of truth for the family archive.
 *
 * Refines the sketch in CLAUDE.md. Partnerships and parentage are both modelled
 * as rows in a single `relationship` table (the normalised, flexible model):
 *   - kind = "spouse":  personId + relatedId are the two partners, `status`
 *                       records married/divorced. By convention personId is the
 *                       blood-line ("anchor") side so the couple-unit tree can be
 *                       reconstructed deterministically (see lib/queries.ts).
 *   - kind = "parent":  personId is a parent, relatedId is their child. A child
 *                       gets one row per recorded parent.
 *
 * `docs` and `prov` are small, sparse, person-scoped maps kept as JSON columns
 * and validated with Zod on read (lib/queries.ts). They carry the recorded
 * document tally and per-fact confidence that the UI already renders; when real
 * media upload lands, `docs` can migrate to a count derived from `person_media`.
 */
import { sqliteTable, text, integer, primaryKey } from "drizzle-orm/sqlite-core";

const timestamps = {
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
};

export const person = sqliteTable("person", {
  id: text("id").primaryKey(),
  given: text("given").notNull(),
  surname: text("surname").notNull(),
  maiden: text("maiden"),
  sex: text("sex", { enum: ["m", "f", "o"] }).notNull(),
  bornYear: integer("born_year"),
  bornPlace: text("born_place"),
  diedYear: integer("died_year"),
  diedPlace: text("died_place"),
  living: integer("living", { mode: "boolean" }).notNull().default(false),
  notes: text("notes"),
  // JSON: Partial<Record<DocType, number>> and Partial<Record<field, ProvStatus>>.
  docs: text("docs").notNull().default("{}"),
  prov: text("prov").notNull().default("{}"),
  ...timestamps,
});

export const relationship = sqliteTable("relationship", {
  id: text("id").primaryKey(),
  kind: text("kind", { enum: ["spouse", "parent"] }).notNull(),
  personId: text("person_id")
    .notNull()
    .references(() => person.id, { onDelete: "cascade" }),
  relatedId: text("related_id")
    .notNull()
    .references(() => person.id, { onDelete: "cascade" }),
  status: text("status", { enum: ["married", "divorced"] }),
  createdAt: timestamps.createdAt,
});

export const media = sqliteTable("media", {
  id: text("id").primaryKey(),
  type: text("type", {
    enum: ["photo", "certificate", "article", "obituary", "other"],
  }).notNull(),
  title: text("title").notNull(),
  year: integer("year"),
  // Populated once real upload lands; the seed leaves the file fields null.
  filePath: text("file_path"),
  mimeType: text("mime_type"),
  originalFilename: text("original_filename"),
  description: text("description"),
  createdAt: timestamps.createdAt,
});

export const personMedia = sqliteTable(
  "person_media",
  {
    personId: text("person_id")
      .notNull()
      .references(() => person.id, { onDelete: "cascade" }),
    mediaId: text("media_id")
      .notNull()
      .references(() => media.id, { onDelete: "cascade" }),
  },
  (t) => ({ pk: primaryKey({ columns: [t.personId, t.mediaId] }) }),
);

export type PersonRow = typeof person.$inferSelect;
export type RelationshipRow = typeof relationship.$inferSelect;
export type MediaRow = typeof media.$inferSelect;
export type PersonMediaRow = typeof personMedia.$inferSelect;
