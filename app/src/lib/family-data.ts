/**
 * Domain types and pure view helpers for the family archive.
 *
 * The data itself (people, couple-units, media) now lives in SQLite and is read
 * on the server via lib/queries.ts, then handed to the client through the
 * Dataset context (lib/dataset.tsx). This module holds only the shared types and
 * the pure, data-free helpers the UI renders with. The demo seed literals
 * live in db/seed-data.ts.
 */
import type {
  ProvenanceStatus,
  DocType,
  SourceOption,
  BadgeTone,
  PartialDate,
  LocationValue,
} from "@family-archive/ui";
import type { FamilyGraph, RelationshipEdge } from "./family-graph";
import { parsePartialDate } from "./dates";
import type { ResidenceDateKind } from "./dates";

export type { FamilyGraph, RelationshipEdge } from "./family-graph";
export type { LocationValue } from "@family-archive/ui";
// relationsOf is derived straight from the raw edges; it lives with the graph
// model but is re-exported here so the UI keeps importing it from one place.
export { relationsOf } from "./family-graph";

export type Sex = "m" | "f" | "o";

/** Why a person took a new name — drives the name-change event's framing. */
export type NameReason =
  | "birth"
  | "marriage"
  | "immigration"
  | "naturalization"
  | "religious"
  | "personal"
  | "other";

export const NAME_REASON_LABEL: Record<NameReason, string> = {
  birth: "At birth",
  marriage: "Marriage",
  immigration: "Immigration",
  naturalization: "Naturalization",
  religious: "Religious",
  personal: "Personal",
  other: "Other",
};

/**
 * One name a person held, with the date it took effect. A person carries an
 * ordered history of these (earliest → latest); the most recent is their current
 * name. The birth name is the first entry. A change can be linked to the event
 * that caused it (a marriage `relationshipId` or a stored `eventId`), so the
 * timeline shows it nested inside that event rather than as a floating duplicate.
 */
export interface PersonName {
  id: string;
  given: string;
  surname: string;
  /** When this name took effect, or null if unknown. */
  date: PartialDate | null;
  reason: NameReason;
  /** The marriage edge that caused this name (model B), or null. */
  relationshipId: string | null;
  /** The stored event (immigration, …) that caused this name (model B), or null. */
  eventId: string | null;
  /** A cited source document for this name, or null. */
  source: { id: string; title: string; type: DocType } | null;
  prov: ProvenanceStatus;
  note: string | null;
  /** Tiebreak when two names share an effective date (or both are undated). */
  ordinal: number;
}

/**
 * A recorded fact's confidence under the unified provenance model: a status, an
 * optional linked source **document** (`mediaId`), and an optional free-text
 * `note`. `source` is the resolved document's title, filled in on read for
 * display (legacy rows that stored a free-text source string surface it here too).
 */
export interface ProvFact {
  status: ProvenanceStatus;
  /** The cited source document's id, or null. */
  mediaId?: string | null;
  /** Display label for the cited source (resolved doc title, or legacy string). */
  source?: string | null;
  /** A free-text curator note about this fact. */
  note?: string | null;
}

export interface Person {
  id: string;
  given: string;
  surname: string;
  maiden: string | null;
  sex: Sex;
  /** The 4-digit year (derived from `bornDate`); kept for compact display + sort. */
  born: number | null;
  /** Precision-aware birth date (year / month / day), or null if unknown. */
  bornDate?: PartialDate | null;
  bornPlace: string | null;
  died: number | null;
  diedDate?: PartialDate | null;
  diedPlace: string | null;
  living: boolean;
  notes?: string | null;
  docs: Partial<Record<DocType, number>>;
  /** Real count of attached media (derived from person_media in queries.ts). */
  mediaCount: number;
  prov?: Partial<Record<string, ProvFact>>;
  /**
   * The person's name history (earliest → latest). The last entry is the current
   * name — `given`/`surname` above are a denormalised cache of it. Always holds at
   * least the birth name for any person read through queries.ts.
   */
  names: PersonName[];
}

export interface MediaItem {
  id: string;
  type: DocType;
  title: string;
  year: number;
  people: string[];
  /** Free-text notes/provenance; null when none recorded. */
  description: string | null;
  /** How confident we are this item is authentic (unified provenance status). */
  prov: ProvenanceStatus;
  /** Stored MIME type once a file is attached; null for fileless (legacy) rows. */
  mimeType: string | null;
  /** Whether an actual file is stored for this item (filePath is set). */
  hasFile: boolean;
  /** Structured location (a Grave's burial place); null for items without one. */
  location?: LocationValue | null;
  /**
   * Per-person dates this item records, keyed by person id — a Grave's
   * death/burial date per person, as a canonical partial-date string. Absent keys
   * mean no date was recorded for that person.
   */
  personDates?: Record<string, string | null>;
}

/** The authenticated route that streams a media item's bytes. */
export function mediaFileUrl(id: string): string {
  return `/api/media/${encodeURIComponent(id)}/file`;
}

/** The same route with `?download=1` so the browser saves rather than renders. */
export function mediaDownloadUrl(id: string): string {
  return `${mediaFileUrl(id)}?download=1`;
}

export function isImageMime(mime: string | null | undefined): boolean {
  return !!mime && mime.startsWith("image/");
}

/**
 * A life event on the timeline. Most are *derived* (birth/death from a person,
 * marriage/divorce from a spouse edge, a `document` from a dated media item);
 * the rest are stored in the `event` table (immigration, military, …). See
 * lib/timeline.ts for how they're built and merged.
 */
export type EventType =
  // derived from person / relationship / media
  | "birth"
  | "death"
  | "marriage"
  | "divorce"
  | "namechange"
  | "document"
  // stored in the `event` table
  | "immigration"
  | "military"
  | "education"
  | "career"
  | "residence"
  | "religious"
  | "census"
  | "other";

/**
 * A place one or more people lived for a span of time. The structured `location`
 * carries country → address granularity (+ optional coordinates); `place` is its
 * display label. `start`/`end` are precision-aware partial dates (end null =
 * ongoing). A home is shared by a household, so a residence links to every
 * resident (`personIds`). Provenance follows the unified model (status + linked
 * source document + note).
 */
export interface Residence {
  id: string;
  /** Everyone known to have lived here (one row, shared by the household). */
  personIds: string[];
  location: LocationValue;
  /** Display label for the location (mirrors `location.label`). */
  place: string;
  /**
   * Whether the dates describe a span ("range": start = moved in, end = moved
   * out / null = onward) or a single known date ("point": `start` holds the one
   * date we know they lived here, `end` unused). See {@link ResidenceDateKind}.
   */
  dateKind: ResidenceDateKind;
  start: PartialDate | null;
  end: PartialDate | null;
  /** 4-digit start year, derived; kept for sort/compact display. */
  startYear: number | null;
  endYear: number | null;
  prov: ProvenanceStatus;
  source: { id: string; title: string; type: DocType } | null;
  note: string | null;
}

export interface TimelineEvent {
  /** Deterministic synthetic id (`b-`/`d-`/`m-`/`dv-`/`me-`/`ev-`/`res-` prefixed). */
  id: string;
  type: EventType;
  /** Precision-aware date, or null when only a bucket is known. */
  date: PartialDate | null;
  /**
   * For span events (a residence), the precision-aware end date — null when the
   * span is still open. Point events leave this undefined.
   */
  endDate?: PartialDate | null;
  /** Numeric sort key (year*10000 + month*100 + day), precomputed for cheap client sort. */
  sortKey: number;
  title: string;
  place: string | null;
  /** Every participant — multi-person events surface on each one's timeline. */
  people: string[];
  prov: ProvenanceStatus;
  /** The cited source document, when one is attached/resolved. */
  source: { id: string; title: string; type: DocType } | null;
  /** True for derived events (birth/death/marriage/divorce/document); false for stored ones. */
  auto: boolean;
  /**
   * Burial details merged into a death event from a Grave (headstone) media item:
   * the burial place, the date the stone records (which may differ from the
   * person's recorded death date), the headstone as a cited source, and whether
   * those two dates conflict. Undefined on every event but a death with a grave.
   */
  burial?: {
    place: string | null;
    date: PartialDate | null;
    source: { id: string; title: string; type: DocType } | null;
    conflictsWithRecorded: boolean;
  } | null;
  /**
   * Name changes attached to this event (a marriage/immigration that caused one),
   * rendered nested inside it instead of as standalone timeline events.
   */
  nested?: TimelineEvent[];
}

/**
 * One resolved (or attempted) place in the coordinate gazetteer (the `place`
 * table). Keyed on the normalised label; `lat`/`lng` are null until a coordinate
 * is known (`status: "unresolved"` means it was looked up but couldn't be
 * located, so it surfaces in the map's "Places to locate"). Drives the Family Map.
 */
export interface PlaceCoord {
  normalized: string;
  label: string;
  lat: number | null;
  lng: number | null;
  country: string | null;
  region: string | null;
  locality: string | null;
  status: "resolved" | "unresolved";
}

/** The full in-memory snapshot the UI renders from (assembled in lib/queries.ts). */
export interface Dataset {
  people: Record<string, Person>;
  /** The derived family-graph DAG that drives the Explorer layout + relations. */
  graph: FamilyGraph;
  /** Raw relationship edges (with ids) — the edit form removes specific ones. */
  relationships: RelationshipEdge[];
  media: MediaItem[];
  /** Where people lived, and for what spans (drives the residence timeline + tab). */
  residences: Residence[];
  /** The merged, chronologically-sorted life-event timeline (derived + stored). */
  events: TimelineEvent[];
  /** Coordinate gazetteer (normalised label → coordinate), powering the Family Map. */
  places: Record<string, PlaceCoord>;
}

export function fullName(p: Person): string {
  return `${p.given} ${p.surname}`;
}

/** "Eleanor Margaret Rivers" → "Eleanor Rivers"; first given + surname for tree cells. */
export function shortName(p: Person): string {
  return `${p.given.split(" ")[0]} ${p.surname}`;
}

/**
 * Numeric sort key for a precision-aware partial date; a missing date sorts last
 * (`+Infinity`). Shared by the timeline ordering and the name history so both
 * agree on how an undated event/name ranks.
 */
export function dateSortKey(date: PartialDate | null): number {
  if (!date || date.year == null) return Number.POSITIVE_INFINITY;
  return date.year * 10000 + (date.month ?? 1) * 100 + (date.day ?? 1);
}

// ── Names (pure, unit-tested) ────────────────────────────────────────────────

/** A person's names in effect order (earliest → latest), ties broken by ordinal then id. */
export function sortNames(names: PersonName[]): PersonName[] {
  return [...names].sort((a, b) => {
    const ka = dateSortKey(a.date);
    const kb = dateSortKey(b.date);
    if (ka !== kb) return ka - kb;
    if (a.ordinal !== b.ordinal) return a.ordinal - b.ordinal;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

/** The most recent name a person held (the last in effect order), or null if none. */
export function currentName(names: PersonName[]): PersonName | null {
  if (names.length === 0) return null;
  const sorted = sortNames(names);
  return sorted[sorted.length - 1];
}

/** The birth/first name a person held (the earliest in effect order), or null. */
export function birthName(names: PersonName[]): PersonName | null {
  if (names.length === 0) return null;
  return sortNames(names)[0];
}

/** The raw DB-row shape `assemblePersonNames` consumes (one `person_name` row). */
export interface PersonNameRecord {
  id: string;
  personId: string;
  given: string;
  surname: string;
  effectiveDate: string | null;
  reason: NameReason;
  relationshipId: string | null;
  eventId: string | null;
  mediaId: string | null;
  prov: ProvenanceStatus;
  note: string | null;
  ordinal: number;
}

/**
 * Group raw `person_name` rows by person and map each to a sorted `PersonName[]`,
 * resolving the cited source from `mediaById`. Pure so it's unit-testable without
 * a database (lib/queries.ts feeds it real rows).
 */
export function assemblePersonNames(
  rows: PersonNameRecord[],
  mediaById: Map<string, { id: string; title: string; type: DocType }>,
): Map<string, PersonName[]> {
  const byPerson = new Map<string, PersonName[]>();
  for (const r of rows) {
    const list = byPerson.get(r.personId) ?? [];
    list.push({
      id: r.id,
      given: r.given,
      surname: r.surname,
      date: parsePartialDate(r.effectiveDate),
      reason: r.reason,
      relationshipId: r.relationshipId,
      eventId: r.eventId,
      source: r.mediaId ? mediaById.get(r.mediaId) ?? null : null,
      prov: r.prov,
      note: r.note,
      ordinal: r.ordinal,
    });
    byPerson.set(r.personId, list);
  }
  for (const [k, list] of byPerson) byPerson.set(k, sortNames(list));
  return byPerson;
}

export function lifeDates(p: Person): string {
  const b = p.born != null ? p.born : "?";
  if (p.living) return `${b} –`;
  const d = p.died != null ? p.died : "?";
  return `${b} – ${d}`;
}

/**
 * A "year · place" line for a birth/death fact, degrading gracefully when either
 * (or both) is missing — so a sparse record never renders the literal "null".
 */
export function placeAndYear(year: number | null, place: string | null): string {
  if (year != null && place) return `${year} · ${place}`;
  if (year != null) return String(year);
  if (place) return place;
  return "Not recorded";
}

export function docCount(p: Person): number {
  // Prefer the real count of attached media; fall back to the legacy `docs`
  // tally for rows seeded before real upload existed.
  if (p.mediaCount > 0) return p.mediaCount;
  return Object.values(p.docs || {}).reduce<number>((a, b) => a + (b ?? 0), 0);
}

/** Confidence of a single recorded fact. */
export function provOf(p: Person, field: string): ProvenanceStatus {
  const fact = p.prov?.[field];
  if (fact) return fact.status;
  if (field === "name") return docCount(p) > 0 ? "verified" : "unverified";
  if ((field === "born" || field === "died") && p.born && p.born < 1900)
    return "estimated";
  return "unverified";
}

/** The source cited for a recorded fact (when verified), or null. */
export function provSourceOf(p: Person, field: string): string | null {
  return p.prov?.[field]?.source ?? null;
}

/** The linked source-document id cited for a recorded fact, or null. */
export function provMediaIdOf(p: Person, field: string): string | null {
  return p.prov?.[field]?.mediaId ?? null;
}

/** A person's residencies, earliest span first (undated spans sort last). */
export function residencesOf(residences: Residence[], personId: string): Residence[] {
  return residences
    .filter((r) => r.personIds.includes(personId))
    .sort((a, b) => dateSortKey(a.start) - dateSortKey(b.start));
}

/**
 * Compact date label for a residence:
 *   - range: "1952 – 1968" / "1952 – present" / "1952"
 *   - point: "c. 1952" (a single known date — not a move-in, no "present")
 */
export function residenceSpan(r: Residence): string {
  if (r.dateKind === "point") {
    if (r.startYear != null) return `c. ${r.startYear}`;
    return r.start ? "c. ?" : "Dates unknown";
  }
  const start = r.startYear != null ? String(r.startYear) : r.start ? "?" : "";
  if (r.endYear != null) return start ? `${start} – ${r.endYear}` : String(r.endYear);
  if (r.end) return start ? `${start} – ?` : "";
  return start ? `${start} – present` : "Dates unknown";
}

export interface Relation {
  id: string;
  rel?: string;
}
export interface Relations {
  spouse: Relation[];
  parents: Relation[];
  children: Relation[];
  siblings: Relation[];
}

// `relationsOf` is re-exported from ./family-graph (see the top of this file).

export interface ProvSummary {
  key: "disputed" | "sourced" | "needs";
  tone: BadgeTone;
  color: string;
  icon: "alert" | "check" | "ring";
  label: string;
}

/** Roll a person's fact confidences into one record-level summary. */
export function provSummary(p: Person): ProvSummary {
  const fields = ["name", "born", "bornPlace"].concat(
    p.living ? [] : ["died", "diedPlace"]
  );
  const st = fields.map((f) => provOf(p, f));
  if (st.some((s) => s === "disputed"))
    return { key: "disputed", tone: "danger", color: "var(--color-danger)", icon: "alert", label: "Disputed facts" };
  if (st.every((s) => s === "verified"))
    return { key: "sourced", tone: "success", color: "var(--color-success)", icon: "check", label: "Fully sourced" };
  return { key: "needs", tone: "warning", color: "var(--color-warning)", icon: "ring", label: "Needs sources" };
}

/**
 * The archive documents offered by the source pickers — the full archive, so
 * any record can be cited. Search/scroll in the picker handles findability at
 * scale (the old 6-item cap silently hid every document past the sixth).
 */
export function sourceOptions(media: MediaItem[]): SourceOption[] {
  return media.map((m) => ({ id: m.id, label: m.title, type: m.type, year: m.year }));
}
