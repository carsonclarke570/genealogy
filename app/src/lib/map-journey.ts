/**
 * Family Map model — derive each person's geographic *journey* from facts the
 * archive already holds, and aggregate journeys into migration corridors.
 *
 * Pure and unit-tested (map-journey.test.ts), like lib/timeline.ts and
 * lib/family-graph.ts — it reads the in-memory {@link Dataset} (people + the
 * derived timeline `events` + the coordinate gazetteer `places`) and never
 * touches the DB, so the Family Map updates with no sync when a fact is edited.
 *
 * A journey is the ordered path of places a person touched: birth → located
 * life-events / residences (oldest → newest) → death. An overland move is a
 * `move` edge; an ocean crossing (endpoints on opposite Atlantic sides, judged
 * from coordinates) is a `voyage`; a concurrently-held second home forks the
 * path as a `branch`. Undated stops are kept aside and surfaced only on request.
 *
 * Ported from the design prototype (hf/geo.js), with two deliberate changes for
 * the real data model: coordinates come from the {@link Dataset.places}
 * gazetteer (not a hardcoded table), and ocean crossings are judged from
 * coordinates (not hand-maintained region tags), so it keeps working for
 * arbitrary new places.
 */
import type { Dataset, Person, PlaceCoord, TimelineEvent } from "./family-data";
import { normalizePlace, hashStr } from "./place-key";

// ── nodes / edges ─────────────────────────────────────────────────────────────

export interface MapNode {
  key: string;
  /** Canonical gazetteer label (the join key for clustering / corridors). */
  placeId: string;
  place: string;
  /** A more-specific sub-locality when the raw string was finer than the city. */
  sub: string | null;
  lat: number;
  lng: number;
  firstYear: number | null;
  lastYear: number | null;
  dated: boolean;
  kind: "birth" | "death" | "life" | "undated";
  events: TimelineEvent[];
  surname: string;
  voyageStart?: boolean;
  voyageEnd?: boolean;
  branch?: boolean;
}

export interface MapEdge {
  from: string;
  to: string;
  kind: "move" | "voyage" | "branch";
  year: number | null;
  dashed?: boolean;
  undated?: boolean;
}

export interface Journey {
  nodes: MapNode[];
  edges: MapEdge[];
}

export interface JourneyOpts {
  includeUndated?: boolean;
}

// ── gazetteer resolution ──────────────────────────────────────────────────────

/** A coordinate resolved for a place string, plus any finer sub-locality. */
interface Resolved {
  place: string;
  sub: string | null;
  lat: number;
  lng: number;
}

// Short forms that appear in event place strings → canonical gazetteer labels
// (keyed by the normalised short form). Mirrors the prototype's ALIAS.
const ALIAS: Record<string, string> = {
  boston: "Boston, MA",
  liverpool: "Liverpool, England",
  cambridge: "Cambridge, MA",
};

/** A resolved gazetteer entry for one candidate key, or null. */
function lookup(key: string, places: Record<string, PlaceCoord>): PlaceCoord | null {
  const norm = normalizePlace(key);
  if (!norm) return null;
  const aliased = ALIAS[norm] ? normalizePlace(ALIAS[norm]) : norm;
  const hit = places[aliased] ?? places[norm];
  return hit && hit.status === "resolved" && hit.lat != null && hit.lng != null ? hit : null;
}

/**
 * Nudge a point off the city centroid by a small, *stable* amount when the raw
 * string is more specific than the matched city (a street / neighbourhood), so
 * co-located people separate as you zoom in instead of stacking forever.
 */
function withJitter(raw: string, hit: PlaceCoord): Resolved {
  const lat = hit.lat as number;
  const lng = hit.lng as number;
  if (normalizePlace(raw) === hit.normalized) {
    return { place: hit.label, sub: null, lat, lng };
  }
  const h = hashStr(raw);
  const ang = ((h % 360) * Math.PI) / 180;
  const rad = 0.011 + (((h >>> 9) & 0xff) / 0xff) * 0.022; // ~1.2–3.6 km
  // The leading part of the raw string not covered by the matched label.
  const idx = raw.toLowerCase().indexOf(hit.label.toLowerCase());
  const subRaw = idx > 0 ? raw.slice(0, idx) : "";
  const sub = subRaw.replace(/[,\s]+$/, "").trim() || null;
  return {
    place: hit.label,
    sub,
    lat: lat + Math.sin(ang) * rad,
    lng: lng + (Math.cos(ang) * rad) / Math.max(0.2, Math.cos((lat * Math.PI) / 180)),
  };
}

/**
 * Resolve a place string to a coordinate by progressively dropping leading
 * locality parts: "Beacon Hill, Boston, MA" → tries the whole string, then
 * "Boston, MA". Returns null when nothing matches (→ surfaces in unmappedPlaces).
 */
export function resolvePlace(
  placeStr: string | null | undefined,
  places: Record<string, PlaceCoord>,
): Resolved | null {
  if (!placeStr) return null;
  const raw = placeStr.trim();
  const direct = lookup(raw, places);
  if (direct) return withJitter(raw, direct);
  const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
  for (let i = 0; i < parts.length; i++) {
    for (const span of [parts.length - i, 2, 1]) {
      const key = parts.slice(i, i + span).join(", ");
      const hit = lookup(key, places);
      if (hit) return withJitter(raw, hit);
    }
  }
  return null;
}

// ── ocean crossings (from coordinates) ────────────────────────────────────────

/**
 * Which side of the Atlantic a coordinate sits on, split at the mid-Atlantic
 * ridge (~30°W). A move between the two sides reads as a voyage regardless of why
 * the person travelled. Coordinate-based so it needs no per-place region table.
 */
function atlanticSide(lng: number): "old" | "new" {
  return lng < -30 ? "new" : "old";
}

/** Whether a move between two coordinates crosses the ocean (opposite sides). */
export function crossesOcean(a: { lng: number }, b: { lng: number }): boolean {
  return atlanticSide(a.lng) !== atlanticSide(b.lng);
}

// ── journey derivation ────────────────────────────────────────────────────────

const yearOf = (e: TimelineEvent): number | null => e.date?.year ?? null;
const endYearOf = (e: TimelineEvent): number | null => e.endDate?.year ?? null;
const firstWord = (s: string): string => s.split(" ")[0];

/** The place strings an event contributes (an immigration "A → B" carries two). */
export function placeStringsOf(ev: TimelineEvent): string[] {
  if (ev.type === "immigration" && /[→>]/.test(ev.place ?? "")) {
    return (ev.place as string).split(/→|>/).map((s) => s.trim()).filter(Boolean);
  }
  return ev.place ? [ev.place] : [];
}

interface Stop {
  g: Resolved;
  year: number | null;
  ev: TimelineEvent;
  voyageStart?: boolean;
  voyageEnd?: boolean;
}

/** Resolved, time-ordered stops for one person (dated first, then undated). */
function rawStops(
  events: TimelineEvent[],
  places: Record<string, PlaceCoord>,
): Stop[] {
  const dated: Stop[] = [];
  const undated: Stop[] = [];
  for (const ev of events) {
    const y = yearOf(ev);
    if (ev.type === "immigration" && /[→>]/.test(ev.place ?? "")) {
      const parts = (ev.place as string).split(/→|>/).map((s) => s.trim());
      const a = resolvePlace(parts[0], places);
      const b = resolvePlace(parts[1], places);
      if (a) (y == null ? undated : dated).push({ g: a, year: y, ev, voyageStart: true });
      if (b) (y == null ? undated : dated).push({ g: b, year: y == null ? null : y + 0.01, ev, voyageEnd: true });
      continue;
    }
    const g = resolvePlace(ev.place, places);
    if (!g) continue;
    (y == null ? undated : dated).push({ g, year: y, ev });
  }
  dated.sort((a, b) => (a.year as number) - (b.year as number));
  return [...dated, ...undated];
}

/**
 * Build one person's journey: birth → located events / residences → death, with
 * move/voyage edges along the spine, branch edges for concurrently-held homes,
 * and (optionally) undated stops.
 */
export function journeyOf(
  personId: string,
  dataset: Pick<Dataset, "people" | "events" | "places">,
  opts: JourneyOpts = {},
): Journey {
  const p = dataset.people[personId];
  if (!p) return { nodes: [], edges: [] };
  const surname = p.surname;
  const personEvents = dataset.events.filter((e) => e.people.includes(personId));
  const stops = rawStops(personEvents, dataset.places).filter((s) => opts.includeUndated || s.year != null);

  // Collapse consecutive stops at the same place into one node.
  const nodes: MapNode[] = [];
  for (const s of stops) {
    const prev = nodes[nodes.length - 1];
    const dated = s.year != null;
    if (
      prev &&
      prev.placeId === s.g.place &&
      prev.dated === dated &&
      !s.voyageEnd &&
      !prev.voyageStart
    ) {
      if (dated) prev.lastYear = Math.floor(s.year as number);
      prev.events.push(s.ev);
      if (s.ev.type === "death") prev.kind = "death";
      continue;
    }
    const fy = dated ? Math.floor(s.year as number) : null;
    nodes.push({
      key: `${personId}:${nodes.length}`,
      placeId: s.g.place,
      place: s.g.place,
      sub: s.g.sub,
      lat: s.g.lat,
      lng: s.g.lng,
      firstYear: fy,
      lastYear: fy,
      dated,
      kind: dated
        ? s.ev.type === "birth"
          ? "birth"
          : s.ev.type === "death"
            ? "death"
            : "life"
        : "undated",
      events: [s.ev],
      surname,
      voyageStart: s.voyageStart,
      voyageEnd: s.voyageEnd,
    });
  }

  // Spine edges between consecutive *dated* nodes (oldest → newest).
  const edges: MapEdge[] = [];
  const datedNodes = nodes.filter((n) => n.dated);
  for (let i = 1; i < datedNodes.length; i++) {
    const a = datedNodes[i - 1];
    const b = datedNodes[i];
    const voyage = b.voyageEnd === true || crossesOcean(a, b);
    edges.push({ from: a.key, to: b.key, kind: voyage ? "voyage" : "move", year: b.firstYear });
  }

  // Branch: a residence whose span overlaps an earlier residence still in
  // progress is a concurrently-held second home — it forks off the spine node
  // active when it began, instead of reading as a sequential move.
  const branchNodes = deriveBranches(personEvents, dataset.places, datedNodes, personId, surname);
  for (const { node, anchorKey } of branchNodes) {
    nodes.push(node);
    edges.push({ from: anchorKey, to: node.key, kind: "branch", year: node.firstYear });
  }

  // Undated stops hang off the earliest dated node as dashed branches.
  if (opts.includeUndated) {
    const anchor = datedNodes[0];
    for (const n of nodes) {
      if (n.dated || n.kind !== "undated") continue;
      if (anchor) edges.push({ from: anchor.key, to: n.key, kind: "branch", year: null, dashed: true, undated: true });
    }
  }

  return { nodes, edges };
}

/**
 * Detect concurrently-held homes from overlapping residence spans. A residence
 * event carries a start (`date`) and end (`endDate`) year; when one begins before
 * another's recorded spine residence has ended, the later one is a branch
 * anchored at the node in progress when it started. Pure helper for journeyOf.
 */
function deriveBranches(
  events: TimelineEvent[],
  places: Record<string, PlaceCoord>,
  datedNodes: MapNode[],
  personId: string,
  surname: string,
): { node: MapNode; anchorKey: string }[] {
  const spans = events
    .filter((e) => e.type === "residence" && e.endDate != null && yearOf(e) != null)
    .map((e) => ({ ev: e, start: yearOf(e) as number, end: endYearOf(e) as number }))
    .sort((a, b) => a.start - b.start);
  if (spans.length < 2) return [];

  const out: { node: MapNode; anchorKey: string }[] = [];
  let bi = 0;
  for (let i = 1; i < spans.length; i++) {
    const cur = spans[i];
    // Does it overlap any earlier span that is still open when it begins?
    const overlapsEarlier = spans
      .slice(0, i)
      .some((prev) => prev.start <= cur.start && prev.end > cur.start);
    if (!overlapsEarlier) continue;
    const g = resolvePlace(cur.ev.place, places);
    if (!g) continue;
    // Anchor at the dated spine node in progress when the branch began.
    const anchor =
      [...datedNodes].reverse().find((n) => n.firstYear != null && n.firstYear <= cur.start) ??
      datedNodes[datedNodes.length - 1];
    if (!anchor) continue;
    out.push({
      anchorKey: anchor.key,
      node: {
        key: `${personId}:br${bi++}`,
        placeId: g.place,
        place: g.place,
        sub: g.sub,
        lat: g.lat,
        lng: g.lng,
        firstYear: cur.start,
        lastYear: cur.end,
        dated: true,
        kind: "life",
        events: [cur.ev],
        surname,
        branch: true,
      },
    });
  }
  return out;
}

// ── selection / aggregation ───────────────────────────────────────────────────

export interface MapFilter {
  lineage?: string | null;
  personId?: string | null;
}

/** People matching a filter (a single person, or everyone in a lineage / all). */
export function selectPeople(dataset: Pick<Dataset, "people">, filter: MapFilter = {}): string[] {
  if (filter.personId) return dataset.people[filter.personId] ? [filter.personId] : [];
  let ids = Object.keys(dataset.people);
  if (filter.lineage) ids = ids.filter((id) => dataset.people[id].surname === filter.lineage);
  return ids;
}

/** People with at least one mappable stop (for empty states / counts). */
export function mappableCount(dataset: Pick<Dataset, "people" | "events" | "places">): number {
  return Object.keys(dataset.people).filter((id) => journeyOf(id, dataset).nodes.length > 0).length;
}

export interface Corridor {
  from: { place: string; lat: number; lng: number };
  to: { place: string; lat: number; lng: number };
  voyage: boolean;
  count: number;
  people: string[];
}

export interface CorridorOpts {
  cutoff?: number;
  includeUndated?: boolean;
}

/**
 * Aggregate every per-person move into shared origin → destination flows, so a
 * crowded archive reads as a handful of corridors (width = how many people made
 * that move) instead of thousands of overlapping arcs.
 */
export function corridors(
  dataset: Pick<Dataset, "people" | "events" | "places">,
  ids: string[],
  opts: CorridorOpts = {},
): Corridor[] {
  const m = new Map<
    string,
    { from: Corridor["from"]; to: Corridor["to"]; voyage: boolean; people: Set<string> }
  >();
  for (const id of ids) {
    const j = journeyOf(id, dataset, { includeUndated: opts.includeUndated });
    const byKey: Record<string, MapNode> = {};
    j.nodes.forEach((n) => (byKey[n.key] = n));
    for (const ed of j.edges) {
      if (ed.undated && !opts.includeUndated) continue;
      const a = byKey[ed.from];
      const b = byKey[ed.to];
      if (!a || !b) continue;
      if (opts.cutoff != null && ed.year != null && ed.year > opts.cutoff) continue;
      const k = `${a.placeId}>${b.placeId}`;
      let c = m.get(k);
      if (!c) {
        c = {
          from: { place: a.placeId, lat: a.lat, lng: a.lng },
          to: { place: b.placeId, lat: b.lat, lng: b.lng },
          voyage: false,
          people: new Set(),
        };
        m.set(k, c);
      }
      c.people.add(id);
      if (ed.kind === "voyage") c.voyage = true;
    }
  }
  return [...m.values()].map((c) => ({
    from: c.from,
    to: c.to,
    voyage: c.voyage || crossesOcean(c.from, c.to),
    count: c.people.size,
    people: [...c.people],
  }));
}

/** Lat/lng bounds `[[s,w],[n,e]]` across a set of journeys, or null if empty. */
export function bounds(journeys: Journey[]): [[number, number], [number, number]] | null {
  let n = -Infinity;
  let s = Infinity;
  let e = -Infinity;
  let w = Infinity;
  let any = false;
  for (const j of journeys) {
    for (const nd of j.nodes) {
      any = true;
      n = Math.max(n, nd.lat);
      s = Math.min(s, nd.lat);
      e = Math.max(e, nd.lng);
      w = Math.min(w, nd.lng);
    }
  }
  return any ? [[s, w], [n, e]] : null;
}

/** Year range across every dated stop in the archive (for the time scrubber). */
export function yearSpan(
  dataset: Pick<Dataset, "people" | "events" | "places">,
): { min: number; max: number } {
  let mn = Infinity;
  let mx = -Infinity;
  for (const id of Object.keys(dataset.people)) {
    for (const nd of journeyOf(id, dataset).nodes) {
      if (nd.dated && nd.firstYear != null) {
        mn = Math.min(mn, nd.firstYear);
        mx = Math.max(mx, nd.lastYear ?? nd.firstYear);
      }
    }
  }
  if (!Number.isFinite(mn)) return { min: 1880, max: 2025 };
  return { min: Math.floor(mn / 10) * 10, max: Math.ceil(mx) };
}

// ── lineages (by surname) ─────────────────────────────────────────────────────

// Surnames seeded with a dedicated theme token (lib/styles tokens.css). Any other
// surname falls back to a stable hashed hue, so the palette scales to an archive
// of arbitrarily many family names without hand-tuning.
const LINE_TOKENS = new Set(["rivers", "bain", "tran", "reed", "cole"]);

/** The CSS class suffix for a surname's lineage colour (`other` when unseeded). */
export function lineCls(surname: string | null | undefined): string {
  const s = (surname ?? "").toLowerCase();
  return LINE_TOKENS.has(s) ? s : "other";
}

/** A CSS colour for a surname — its theme token, or a stable hashed hue. */
export function lineColorFor(surname: string | null | undefined): string {
  if (!surname) return "var(--fa-line-other)";
  const s = surname.toLowerCase();
  if (LINE_TOKENS.has(s)) return `var(--fa-line-${s})`;
  const hue = hashStr(surname) % 360;
  return `oklch(0.62 0.12 ${hue})`;
}

export function lineColorOf(dataset: Pick<Dataset, "people">, id: string): string {
  const p = dataset.people[id];
  return lineColorFor(p ? p.surname : null);
}

export interface Lineage {
  key: string;
  label: string;
  cls: string;
  color: string;
  count: number;
}

/** Lineages present in the archive, derived from surname counts (largest first). */
export function lineages(dataset: Pick<Dataset, "people">): Lineage[] {
  const counts: Record<string, number> = {};
  for (const id of Object.keys(dataset.people)) {
    const s = dataset.people[id].surname;
    counts[s] = (counts[s] ?? 0) + 1;
  }
  return Object.keys(counts)
    .map((s) => ({ key: s, label: s, cls: lineCls(s), color: lineColorFor(s), count: counts[s] }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

/** The largest lineage's key (the map's default focus), or null if no people. */
export function largestLineage(dataset: Pick<Dataset, "people">): string | null {
  const l = lineages(dataset);
  return l.length ? l[0].key : null;
}

// ── unmapped places ───────────────────────────────────────────────────────────

export interface UnmappedPlace {
  place: string;
  people: string[];
  events: { id: string; title: string; person: string; date: TimelineEvent["date"] }[];
  count: number;
}

/**
 * Every place string in the archive that has no resolved coordinate — so nothing
 * is dropped silently. Drives the map's "Places to locate" pin-drop panel.
 */
export function unmappedPlaces(
  dataset: Pick<Dataset, "people" | "events" | "places">,
): UnmappedPlace[] {
  const out = new Map<string, { place: string; people: Set<string>; events: UnmappedPlace["events"] }>();
  for (const ev of dataset.events) {
    for (const ps of placeStringsOf(ev)) {
      if (!ps || resolvePlace(ps, dataset.places)) continue;
      const o = out.get(ps) ?? { place: ps, people: new Set<string>(), events: [] };
      for (const pid of ev.people) {
        o.people.add(pid);
        o.events.push({ id: ev.id, title: ev.title, person: pid, date: ev.date });
      }
      out.set(ps, o);
    }
  }
  return [...out.values()]
    .map((o) => ({ place: o.place, people: [...o.people], events: o.events, count: o.people.size }))
    .sort((a, b) => b.count - a.count || a.place.localeCompare(b.place));
}

/** Re-export so callers can build labels consistently with the gazetteer. */
export { firstWord };
export type { Person };
