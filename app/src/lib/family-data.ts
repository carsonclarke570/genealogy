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
} from "@family-archive/ui";
import type { FamilyGraph, RelationshipEdge } from "./family-graph";

export type { FamilyGraph, RelationshipEdge } from "./family-graph";
// relationsOf is derived straight from the raw edges; it lives with the graph
// model but is re-exported here so the UI keeps importing it from one place.
export { relationsOf } from "./family-graph";

export type Sex = "m" | "f" | "o";

/** A recorded fact's confidence, plus the source cited when it's verified. */
export interface ProvFact {
  status: ProvenanceStatus;
  source?: string | null;
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
}

export interface MediaItem {
  id: string;
  type: DocType;
  title: string;
  year: number;
  people: string[];
  /** Stored MIME type once a file is attached; null for fileless (legacy) rows. */
  mimeType: string | null;
  /** Whether an actual file is stored for this item (filePath is set). */
  hasFile: boolean;
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
  | "document"
  // stored in the `event` table
  | "immigration"
  | "military"
  | "education"
  | "career"
  | "residence"
  | "religious"
  | "other";

export interface TimelineEvent {
  /** Deterministic synthetic id (`b-`/`d-`/`m-`/`dv-`/`me-`/`ev-` prefixed). */
  id: string;
  type: EventType;
  /** Precision-aware date, or null when only a bucket is known. */
  date: PartialDate | null;
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
}

/** The full in-memory snapshot the UI renders from (assembled in lib/queries.ts). */
export interface Dataset {
  people: Record<string, Person>;
  /** The derived family-graph DAG that drives the Explorer layout + relations. */
  graph: FamilyGraph;
  /** Raw relationship edges (with ids) — the edit form removes specific ones. */
  relationships: RelationshipEdge[];
  media: MediaItem[];
  /** The merged, chronologically-sorted life-event timeline (derived + stored). */
  events: TimelineEvent[];
}

export function fullName(p: Person): string {
  return `${p.given} ${p.surname}`;
}

/** "Eleanor Margaret Rivers" → "Eleanor Rivers"; first given + surname for tree cells. */
export function shortName(p: Person): string {
  return `${p.given.split(" ")[0]} ${p.surname}`;
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

/** The archive documents offered by the SourceCite dialog. */
export function sourceOptions(media: MediaItem[]): SourceOption[] {
  return media.slice(0, 6).map((m) => ({ id: m.id, label: m.title, type: m.type }));
}
