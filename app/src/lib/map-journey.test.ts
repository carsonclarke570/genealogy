import { describe, it, expect } from "vitest";
import {
  journeyOf,
  corridors,
  resolvePlace,
  crossesOcean,
  selectPeople,
  lineages,
  largestLineage,
  lineColorFor,
  unmappedPlaces,
  bounds,
  yearSpan,
  placeStringsOf,
} from "./map-journey";
import { normalizePlace } from "./place-key";
import type { Person, PlaceCoord, TimelineEvent, Dataset } from "./family-data";

// ── factories ──────────────────────────────────────────────────────────────
const person = (id: string, over: Partial<Person> = {}): Person => ({
  id,
  given: over.given ?? `${id[0].toUpperCase()}${id.slice(1)}`,
  surname: over.surname ?? "Rivers",
  maiden: null,
  sex: "o",
  born: over.born ?? 1900,
  bornDate: null,
  bornPlace: over.bornPlace ?? null,
  died: over.died ?? null,
  diedDate: null,
  diedPlace: over.diedPlace ?? null,
  living: over.living ?? false,
  notes: null,
  docs: {},
  mediaCount: 0,
  names: [],
  ...over,
});

const yr = (year: number | null): TimelineEvent["date"] =>
  year == null ? null : { precision: "year", year, month: null, day: null };

let evSeq = 0;
const ev = (over: Partial<TimelineEvent> = {}): TimelineEvent => ({
  id: over.id ?? `e${evSeq++}`,
  type: over.type ?? "residence",
  date: over.date !== undefined ? over.date : yr(1950),
  endDate: over.endDate,
  sortKey: 0,
  title: over.title ?? "An event",
  place: over.place ?? null,
  people: over.people ?? [],
  prov: over.prov ?? "unverified",
  source: over.source ?? null,
  auto: over.auto ?? true,
  ...over,
});

const coord = (label: string, lat: number, lng: number): PlaceCoord => ({
  normalized: normalizePlace(label),
  label,
  lat,
  lng,
  country: null,
  region: null,
  locality: null,
  status: "resolved",
});

const placesMap = (...cs: PlaceCoord[]): Record<string, PlaceCoord> =>
  Object.fromEntries(cs.map((c) => [c.normalized, c]));

// Coordinates used across the tests (subset of the seed gazetteer).
const LIVERPOOL = coord("Liverpool, England", 53.4084, -2.9916);
const BOSTON = coord("Boston, MA", 42.3601, -71.0589);
const CONCORD = coord("Concord, MA", 42.4604, -71.3489);
const SHEFFIELD = coord("Sheffield, England", 53.3811, -1.4701);

const dataset = (people: Person[], events: TimelineEvent[], places: Record<string, PlaceCoord>) =>
  ({ people: Object.fromEntries(people.map((p) => [p.id, p])), events, places }) as Pick<
    Dataset,
    "people" | "events" | "places"
  >;

// ── gazetteer resolution ─────────────────────────────────────────────────────
describe("resolvePlace", () => {
  const places = placesMap(BOSTON, LIVERPOOL);

  it("resolves an exact label", () => {
    expect(resolvePlace("Boston, MA", places)).toMatchObject({ place: "Boston, MA", sub: null });
  });

  it("resolves via the short-form alias (Boston → Boston, MA)", () => {
    expect(resolvePlace("Boston", places)?.place).toBe("Boston, MA");
  });

  it("drops a leading locality to match the city", () => {
    const r = resolvePlace("Beacon Hill, Boston, MA", places);
    expect(r?.place).toBe("Boston, MA");
    expect(r?.sub).toBe("Beacon Hill");
    // jittered off the centroid so finer places separate
    expect(r?.lat).not.toBe(BOSTON.lat);
  });

  it("returns null for an unknown place", () => {
    expect(resolvePlace("Atlantis", places)).toBeNull();
  });

  it("ignores an unresolved gazetteer row", () => {
    const unresolved: PlaceCoord = { ...BOSTON, lat: null, lng: null, status: "unresolved" };
    expect(resolvePlace("Boston, MA", placesMap(unresolved))).toBeNull();
  });
});

describe("crossesOcean", () => {
  it("flags an Atlantic crossing", () => {
    expect(crossesOcean({ lng: LIVERPOOL.lng! }, { lng: BOSTON.lng! })).toBe(true);
  });
  it("does not flag an overland move", () => {
    expect(crossesOcean({ lng: BOSTON.lng! }, { lng: CONCORD.lng! })).toBe(false);
  });
});

// ── journeys ─────────────────────────────────────────────────────────────────
describe("journeyOf", () => {
  const places = placesMap(SHEFFIELD, LIVERPOOL, BOSTON, CONCORD);

  it("orders stops by year and links them with move edges", () => {
    const t = person("t", { surname: "Rivers", bornPlace: "Sheffield, England", diedPlace: "Boston, MA" });
    const events = [
      ev({ id: "b", type: "birth", date: yr(1888), place: "Sheffield, England", people: ["t"] }),
      ev({ id: "r", type: "residence", date: yr(1915), place: "Concord, MA", people: ["t"] }),
      ev({ id: "d", type: "death", date: yr(1971), place: "Boston, MA", people: ["t"] }),
    ];
    const j = journeyOf("t", dataset([t], events, places));
    expect(j.nodes.map((n) => n.place)).toEqual(["Sheffield, England", "Concord, MA", "Boston, MA"]);
    expect(j.nodes[0].kind).toBe("birth");
    expect(j.nodes[2].kind).toBe("death");
    expect(j.edges).toHaveLength(2);
    // Sheffield → Concord crosses the ocean (voyage); Concord → Boston is overland.
    expect(j.edges[0].kind).toBe("voyage");
    expect(j.edges[1].kind).toBe("move");
  });

  it("splits an immigration 'A → B' into two stops with a voyage leg", () => {
    const t = person("t", { bornPlace: "Liverpool, England" });
    const events = [
      ev({ id: "im", type: "immigration", date: yr(1911), place: "Liverpool → Boston", people: ["t"] }),
    ];
    const j = journeyOf("t", dataset([t], events, places));
    expect(j.nodes.map((n) => n.place)).toEqual(["Liverpool, England", "Boston, MA"]);
    expect(j.edges[0].kind).toBe("voyage");
  });

  it("collapses consecutive stops at the same place", () => {
    const t = person("t");
    const events = [
      ev({ id: "a", type: "residence", date: yr(1950), place: "Boston, MA", people: ["t"] }),
      ev({ id: "b", type: "career", date: yr(1955), place: "Boston, MA", people: ["t"] }),
    ];
    const j = journeyOf("t", dataset([t], events, places));
    expect(j.nodes).toHaveLength(1);
    expect(j.nodes[0].firstYear).toBe(1950);
    expect(j.nodes[0].lastYear).toBe(1955);
    expect(j.nodes[0].events).toHaveLength(2);
  });

  it("excludes undated stops unless asked", () => {
    const t = person("t");
    const events = [
      ev({ id: "a", type: "residence", date: yr(1950), place: "Boston, MA", people: ["t"] }),
      ev({ id: "u", type: "residence", date: null, place: "Concord, MA", people: ["t"] }),
    ];
    expect(journeyOf("t", dataset([t], events, places)).nodes).toHaveLength(1);
    const withU = journeyOf("t", dataset([t], events, places), { includeUndated: true });
    expect(withU.nodes).toHaveLength(2);
    expect(withU.nodes.find((n) => n.place === "Concord, MA")?.dated).toBe(false);
    expect(withU.edges.some((e) => e.undated)).toBe(true);
  });

  it("forks a concurrently-held home as a branch edge", () => {
    const t = person("t");
    const events = [
      ev({ id: "home", type: "residence", date: yr(1950), endDate: yr(1980), place: "Boston, MA", people: ["t"] }),
      ev({ id: "lake", type: "residence", date: yr(1960), endDate: yr(1965), place: "Concord, MA", people: ["t"] }),
    ];
    const j = journeyOf("t", dataset([t], events, places));
    const branch = j.edges.find((e) => e.kind === "branch");
    expect(branch).toBeTruthy();
    expect(j.nodes.find((n) => n.branch)?.place).toBe("Concord, MA");
  });

  it("returns nothing for an unknown person", () => {
    expect(journeyOf("ghost", dataset([], [], places)).nodes).toHaveLength(0);
  });
});

// ── corridors ────────────────────────────────────────────────────────────────
describe("corridors", () => {
  const places = placesMap(LIVERPOOL, BOSTON, CONCORD);

  it("aggregates shared moves and counts the people on each", () => {
    const a = person("a");
    const b = person("b");
    const events = [
      ev({ id: "a1", type: "immigration", date: yr(1911), place: "Liverpool → Boston", people: ["a"] }),
      ev({ id: "b1", type: "immigration", date: yr(1912), place: "Liverpool → Boston", people: ["b"] }),
    ];
    const cs = corridors(dataset([a, b], events, places), ["a", "b"]);
    const liv = cs.find((c) => c.from.place === "Liverpool, England" && c.to.place === "Boston, MA");
    expect(liv?.count).toBe(2);
    expect(liv?.voyage).toBe(true);
  });

  it("honours the year cutoff", () => {
    const a = person("a");
    const events = [
      ev({ id: "a1", type: "residence", date: yr(1950), place: "Boston, MA", people: ["a"] }),
      ev({ id: "a2", type: "residence", date: yr(1980), place: "Concord, MA", people: ["a"] }),
    ];
    const ds = dataset([a], events, places);
    expect(corridors(ds, ["a"], { cutoff: 2000 })).toHaveLength(1);
    expect(corridors(ds, ["a"], { cutoff: 1960 })).toHaveLength(0);
  });
});

// ── selection, lineages, unmapped, bounds ────────────────────────────────────
describe("selection + lineages", () => {
  const a = person("a", { surname: "Rivers" });
  const b = person("b", { surname: "Bain" });
  const c = person("c", { surname: "Rivers" });
  const ds = dataset([a, b, c], [], {});

  it("selects by lineage and by person", () => {
    expect(selectPeople(ds, { lineage: "Rivers" }).sort()).toEqual(["a", "c"]);
    expect(selectPeople(ds, { personId: "b" })).toEqual(["b"]);
    expect(selectPeople(ds).length).toBe(3);
  });

  it("orders lineages by size and picks the largest", () => {
    const ls = lineages(ds);
    expect(ls[0]).toMatchObject({ key: "Rivers", count: 2 });
    expect(largestLineage(ds)).toBe("Rivers");
  });

  it("colours seeded lines with a token and others with a hashed hue", () => {
    expect(lineColorFor("Rivers")).toBe("var(--fa-line-rivers)");
    expect(lineColorFor("Zylbersztajn")).toMatch(/^oklch\(/);
    expect(lineColorFor(null)).toBe("var(--fa-line-other)");
  });
});

describe("unmappedPlaces", () => {
  it("lists archive places with no resolved coordinate", () => {
    const a = person("a");
    const events = [
      ev({ id: "ok", type: "residence", date: yr(1950), place: "Boston, MA", people: ["a"] }),
      ev({ id: "miss", type: "career", date: yr(1960), place: "Nowheresville", people: ["a"] }),
    ];
    const um = unmappedPlaces(dataset([a], events, placesMap(BOSTON)));
    expect(um.map((u) => u.place)).toEqual(["Nowheresville"]);
    expect(um[0].people).toEqual(["a"]);
  });
});

describe("bounds + yearSpan + placeStringsOf", () => {
  it("computes lat/lng bounds across journeys", () => {
    const t = person("t");
    const events = [
      ev({ id: "a", type: "birth", date: yr(1888), place: "Liverpool, England", people: ["t"] }),
      ev({ id: "b", type: "death", date: yr(1971), place: "Boston, MA", people: ["t"] }),
    ];
    const j = journeyOf("t", dataset([t], events, placesMap(LIVERPOOL, BOSTON)));
    const b = bounds([j]);
    // [[south, west], [north, east]] — Boston is the southern + western extent.
    expect(b).toEqual([
      [BOSTON.lat, BOSTON.lng],
      [LIVERPOOL.lat, LIVERPOOL.lng],
    ]);
  });

  it("derives the dated year span (rounded to the decade)", () => {
    const t = person("t");
    const events = [
      ev({ id: "a", type: "birth", date: yr(1888), place: "Boston, MA", people: ["t"] }),
      ev({ id: "b", type: "death", date: yr(1971), place: "Concord, MA", people: ["t"] }),
    ];
    expect(yearSpan(dataset([t], events, placesMap(BOSTON, CONCORD)))).toEqual({ min: 1880, max: 1971 });
  });

  it("splits an immigration arrow into both endpoints", () => {
    expect(placeStringsOf(ev({ type: "immigration", place: "Liverpool → Boston" }))).toEqual([
      "Liverpool",
      "Boston",
    ]);
    expect(placeStringsOf(ev({ type: "residence", place: "Boston, MA" }))).toEqual(["Boston, MA"]);
  });
});
