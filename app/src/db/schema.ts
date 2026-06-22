/**
 * Drizzle schema — the durable source of truth for the family archive.
 *
 * Refines the sketch in CLAUDE.md. Partnerships and parentage are both modelled
 * as rows in a single `relationship` table (the normalised, flexible model):
 *   - kind = "spouse":  personId + relatedId are the two partners, `status`
 *                       records married/divorced. The pair is undirected — the
 *                       family graph keys a union on the sorted partner set, so
 *                       which side is personId doesn't matter (see
 *                       lib/family-graph.ts).
 *   - kind = "parent":  personId is a parent, relatedId is their child. A child
 *                       gets one row per recorded parent; both parents' rows let
 *                       the graph draw both ancestral lines.
 *
 * `docs` and `prov` are small, sparse, person-scoped maps kept as JSON columns
 * and validated with Zod on read (lib/queries.ts). They carry the recorded
 * document tally and per-fact confidence that the UI already renders; when real
 * media upload lands, `docs` can migrate to a count derived from `person_media`.
 */
import { pgTable, text, integer, boolean, timestamp, primaryKey, vector, index } from "drizzle-orm/pg-core";
import { EMBEDDING_DIM } from "../lib/search/config";
import { provStatuses } from "../lib/prov";

const timestamps = {
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
};

export const person = pgTable("person", {
  id: text("id").primaryKey(),
  given: text("given").notNull(),
  surname: text("surname").notNull(),
  maiden: text("maiden"),
  sex: text("sex", { enum: ["m", "f", "o"] }).notNull(),
  // `bornYear`/`diedYear` are the derived 4-digit year (kept for sort, search and
  // compact display); `bornDate`/`diedDate` hold the precision-aware partial date
  // as a canonical "YYYY" / "YYYY-MM" / "YYYY-MM-DD" string (see lib/dates.ts).
  bornYear: integer("born_year"),
  bornDate: text("born_date"),
  bornPlace: text("born_place"),
  diedYear: integer("died_year"),
  diedDate: text("died_date"),
  diedPlace: text("died_place"),
  living: boolean("living").notNull().default(false),
  notes: text("notes"),
  // JSON held as text. docs: Partial<Record<DocType, number>>. prov: a per-field
  // confidence map, Partial<Record<field, { status: ProvStatus; source?: string }>>
  // (legacy rows may hold a bare status string; the read model normalises both).
  docs: text("docs").notNull().default("{}"),
  prov: text("prov").notNull().default("{}"),
  ...timestamps,
});

export const relationship = pgTable("relationship", {
  id: text("id").primaryKey(),
  kind: text("kind", { enum: ["spouse", "parent"] }).notNull(),
  personId: text("person_id")
    .notNull()
    .references(() => person.id, { onDelete: "cascade" }),
  relatedId: text("related_id")
    .notNull()
    .references(() => person.id, { onDelete: "cascade" }),
  status: text("status", { enum: ["married", "divorced"] }),
  // Precision-aware partial dates ("YYYY" / "YYYY-MM" / "YYYY-MM-DD", see
  // lib/dates.ts) for the spouse edge — when the couple married / divorced.
  // Null until recorded; only meaningful on spouse rows. The timeline derives a
  // marriage (and, when status="divorced", a divorce) event from these.
  marriedDate: text("married_date"),
  divorcedDate: text("divorced_date"),
  createdAt: timestamps.createdAt,
});

export const media = pgTable("media", {
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

export const personMedia = pgTable(
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

/**
 * Life events the timeline shows but that aren't derivable from another table.
 *
 * Births, deaths, marriages and divorces are *derived* on read (from `person`
 * and `relationship`) so editing a fact updates the timeline with no sync —
 * they are never stored here. This table holds only the genuinely new events
 * (immigration, military service, a graduation, a move…). An event can link to
 * one or more people (`event_person`) and optionally cite a source document
 * (`mediaId`). See lib/timeline.ts for how stored + derived events are merged.
 */
export const event = pgTable("event", {
  id: text("id").primaryKey(),
  type: text("type", {
    enum: ["immigration", "military", "education", "career", "residence", "religious", "other"],
  }).notNull(),
  title: text("title").notNull(),
  // Canonical partial-date string (precision implied), plus the derived 4-digit
  // year kept alongside for sort/search — mirrors `person.bornDate`/`bornYear`.
  date: text("date"),
  year: integer("year"),
  place: text("place"),
  prov: text("prov", { enum: [...provStatuses] }).notNull().default("unverified"),
  // Optional cited source document; cleared (not deleted) if the media is removed.
  mediaId: text("media_id").references(() => media.id, { onDelete: "set null" }),
  ...timestamps,
});

export const eventPerson = pgTable(
  "event_person",
  {
    eventId: text("event_id")
      .notNull()
      .references(() => event.id, { onDelete: "cascade" }),
    personId: text("person_id")
      .notNull()
      .references(() => person.id, { onDelete: "cascade" }),
  },
  (t) => ({ pk: primaryKey({ columns: [t.eventId, t.personId] }) }),
);

/**
 * Search index — a decoupled, denormalised view of the searchable corpus
 * (people + media), one row per indexed entity, kept in sync by the indexing
 * pipeline (lib/search/index-doc.ts). Hybrid search (lib/search/query.ts) ranks
 * over `embedding` (dense, pgvector cosine via the HNSW index) and `tsv`
 * (Postgres full-text, GIN index), fused by Reciprocal Rank Fusion.
 *
 * `embedding` is nullable: lexical-only deployments (no embedding server) still
 * write rows and remain searchable via `tsv`. `tsv` is a STORED generated column
 * added in the migration — drizzle-kit can't express it, so it isn't declared
 * here and stays invisible to the ORM (queried via raw SQL).
 */
export const searchDoc = pgTable(
  "search_doc",
  {
    id: text("id").primaryKey(), // `${kind}:${refId}`
    kind: text("kind", { enum: ["person", "media"] }).notNull(),
    refId: text("ref_id").notNull(),
    content: text("content").notNull(),
    place: text("place"), // person places, denormalised for the Places scope; null for media
    embedding: vector("embedding", { dimensions: EMBEDDING_DIM }),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => ({
    embeddingIdx: index("search_doc_embedding_idx").using("hnsw", t.embedding.op("vector_cosine_ops")),
  }),
);

export type PersonRow = typeof person.$inferSelect;
export type RelationshipRow = typeof relationship.$inferSelect;
export type MediaRow = typeof media.$inferSelect;
export type PersonMediaRow = typeof personMedia.$inferSelect;
export type EventRow = typeof event.$inferSelect;
export type EventPersonRow = typeof eventPerson.$inferSelect;
export type SearchDocRow = typeof searchDoc.$inferSelect;
