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
import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  primaryKey,
  vector,
  index,
  doublePrecision,
} from "drizzle-orm/pg-core";
import { EMBEDDING_DIM } from "../lib/search/config";
import { provStatuses } from "../lib/prov";
import { residenceDateKinds } from "../lib/dates";

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
  // Provenance for the marriage / divorce dates — the unified model used across
  // the app: a confidence status plus an optional linked source document.
  marriedProv: text("married_prov", { enum: [...provStatuses] }).notNull().default("unverified"),
  marriedMediaId: text("married_media_id").references(() => media.id, { onDelete: "set null" }),
  divorcedProv: text("divorced_prov", { enum: [...provStatuses] }).notNull().default("unverified"),
  divorcedMediaId: text("divorced_media_id").references(() => media.id, { onDelete: "set null" }),
  createdAt: timestamps.createdAt,
});

export const media = pgTable("media", {
  id: text("id").primaryKey(),
  type: text("type", {
    enum: ["photo", "certificate", "article", "obituary", "census", "grave", "other"],
  }).notNull(),
  title: text("title").notNull(),
  year: integer("year"),
  // Populated once real upload lands; the seed leaves the file fields null.
  filePath: text("file_path"),
  mimeType: text("mime_type"),
  originalFilename: text("original_filename"),
  description: text("description"),
  // A structured location stored as JSON (a LocationValue). Only meaningful for a
  // "grave" item — the burial place, surfaced on the person's derived death event
  // (a headstone has no residence of its own). JSON-on-text matches person.prov.
  location: text("location"),
  // How confident we are this item is what it claims to be (the unified
  // provenance status); the document itself is the source, so no mediaId here.
  prov: text("prov", { enum: [...provStatuses] }).notNull().default("unverified"),
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
    // The date this person is recorded with *on this document* — a canonical
    // partial-date string ("YYYY" / "YYYY-MM" / "YYYY-MM-DD"). Only meaningful for
    // a "grave" item (the death/burial date the headstone records, per person); it
    // merges into the person's derived death event on the timeline.
    date: text("date"),
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
    enum: ["immigration", "military", "education", "career", "residence", "religious", "census", "other"],
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
  // True for rows auto-generated from a source document (a Census upload seeds an
  // event + residence). Flips to false the moment a user edits the row by hand, so
  // the document sync stops overwriting their changes. See lib/census.ts.
  autoManaged: boolean("auto_managed").notNull().default(false),
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
 * A name a person held, with the date it took effect — the durable source of
 * truth for a person's name history. The birth name is the first row; the most
 * recent is their current name (`person.given`/`surname`/`maiden` are kept as a
 * denormalised cache of it, rewritten by the write path on every name change).
 *
 * A change can be linked to the event that caused it — a marriage (`relationshipId`)
 * or a stored event such as immigration (`eventId`) — so the timeline renders it
 * nested inside that event (lib/timeline.ts) rather than as a duplicate.
 */
export const personName = pgTable(
  "person_name",
  {
    id: text("id").primaryKey(),
    personId: text("person_id")
      .notNull()
      .references(() => person.id, { onDelete: "cascade" }),
    given: text("given").notNull(),
    surname: text("surname").notNull(),
    // Canonical partial-date string ("YYYY" / "YYYY-MM" / "YYYY-MM-DD") for when
    // this name took effect, plus the derived 4-digit year for sort — mirrors
    // person.bornDate/bornYear. Null when unknown (sorts as the most recent).
    effectiveDate: text("effective_date"),
    effectiveYear: integer("effective_year"),
    reason: text("reason", {
      enum: ["birth", "marriage", "immigration", "naturalization", "religious", "personal", "other"],
    })
      .notNull()
      .default("birth"),
    // Optional causing event — at most one is set (model B): a marriage edge or a
    // stored event. Cleared (not deleted) if that event/relationship is removed.
    relationshipId: text("relationship_id").references(() => relationship.id, { onDelete: "set null" }),
    eventId: text("event_id").references(() => event.id, { onDelete: "set null" }),
    // Optional cited source document + per-name confidence + free note.
    mediaId: text("media_id").references(() => media.id, { onDelete: "set null" }),
    prov: text("prov", { enum: [...provStatuses] }).notNull().default("unverified"),
    note: text("note"),
    // Tiebreak when two names share an effective date (or both are undated).
    ordinal: integer("ordinal").notNull().default(0),
    createdAt: timestamps.createdAt,
  },
  (t) => ({ personIdx: index("person_name_person_idx").on(t.personId) }),
);

/**
 * Where people lived, and for what span — a first-class record (not an `event`,
 * which is point-in-time). A residence has a start and an optional end date
 * (precision-aware partial-date strings, like births), a structured location
 * (country → address, with optional coordinates) plus a display label, and the
 * unified provenance (status + optional linked source document + note). The
 * residence is many-to-many with people (a home is shared by a household) via
 * `residence_person`. The timeline derives a span event from each row, linked to
 * every resident (see lib/timeline.ts).
 */
export const residence = pgTable("residence", {
  id: text("id").primaryKey(),
  // Structured location parts (any may be null) + the human display string.
  country: text("country"),
  region: text("region"),
  locality: text("locality"),
  address: text("address"),
  placeLabel: text("place_label").notNull(),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  placeId: text("place_id"),
  // How the dates are meant: a "range" (move-in → move-out) or a "point" (a
  // single known date we only know they lived here around — no span).
  dateKind: text("date_kind", { enum: [...residenceDateKinds] }).notNull().default("range"),
  // Canonical partial-date strings + derived 4-digit years (mirrors person dates).
  // For a "point" residence only the start fields are used (the known date).
  startDate: text("start_date"),
  startYear: integer("start_year"),
  endDate: text("end_date"),
  endYear: integer("end_year"),
  prov: text("prov", { enum: [...provStatuses] }).notNull().default("unverified"),
  mediaId: text("media_id").references(() => media.id, { onDelete: "set null" }),
  note: text("note"),
  // True for rows auto-generated from a source document (a Census upload). Flips to
  // false the moment a user edits the residence by hand. See lib/census.ts.
  autoManaged: boolean("auto_managed").notNull().default(false),
  ...timestamps,
});

/** Which people lived in a residence — a household is many-to-many with homes. */
export const residencePerson = pgTable(
  "residence_person",
  {
    residenceId: text("residence_id")
      .notNull()
      .references(() => residence.id, { onDelete: "cascade" }),
    personId: text("person_id")
      .notNull()
      .references(() => person.id, { onDelete: "cascade" }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.residenceId, t.personId] }),
    personIdx: index("residence_person_person_idx").on(t.personId),
  }),
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
export type PersonNameRow = typeof personName.$inferSelect;
export type RelationshipRow = typeof relationship.$inferSelect;
export type MediaRow = typeof media.$inferSelect;
export type PersonMediaRow = typeof personMedia.$inferSelect;
export type EventRow = typeof event.$inferSelect;
export type EventPersonRow = typeof eventPerson.$inferSelect;
export type ResidenceRow = typeof residence.$inferSelect;
export type ResidencePersonRow = typeof residencePerson.$inferSelect;
export type SearchDocRow = typeof searchDoc.$inferSelect;
