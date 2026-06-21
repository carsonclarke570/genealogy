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
import type { Person, Unit, MediaItem } from "@/lib/family-data";

export const people: Record<string, Person> = {
  // Gen 0 — great-great-grandparents
  thomas: { id: "thomas", given: "Thomas Edward", surname: "Rivers", maiden: null, sex: "m", born: 1888, bornPlace: "Sheffield, England", died: 1971, diedPlace: "Boston, MA", living: false, docs: { photo: 3, certificate: 1, obituary: 1 }, prov: { born: "estimated", bornPlace: "estimated", died: "verified", diedPlace: "verified" } },
  alice: { id: "alice", given: "Alice Mary", surname: "Rivers", maiden: "Hartley", sex: "f", born: 1891, bornPlace: "Leeds, England", died: 1975, diedPlace: "Boston, MA", living: false, docs: { photo: 2, certificate: 1 } },

  // Gen 1 — great-grandparents
  eleanor: { id: "eleanor", given: "Eleanor Margaret", surname: "Rivers", maiden: null, sex: "f", born: 1915, bornPlace: "Boston, MA", died: 2001, diedPlace: "Concord, MA", living: false, docs: { photo: 6, certificate: 2, article: 1, obituary: 1 }, prov: { born: "verified", bornPlace: "verified", died: "verified", diedPlace: "verified" } },
  frederick: { id: "frederick", given: "Frederick John", surname: "Bain", maiden: null, sex: "m", born: 1912, bornPlace: "Glasgow, Scotland", died: 1989, diedPlace: "Concord, MA", living: false, docs: { photo: 2, article: 1 } },
  arthur: { id: "arthur", given: "Arthur James", surname: "Rivers", maiden: null, sex: "m", born: 1918, bornPlace: "Boston, MA", died: 1944, diedPlace: "Normandy, France", living: false, docs: { photo: 1, article: 2, obituary: 1 }, prov: { born: "verified", bornPlace: "verified", died: "disputed", diedPlace: "estimated" } },
  rose: { id: "rose", given: "Rose Adeline", surname: "Rivers", maiden: null, sex: "f", born: 1921, bornPlace: "Boston, MA", died: 2010, diedPlace: "Portland, ME", living: false, docs: { photo: 4, certificate: 1 } },
  walter: { id: "walter", given: "Walter Henry", surname: "Cole", maiden: null, sex: "m", born: 1919, bornPlace: "Portland, ME", died: 1998, diedPlace: "Portland, ME", living: false, docs: { photo: 1 } },

  // Gen 2 — grandparents
  james: { id: "james", given: "James Frederick", surname: "Bain", maiden: null, sex: "m", born: 1943, bornPlace: "Concord, MA", died: 2018, diedPlace: "Concord, MA", living: false, docs: { photo: 5, certificate: 1, obituary: 1 }, prov: { born: "verified", bornPlace: "verified", died: "verified", diedPlace: "unverified" } },
  patricia: { id: "patricia", given: "Patricia Anne", surname: "Bain", maiden: "Nolan", sex: "f", born: 1945, bornPlace: "Albany, NY", died: null, diedPlace: null, living: true, docs: { photo: 3 } },
  margaret: { id: "margaret", given: "Margaret Rose", surname: "Reed", maiden: "Bain", sex: "f", born: 1946, bornPlace: "Concord, MA", died: null, diedPlace: null, living: true, docs: { photo: 2, certificate: 1 } },
  donald: { id: "donald", given: "Donald Ray", surname: "Reed", maiden: null, sex: "m", born: 1944, bornPlace: "Hartford, CT", died: 2011, diedPlace: "Hartford, CT", living: false, docs: {} },

  // Gen 3 — parents
  sarah: { id: "sarah", given: "Sarah Eleanor", surname: "Tran", maiden: "Bain", sex: "f", born: 1972, bornPlace: "Concord, MA", died: null, diedPlace: null, living: true, docs: { photo: 8, certificate: 1 }, prov: { born: "verified", bornPlace: "unverified" } },
  michael: { id: "michael", given: "Michael Long", surname: "Tran", maiden: null, sex: "m", born: 1970, bornPlace: "San Jose, CA", died: null, diedPlace: null, living: true, docs: { photo: 3 } },
  david: { id: "david", given: "David Arthur", surname: "Bain", maiden: null, sex: "m", born: 1975, bornPlace: "Concord, MA", died: null, diedPlace: null, living: true, docs: { photo: 1 } },

  // Gen 4 — children
  olivia: { id: "olivia", given: "Olivia Grace", surname: "Tran", maiden: null, sex: "f", born: 2002, bornPlace: "Cambridge, MA", died: null, diedPlace: null, living: true, docs: { photo: 4 } },
  ethan: { id: "ethan", given: "Ethan Michael", surname: "Tran", maiden: null, sex: "m", born: 2005, bornPlace: "Cambridge, MA", died: null, diedPlace: null, living: true, docs: { photo: 2 } },
};

// Couple units (the spine of the layout). parent = the unit this couple descends
// from; anchor = which partner is the blood descendant of that parent unit.
export const units: Unit[] = [
  { id: "U0", parent: null, anchor: "thomas", partner: "alice", rel: "married" },
  { id: "U1", parent: "U0", anchor: "eleanor", partner: "frederick", rel: "married" },
  { id: "U2", parent: "U0", anchor: "arthur", partner: null, rel: null },
  { id: "U3", parent: "U0", anchor: "rose", partner: "walter", rel: "married" },
  { id: "U4", parent: "U1", anchor: "james", partner: "patricia", rel: "married" },
  { id: "U5", parent: "U1", anchor: "margaret", partner: "donald", rel: "divorced" },
  { id: "U6", parent: "U4", anchor: "sarah", partner: "michael", rel: "married" },
  { id: "U7", parent: "U4", anchor: "david", partner: null, rel: null },
  { id: "U8", parent: "U6", anchor: "olivia", partner: null, rel: null },
  { id: "U9", parent: "U6", anchor: "ethan", partner: null, rel: null },
];

export const media: MediaItem[] = [
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
