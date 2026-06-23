/**
 * Timeline — derive the family's life-event timeline from the read model.
 *
 * Like lib/family-graph.ts this is a *pure, unit-tested* derivation (no DB / no
 * server-only) so editing a fact updates the timeline with zero sync code:
 *   - birth / death   ← `person` (bornDate/diedDate)
 *   - marriage/divorce ← spouse `relationship` rows (marriedDate/divorcedDate)
 *   - document        ← dated `media` items
 *   - everything else ← the stored `event` table (StoredEvent[])
 *
 * Births and deaths can cite a source document (a birth certificate / obituary
 * linked to the person); that media is then *consumed* so it doesn't also show
 * up as a standalone `document` event — a certificate appears once, as the
 * birth event's source. Marriage events likewise consume a wedding/marriage
 * media linked to both partners.
 *
 * Ids are deterministic (so React keys + filter state survive refetches) and
 * marriage/divorce ids key on the *sorted partner pair*, matching how the family
 * graph keys unions — the same couple never yields two marriage events.
 */
import type { PartialDate, ProvenanceStatus, DocType } from "@family-archive/ui";
import type { Person, MediaItem, EventType, TimelineEvent, Residence } from "./family-data";
import { sortNames, dateSortKey } from "./family-data";
import type { RelationshipEdge } from "./family-graph";
import { parsePartialDate } from "./dates";

/** A stored `event` row plus its linked people — the builder's input shape. */
export interface StoredEvent {
  id: string;
  type: EventType;
  title: string;
  /** Canonical partial-date string ("YYYY" / "YYYY-MM" / "YYYY-MM-DD"). */
  date: string | null;
  place: string | null;
  prov: ProvenanceStatus;
  mediaId: string | null;
  people: string[];
}

/** Display metadata per event type — label, icon (an Icon.tsx glyph name), token colour. */
export const EVENT_META: Record<EventType, { label: string; icon: string; color: string }> = {
  birth: { label: "Birth", icon: "birth", color: "var(--color-success)" },
  death: { label: "Death", icon: "death", color: "var(--color-muted)" },
  marriage: { label: "Marriage", icon: "heart", color: "var(--color-primary)" },
  divorce: { label: "Divorce", icon: "divorce", color: "var(--color-danger)" },
  namechange: { label: "Name change", icon: "edit", color: "var(--color-accent)" },
  document: { label: "Document", icon: "gallery", color: "var(--color-accent)" },
  immigration: { label: "Immigration", icon: "ship", color: "var(--color-accent)" },
  military: { label: "Military", icon: "shield", color: "var(--color-warning)" },
  education: { label: "Education", icon: "cap", color: "var(--doc-article)" },
  career: { label: "Career", icon: "briefcase", color: "var(--doc-certificate)" },
  residence: { label: "Residence", icon: "home", color: "var(--doc-other)" },
  religious: { label: "Religious", icon: "church", color: "var(--doc-obituary)" },
  other: { label: "Other", icon: "calendar", color: "var(--color-muted)" },
};

/** Display order for the filter legend + chips. */
export const TIMELINE_TYPE_ORDER: EventType[] = [
  "birth",
  "death",
  "marriage",
  "divorce",
  "namechange",
  "immigration",
  "military",
  "education",
  "career",
  "residence",
  "religious",
  "document",
  "other",
];

/**
 * The event types a user can *add* by hand on the event dialog. Residence is a
 * first-class span (the `residence` table + its own dialog), not a point event,
 * so it isn't here — though it stays in `EVENT_META`/`TIMELINE_TYPE_ORDER` so its
 * derived span events still render + filter on the timeline.
 */
export const STORED_EVENT_TYPES: EventType[] = [
  "immigration",
  "military",
  "education",
  "career",
  "religious",
  "other",
];

export function meta(type: EventType): { label: string; icon: string; color: string } {
  return EVENT_META[type] ?? EVENT_META.other;
}

const typeRank = (t: EventType): number => {
  const i = TIMELINE_TYPE_ORDER.indexOf(t);
  return i === -1 ? TIMELINE_TYPE_ORDER.length : i;
};

const firstWord = (given: string): string => given.split(" ")[0];

const yearDate = (year: number): PartialDate => ({ precision: "year", year, month: null, day: null });

/** Chronological order, with a deterministic tiebreak so the same input is stable. */
export function byDate(a: TimelineEvent, b: TimelineEvent): number {
  if (a.sortKey !== b.sortKey) return a.sortKey - b.sortKey;
  const r = typeRank(a.type) - typeRank(b.type);
  if (r !== 0) return r;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

function mk(
  partial: Omit<TimelineEvent, "sortKey"> & { sortKey?: number },
): TimelineEvent {
  return { ...partial, sortKey: partial.sortKey ?? dateSortKey(partial.date) };
}

/**
 * Build the full, sorted timeline from the read model. The order of the steps
 * matters: birth/death sources are resolved first so the media they consume is
 * excluded from the standalone `document` events.
 */
export function buildTimeline(input: {
  people: Record<string, Person>;
  relationships: RelationshipEdge[];
  media: MediaItem[];
  residences?: Residence[];
  events: StoredEvent[];
}): TimelineEvent[] {
  const { people, relationships, media, residences = [], events } = input;
  const out: TimelineEvent[] = [];
  const consumed = new Set<string>(); // media ids used as a source (no standalone event)

  const mediaById = new Map(media.map((m) => [m.id, m]));
  const sourceOf = (id: string | null | undefined): TimelineEvent["source"] => {
    if (!id) return null;
    const m = mediaById.get(id);
    return m ? { id: m.id, title: m.title, type: m.type } : null;
  };

  // ── 1. Birth / death — derived from each person ──────────────────────────
  for (const p of Object.values(people)) {
    if (p.born != null) {
      const src = media.find((m) => m.people.includes(p.id) && /\bbirth\b/i.test(m.title)) ?? null;
      if (src) consumed.add(src.id);
      out.push(
        mk({
          id: `b-${p.id}`,
          type: "birth",
          date: p.bornDate ?? yearDate(p.born),
          title: `${firstWord(p.given)} ${p.surname} was born`,
          place: p.bornPlace,
          people: [p.id],
          prov: factProv(p, "born"),
          source: src ? { id: src.id, title: src.title, type: src.type } : null,
          auto: true,
        }),
      );
    }
    if (!p.living && p.died != null) {
      const src = media.find((m) => m.people.includes(p.id) && m.type === "obituary") ?? null;
      if (src) consumed.add(src.id);
      out.push(
        mk({
          id: `d-${p.id}`,
          type: "death",
          date: p.diedDate ?? yearDate(p.died),
          title: `${firstWord(p.given)} ${p.surname} died`,
          place: p.diedPlace,
          people: [p.id],
          prov: factProv(p, "died"),
          source: src ? { id: src.id, title: src.title, type: src.type } : null,
          auto: true,
        }),
      );
    }
  }

  // ── 2. Marriage / divorce — derived from spouse edges (deduped by pair) ───
  const seenPair = new Set<string>();
  for (const r of relationships) {
    if (r.kind !== "spouse") continue;
    const [a, b] = [r.personId, r.relatedId].sort();
    const pa = people[a];
    const pb = people[b];
    if (!pa || !pb) continue;
    const pairKey = `${a}__${b}`;
    if (seenPair.has(pairKey)) continue;
    seenPair.add(pairKey);

    const marr = parsePartialDate(r.marriedDate);
    if (marr) {
      // Prefer the recorded provenance + linked source; otherwise fall back to a
      // wedding/marriage document linked to both partners as the cited source.
      const heuristic =
        media.find(
          (m) => m.people.includes(a) && m.people.includes(b) && /\b(marri|wedding)/i.test(m.title),
        ) ?? null;
      const src = r.marriedSource ?? (heuristic ? { id: heuristic.id, title: heuristic.title, type: heuristic.type } : null);
      if (src) consumed.add(src.id);
      out.push(
        mk({
          id: `m-${pairKey}`,
          type: "marriage",
          date: marr,
          title: `${firstWord(pa.given)} & ${firstWord(pb.given)} married`,
          place: null,
          people: [a, b],
          prov: r.marriedProv ?? (src ? "verified" : "unverified"),
          source: src,
          auto: true,
        }),
      );
    }
    const div = parsePartialDate(r.divorcedDate);
    if (r.status === "divorced" && div) {
      const dsrc = r.divorcedSource ?? null;
      if (dsrc) consumed.add(dsrc.id);
      out.push(
        mk({
          id: `dv-${pairKey}`,
          type: "divorce",
          date: div,
          title: `${firstWord(pa.given)} & ${firstWord(pb.given)} divorced`,
          place: null,
          people: [a, b],
          prov: r.divorcedProv ?? "unverified",
          source: dsrc,
          auto: true,
        }),
      );
    }
  }

  // A media item cited as a stored event's source is shown via that event, so
  // it shouldn't also appear as a standalone document event.
  for (const e of events) if (e.mediaId) consumed.add(e.mediaId);

  // ── 3. Document events — dated media not already cited as a source ───────
  for (const m of media) {
    if (consumed.has(m.id)) continue;
    if (m.year == null || m.year <= 0) continue;
    out.push(
      mk({
        id: `me-${m.id}`,
        type: "document",
        date: yearDate(m.year),
        title: m.title,
        place: null,
        people: m.people,
        prov: m.type === "certificate" || m.type === "obituary" ? "verified" : "unverified",
        source: { id: m.id, title: m.title, type: m.type },
        auto: true,
      }),
    );
  }

  // ── 4. Stored custom events ──────────────────────────────────────────────
  for (const e of events) {
    out.push(
      mk({
        id: `ev-${e.id}`,
        type: e.type,
        title: e.title,
        date: parsePartialDate(e.date),
        place: e.place,
        people: e.people,
        prov: e.prov,
        source: sourceOf(e.mediaId),
        auto: false,
      }),
    );
  }

  // ── 4b. Residence spans — derived from the residence table ───────────────
  // A residence is a *span* (start → optional end), not a point: it carries an
  // `endDate` the views render as a bar. Marked `auto` (it's edited through the
  // residence dialog, not the event dialog).
  for (const r of residences) {
    const p = people[r.personId];
    if (!p) continue;
    if (r.start == null && r.end == null) continue; // nothing to place on the axis
    out.push(
      mk({
        id: `res-${r.id}`,
        type: "residence",
        date: r.start ?? r.end,
        endDate: r.end,
        title: `${firstWord(p.given)} ${p.surname} lived in ${r.place}`,
        place: r.place,
        people: [r.personId],
        prov: r.prov,
        source: r.source,
        auto: true,
      }),
    );
  }

  // ── 5. Name changes — derived per person_name row, skipping the birth name ──
  // Runs last so the marriage/immigration events a change can attach to already
  // exist in `out`. A change linked to its causing event nests inside it (no
  // standalone row); an unlinked one — or a link whose event wasn't emitted —
  // becomes its own `namechange` event so it never disappears.
  const byId = new Map(out.map((e) => [e.id, e]));
  const pairByRelId = new Map<string, string>();
  for (const r of relationships) {
    if (r.kind === "spouse") pairByRelId.set(r.id, [r.personId, r.relatedId].sort().join("__"));
  }
  for (const p of Object.values(people)) {
    const sorted = sortNames(p.names ?? []);
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const cur = sorted[i];
      const ev = mk({
        id: `nm-${cur.id}`,
        type: "namechange",
        date: cur.date,
        title: `${firstWord(prev.given)} ${prev.surname} became ${firstWord(cur.given)} ${cur.surname}`,
        place: null,
        people: [p.id],
        prov: cur.prov,
        source: cur.source,
        auto: true,
      });
      let target: TimelineEvent | undefined;
      if (cur.relationshipId) {
        const pair = pairByRelId.get(cur.relationshipId);
        if (pair) target = byId.get(`m-${pair}`);
      } else if (cur.eventId) {
        target = byId.get(`ev-${cur.eventId}`);
      }
      if (target) (target.nested ??= []).push(ev);
      else out.push(ev);
    }
  }

  return out.sort(byDate);
}

/** A recorded fact's confidence (born/died), defaulting like lib/family-data's provOf. */
function factProv(p: Person, field: "born" | "died"): ProvenanceStatus {
  const fact = p.prov?.[field];
  if (fact) return fact.status;
  if (p.born != null && p.born < 1900) return "estimated";
  return "unverified";
}

/** Every event a person takes part in (already chronologically sorted). */
export function eventsOf(events: TimelineEvent[], personId: string): TimelineEvent[] {
  return events.filter((e) => e.people.includes(personId));
}

export function yearOf(e: TimelineEvent): number | null {
  return e.date?.year ?? null;
}

export function decadeOf(e: TimelineEvent): number | null {
  const y = yearOf(e);
  return y == null ? null : Math.floor(y / 10) * 10;
}

const MONTHS = [
  "",
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** Human date string from the event's PartialDate ("12 June 1947" / "June 1947" / "1947"). */
export function fmtDate(e: TimelineEvent): string {
  const d = e.date;
  if (!d || d.year == null) return "";
  if (d.month == null) return String(d.year);
  const mo = MONTHS[d.month] ?? "";
  if (d.day == null) return `${mo} ${d.year}`;
  return `${d.day} ${mo} ${d.year}`;
}

/** Year span across a set of events, for axis scaling (defaults when empty). */
export function yearSpan(events: TimelineEvent[]): [number, number] {
  let min = Infinity;
  let max = -Infinity;
  for (const e of events) {
    const y = yearOf(e);
    if (y == null) continue;
    if (y < min) min = y;
    if (y > max) max = y;
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [1900, 2025];
  return [min, max];
}
