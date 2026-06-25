/**
 * Demo family — seed data for a fresh database (dev only; production boots empty).
 *
 * Ported from the design prototype (wf/data.js): five generations, ~16 people,
 * modelled as people + couple "units". The seed script (db/seed.ts) translates
 * these into normalised `person` / `relationship` / `media` / `person_media`
 * rows; the query layer (lib/queries.ts) reconstructs the unit view from them.
 *
 * This is the *only* place the literal family lives — the running app reads
 * everything from SQLite.
 */
import type { Person, MediaItem } from "@/lib/family-data";

// Seed-authoring shapes omit fields the read model *derives* at query time
// (`mediaCount`) or that only exist once a real file is uploaded (`mimeType`,
// `hasFile`) — the seed leaves the media file columns null.
type SeedPerson = Omit<Person, "mediaCount" | "names">;
type SeedMedia = Omit<MediaItem, "mimeType" | "hasFile" | "description" | "prov">;

/**
 * Seed-authoring shape only: the demo family is written as couple "units" for
 * convenience, then translated into normalised `relationship` rows by db/seed.ts.
 * The running app no longer uses this couple-unit model (it derives a family
 * graph from the raw edges — see lib/family-graph.ts); this type stays local to
 * the seed so the literal below keeps reading naturally.
 */
interface SeedUnit {
  id: string;
  parent: string | null;
  anchor: string;
  partner: string | null;
  rel: "married" | "divorced" | null;
  /** Canonical partial-date strings for the spouse edge (drives marriage/divorce events). */
  married?: string;
  divorced?: string;
}

/** A stored life event the timeline shows (births/deaths/marriages are derived). */
export interface SeedEvent {
  id: string;
  type: "immigration" | "military" | "education" | "career" | "religious" | "other";
  title: string;
  date: string;
  place: string | null;
  people: string[];
  /** Source document id (a media item), or null. */
  mediaId: string | null;
  prov: "verified" | "unverified" | "estimated" | "disputed";
}

/** A residence span (where one or more people lived, and for what period). */
export interface SeedResidence {
  id: string;
  /** Everyone known to have lived here (a home is shared by a household). */
  personIds: string[];
  /** Display label + optional structured parts. */
  place: string;
  locality?: string | null;
  region?: string | null;
  country?: string | null;
  /**
   * "range" (default): a span — `start` = moved in, `end` = moved out (null =
   * onward). "point": a single known date (in `start`), span unknown.
   */
  dateKind?: "range" | "point";
  /** Canonical partial-date strings; `end` null means they lived there onward. */
  start: string | null;
  end?: string | null;
  prov: "verified" | "unverified" | "estimated" | "disputed";
  mediaId?: string | null;
  note?: string | null;
}

export const people: Record<string, SeedPerson> = {
  // Gen 0 — great-great-grandparents
  thomas: { id: "thomas", given: "Thomas Edward", surname: "Rivers", maiden: null, sex: "m", born: 1888, bornPlace: "Sheffield, England", died: 1971, diedPlace: "Boston, MA", living: false, docs: { photo: 3, certificate: 1, obituary: 1 }, prov: { born: { status: "estimated" }, bornPlace: { status: "estimated" }, died: { status: "verified" }, diedPlace: { status: "verified" } } },
  alice: { id: "alice", given: "Alice Mary", surname: "Rivers", maiden: "Hartley", sex: "f", born: 1891, bornPlace: "Leeds, England", died: 1975, diedPlace: "Boston, MA", living: false, docs: { photo: 2, certificate: 1 } },

  // Gen 1 — great-grandparents
  eleanor: { id: "eleanor", given: "Eleanor Margaret", surname: "Rivers", maiden: null, sex: "f", born: 1915, bornPlace: "Boston, MA", died: 2001, diedPlace: "Concord, MA", living: false, docs: { photo: 6, certificate: 2, article: 1, obituary: 1 }, prov: { born: { status: "verified", source: "Massachusetts birth index (1915)" }, bornPlace: { status: "verified", source: "Massachusetts birth index (1915)" }, died: { status: "verified", source: "Obituary, Concord Monitor (2001)" }, diedPlace: { status: "verified", source: "Obituary, Concord Monitor (2001)" } } },
  frederick: { id: "frederick", given: "Frederick John", surname: "Bain", maiden: null, sex: "m", born: 1912, bornPlace: "Glasgow, Scotland", died: 1989, diedPlace: "Concord, MA", living: false, docs: { photo: 2, article: 1 } },
  arthur: { id: "arthur", given: "Arthur James", surname: "Rivers", maiden: null, sex: "m", born: 1918, bornPlace: "Boston, MA", died: 1944, diedPlace: "Normandy, France", living: false, docs: { photo: 1, article: 2, obituary: 1 }, prov: { born: { status: "verified" }, bornPlace: { status: "verified" }, died: { status: "disputed" }, diedPlace: { status: "estimated" } } },
  rose: { id: "rose", given: "Rose Adeline", surname: "Rivers", maiden: null, sex: "f", born: 1921, bornPlace: "Boston, MA", died: 2010, diedPlace: "Portland, ME", living: false, docs: { photo: 4, certificate: 1 } },
  walter: { id: "walter", given: "Walter Henry", surname: "Cole", maiden: null, sex: "m", born: 1919, bornPlace: "Portland, ME", died: 1998, diedPlace: "Portland, ME", living: false, docs: { photo: 1 } },

  // Gen 2 — grandparents
  james: { id: "james", given: "James Frederick", surname: "Bain", maiden: null, sex: "m", born: 1943, bornPlace: "Concord, MA", died: 2018, diedPlace: "Concord, MA", living: false, docs: { photo: 5, certificate: 1, obituary: 1 }, prov: { born: { status: "verified" }, bornPlace: { status: "verified" }, died: { status: "verified" }, diedPlace: { status: "unverified" } } },
  patricia: { id: "patricia", given: "Patricia Anne", surname: "Bain", maiden: "Nolan", sex: "f", born: 1945, bornPlace: "Albany, NY", died: null, diedPlace: null, living: true, docs: { photo: 3 } },
  margaret: { id: "margaret", given: "Margaret Rose", surname: "Reed", maiden: "Bain", sex: "f", born: 1946, bornPlace: "Concord, MA", died: null, diedPlace: null, living: true, docs: { photo: 2, certificate: 1 } },
  donald: { id: "donald", given: "Donald Ray", surname: "Reed", maiden: null, sex: "m", born: 1944, bornPlace: "Hartford, CT", died: 2011, diedPlace: "Hartford, CT", living: false, docs: {} },

  // Gen 3 — parents
  sarah: { id: "sarah", given: "Sarah Eleanor", surname: "Tran", maiden: "Bain", sex: "f", born: 1972, bornPlace: "Concord, MA", died: null, diedPlace: null, living: true, docs: { photo: 8, certificate: 1 }, prov: { born: { status: "verified" }, bornPlace: { status: "unverified" } } },
  michael: { id: "michael", given: "Michael Long", surname: "Tran", maiden: null, sex: "m", born: 1970, bornPlace: "San Jose, CA", died: null, diedPlace: null, living: true, docs: { photo: 3 } },
  david: { id: "david", given: "David Arthur", surname: "Bain", maiden: null, sex: "m", born: 1975, bornPlace: "Concord, MA", died: null, diedPlace: null, living: true, docs: { photo: 1 } },

  // Gen 4 — children
  olivia: { id: "olivia", given: "Olivia Grace", surname: "Tran", maiden: null, sex: "f", born: 2002, bornPlace: "Cambridge, MA", died: null, diedPlace: null, living: true, docs: { photo: 4 } },
  ethan: { id: "ethan", given: "Ethan Michael", surname: "Tran", maiden: null, sex: "m", born: 2005, bornPlace: "Cambridge, MA", died: null, diedPlace: null, living: true, docs: { photo: 2 } },
};

// Couple units (the spine of the layout). parent = the unit this couple descends
// from; anchor = which partner is the blood descendant of that parent unit.
export const units: SeedUnit[] = [
  { id: "U0", parent: null, anchor: "thomas", partner: "alice", rel: "married", married: "1910" },
  { id: "U1", parent: "U0", anchor: "eleanor", partner: "frederick", rel: "married", married: "1938-06-18" },
  { id: "U2", parent: "U0", anchor: "arthur", partner: null, rel: null },
  { id: "U3", parent: "U0", anchor: "rose", partner: "walter", rel: "married", married: "1947" },
  { id: "U4", parent: "U1", anchor: "james", partner: "patricia", rel: "married", married: "1968" },
  { id: "U5", parent: "U1", anchor: "margaret", partner: "donald", rel: "divorced", married: "1969", divorced: "1981" },
  { id: "U6", parent: "U4", anchor: "sarah", partner: "michael", rel: "married", married: "1999-09-04" },
  { id: "U7", parent: "U4", anchor: "david", partner: null, rel: null },
  { id: "U8", parent: "U6", anchor: "olivia", partner: null, rel: null },
  { id: "U9", parent: "U6", anchor: "ethan", partner: null, rel: null },
];

/**
 * Curated life events (the non birth/death/marriage/divorce ones). Births and
 * deaths are synthesized from each person; marriages/divorces from the spouse
 * dates above — so only these "everything else" events are stored. Several cite
 * a document already in the media archive, which then appears as the event's
 * source rather than a duplicate document event.
 */
export const events: SeedEvent[] = [
  { id: "E-immig-1", type: "immigration", title: "Sailed for America aboard the SS Carmania", date: "1911-04", place: "Liverpool → Boston", people: ["thomas", "alice"], mediaId: "M-112", prov: "verified" },
  { id: "E-bap-el", type: "religious", title: "Eleanor baptised at St. Mary's", date: "1915-09", place: "Boston, MA", people: ["eleanor"], mediaId: null, prov: "estimated" },
  { id: "E-mil-ar1", type: "military", title: "Arthur enlisted, U.S. Army", date: "1942-03", place: "Boston, MA", people: ["arthur"], mediaId: null, prov: "unverified" },
  { id: "E-mil-ar2", type: "military", title: "Reported missing in action, Normandy", date: "1944-06-12", place: "Normandy, France", people: ["arthur"], mediaId: "M-104", prov: "disputed" },
  { id: "E-car-ro", type: "career", title: "Rose opened a bakery in Portland", date: "1958", place: "Portland, ME", people: ["rose"], mediaId: "M-109", prov: "verified" },
  { id: "E-edu-ja", type: "education", title: "James graduated, Boston College", date: "1965-05", place: "Boston, MA", people: ["james"], mediaId: "M-106", prov: "verified" },
  { id: "E-car-fr", type: "career", title: "Frederick retired from the railway", date: "1972", place: "Concord, MA", people: ["frederick"], mediaId: null, prov: "estimated" },
  { id: "E-edu-sa", type: "education", title: "Sarah graduated, UMass Amherst", date: "1994", place: "Amherst, MA", people: ["sarah"], mediaId: null, prov: "unverified" },
  { id: "E-car-mi", type: "career", title: "Michael joined a tech firm in Cambridge", date: "2001", place: "Cambridge, MA", people: ["michael"], mediaId: null, prov: "unverified" },
  { id: "E-rel-ol", type: "religious", title: "Olivia christened", date: "2002-11", place: "Cambridge, MA", people: ["olivia"], mediaId: null, prov: "unverified" },
];

/**
 * Residencies — where people lived, and for what spans. (The old "settled in…"
 * residence *events* are modelled here now, as first-class spans, plus a few more
 * to exercise the timeline's residence bars.)
 */
export const residences: SeedResidence[] = [
  // Shared homes: a couple / a household live in one residence, not a row each.
  { id: "R-thomas-alice-boston", personIds: ["thomas", "alice"], place: "Boston, MA", locality: "Boston", region: "Massachusetts", country: "United States", start: "1911", end: "1975", prov: "estimated" },
  { id: "R-eleanor-frederick-concord", personIds: ["eleanor", "frederick"], place: "Concord, MA", locality: "Concord", region: "Massachusetts", country: "United States", start: "1950", end: "2001", prov: "unverified" },
  { id: "R-rose-portland", personIds: ["rose"], place: "Portland, ME", locality: "Portland", region: "Maine", country: "United States", start: "1947", end: "2010", prov: "unverified" },
  { id: "R-james-concord", personIds: ["james"], place: "Concord, MA", locality: "Concord", region: "Massachusetts", country: "United States", start: "1943", end: "2018", prov: "verified", mediaId: "M-110" },
  { id: "R-cambridge-home", personIds: ["sarah", "michael", "olivia"], place: "Cambridge, MA", locality: "Cambridge", region: "Massachusetts", country: "United States", start: "2003", prov: "unverified", note: "Family home through high school" },
  // A "known date" residence — the SS Carmania manifest places Thomas & Alice in
  // Liverpool in 1911, but we don't know when they arrived or left.
  { id: "R-thomas-alice-liverpool", personIds: ["thomas", "alice"], place: "Liverpool, England", locality: "Liverpool", country: "England", dateKind: "point", start: "1911", prov: "verified", mediaId: "M-112", note: "Departure port on the passage manifest" },
];

/**
 * Starter gazetteer — approximate coordinates for every place the demo family
 * touches, so the **Family Map works out of the box with no geocoder running**
 * (production / new installs geocode real places via Photon — see lib/places.ts).
 * Ported from the design prototype (hf/geo.js `PLACES`). The label must match the
 * place strings above exactly (it's normalised to the gazetteer join key). A few
 * extra cities are included so map demos beyond the seeded facts still resolve.
 */
export interface SeedPlace {
  label: string;
  lat: number;
  lng: number;
}

export const places: SeedPlace[] = [
  { label: "Sheffield, England", lat: 53.3811, lng: -1.4701 },
  { label: "Leeds, England", lat: 53.8008, lng: -1.5491 },
  { label: "Glasgow, Scotland", lat: 55.8642, lng: -4.2518 },
  { label: "Liverpool, England", lat: 53.4084, lng: -2.9916 },
  { label: "Edinburgh, Scotland", lat: 55.9533, lng: -3.1883 },
  { label: "Normandy, France", lat: 49.1829, lng: -0.3707 },
  { label: "Boston, MA", lat: 42.3601, lng: -71.0589 },
  { label: "Concord, MA", lat: 42.4604, lng: -71.3489 },
  { label: "Cambridge, MA", lat: 42.3736, lng: -71.1097 },
  { label: "Amherst, MA", lat: 42.3732, lng: -72.5199 },
  { label: "Portland, ME", lat: 43.6591, lng: -70.2568 },
  { label: "Hartford, CT", lat: 41.7658, lng: -72.6734 },
  { label: "Albany, NY", lat: 42.6526, lng: -73.7562 },
  { label: "Providence, RI", lat: 41.824, lng: -71.4128 },
  { label: "New York, NY", lat: 40.7128, lng: -74.006 },
  { label: "San Jose, CA", lat: 37.3382, lng: -121.8863 },
  { label: "Seattle, WA", lat: 47.6062, lng: -122.3321 },
];

export const media: SeedMedia[] = [
  { id: "M-101", type: "photo", title: "Rivers family at the lake house", year: 1962, people: ["thomas", "alice", "rose"] },
  { id: "M-102", type: "certificate", title: "Eleanor Rivers — birth certificate", year: 1915, people: ["eleanor"] },
  { id: "M-103", type: "obituary", title: "Thomas E. Rivers, 1888–1971", year: 1971, people: ["thomas"] },
  { id: "M-104", type: "article", title: "Pvt. Arthur Rivers, missing in action", year: 1944, people: ["arthur"] },
  { id: "M-105", type: "photo", title: "Eleanor & Frederick, wedding day", year: 1938, people: ["eleanor", "frederick"] },
  { id: "M-106", type: "photo", title: "James Bain, graduation", year: 1965, people: ["james"] },
  { id: "M-107", type: "certificate", title: "Sarah & Michael — marriage record", year: 1999, people: ["sarah", "michael"] },
  { id: "M-108", type: "photo", title: "Olivia & Ethan at the shore", year: 2010, people: ["olivia", "ethan"] },
  { id: "M-109", type: "article", title: "Rose Cole opens Portland bakery", year: 1958, people: ["rose"] },
  { id: "M-110", type: "obituary", title: "James F. Bain, 1943–2018", year: 2018, people: ["james"] },
  { id: "M-111", type: "photo", title: "Three generations, Thanksgiving", year: 2008, people: ["patricia", "sarah", "olivia"] },
  { id: "M-112", type: "other", title: "Rivers passage manifest, SS Carmania", year: 1911, people: ["thomas", "alice"] },
];
