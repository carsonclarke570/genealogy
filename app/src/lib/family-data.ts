/**
 * The Whitfield family — the seed data the UI is built against.
 *
 * Ported from the design prototype (wf/data.js): five generations, ~16 people,
 * modeled as people + couple "units" so the tree layout can be reconstructed.
 * This stands in for the eventual Drizzle/SQLite layer (deferred — see CLAUDE.md).
 */
import type {
  ProvenanceStatus,
  DocType,
  SourceOption,
  BadgeTone,
} from "@family-archive/ui";

export type Sex = "m" | "f" | "o";

export interface Person {
  id: string;
  given: string;
  surname: string;
  maiden: string | null;
  sex: Sex;
  born: number | null;
  bornPlace: string | null;
  died: number | null;
  diedPlace: string | null;
  living: boolean;
  docs: Partial<Record<DocType, number>>;
  prov?: Partial<Record<string, ProvenanceStatus>>;
}

export interface Unit {
  id: string;
  parent: string | null;
  anchor: string;
  partner: string | null;
  rel: "married" | "divorced" | null;
}

export interface MediaItem {
  id: string;
  type: DocType;
  title: string;
  year: number;
  people: string[];
}

export const people: Record<string, Person> = {
  // Gen 0 — great-great-grandparents
  thomas: { id: "thomas", given: "Thomas Edward", surname: "Whitfield", maiden: null, sex: "m", born: 1888, bornPlace: "Sheffield, England", died: 1971, diedPlace: "Boston, MA", living: false, docs: { photo: 3, certificate: 1, obituary: 1 }, prov: { born: "estimated", bornPlace: "estimated", died: "verified", diedPlace: "verified" } },
  alice: { id: "alice", given: "Alice Mary", surname: "Whitfield", maiden: "Hartley", sex: "f", born: 1891, bornPlace: "Leeds, England", died: 1975, diedPlace: "Boston, MA", living: false, docs: { photo: 2, certificate: 1 } },

  // Gen 1 — great-grandparents
  eleanor: { id: "eleanor", given: "Eleanor Margaret", surname: "Whitfield", maiden: null, sex: "f", born: 1915, bornPlace: "Boston, MA", died: 2001, diedPlace: "Concord, MA", living: false, docs: { photo: 6, certificate: 2, article: 1, obituary: 1 }, prov: { born: "verified", bornPlace: "verified", died: "verified", diedPlace: "verified" } },
  frederick: { id: "frederick", given: "Frederick John", surname: "Bain", maiden: null, sex: "m", born: 1912, bornPlace: "Glasgow, Scotland", died: 1989, diedPlace: "Concord, MA", living: false, docs: { photo: 2, article: 1 } },
  arthur: { id: "arthur", given: "Arthur James", surname: "Whitfield", maiden: null, sex: "m", born: 1918, bornPlace: "Boston, MA", died: 1944, diedPlace: "Normandy, France", living: false, docs: { photo: 1, article: 2, obituary: 1 }, prov: { born: "verified", bornPlace: "verified", died: "disputed", diedPlace: "estimated" } },
  rose: { id: "rose", given: "Rose Adeline", surname: "Whitfield", maiden: null, sex: "f", born: 1921, bornPlace: "Boston, MA", died: 2010, diedPlace: "Portland, ME", living: false, docs: { photo: 4, certificate: 1 } },
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
  { id: "M-101", type: "photo", title: "Whitfield family at the lake house", year: 1962, people: ["thomas", "alice", "rose"] },
  { id: "M-102", type: "certificate", title: "Eleanor Whitfield — birth certificate", year: 1915, people: ["eleanor"] },
  { id: "M-103", type: "obituary", title: "Thomas E. Whitfield, 1888–1971", year: 1971, people: ["thomas"] },
  { id: "M-104", type: "article", title: "Pvt. Arthur Whitfield, missing in action", year: 1944, people: ["arthur"] },
  { id: "M-105", type: "photo", title: "Eleanor & Frederick, wedding day", year: 1938, people: ["eleanor", "frederick"] },
  { id: "M-106", type: "photo", title: "James Bain, graduation", year: 1965, people: ["james"] },
  { id: "M-107", type: "certificate", title: "Sarah & Michael — marriage record", year: 1999, people: ["sarah", "michael"] },
  { id: "M-108", type: "photo", title: "Olivia & Ethan at the shore", year: 2010, people: ["olivia", "ethan"] },
  { id: "M-109", type: "article", title: "Rose Cole opens Portland bakery", year: 1958, people: ["rose"] },
  { id: "M-110", type: "obituary", title: "James F. Bain, 1943–2018", year: 2018, people: ["james"] },
  { id: "M-111", type: "photo", title: "Three generations, Thanksgiving", year: 2008, people: ["patricia", "sarah", "olivia"] },
  { id: "M-112", type: "other", title: "Whitfield passage manifest, SS Carmania", year: 1911, people: ["thomas", "alice"] },
];

export function fullName(p: Person): string {
  return `${p.given} ${p.surname}`;
}

/** "Eleanor Whitfield" → "Eleanor Whitfield"; first given + surname for tree cells. */
export function shortName(p: Person): string {
  return `${p.given.split(" ")[0]} ${p.surname}`;
}

export function lifeDates(p: Person): string {
  const b = p.born != null ? p.born : "?";
  if (p.living) return `${b} –`;
  const d = p.died != null ? p.died : "?";
  return `${b} – ${d}`;
}

export function docCount(p: Person): number {
  return Object.values(p.docs || {}).reduce((a, b) => a + (b ?? 0), 0);
}

/** Confidence of a single recorded fact. */
export function provOf(p: Person, field: string): ProvenanceStatus {
  if (p.prov && p.prov[field]) return p.prov[field]!;
  if (field === "name") return docCount(p) > 0 ? "verified" : "unverified";
  if ((field === "born" || field === "died") && p.born && p.born < 1900)
    return "estimated";
  return "unverified";
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

export function relationsOf(pid: string): Relations {
  const uOf: Record<string, Unit> = {};
  units.forEach((u) => {
    uOf[u.anchor] = u;
    if (u.partner) uOf[u.partner] = u;
  });
  const myUnit = uOf[pid];
  const out: Relations = { spouse: [], parents: [], children: [], siblings: [] };
  if (!myUnit) return out;
  const isAnchor = myUnit.anchor === pid;
  if (myUnit.partner) {
    const other = isAnchor ? myUnit.partner : myUnit.anchor;
    out.spouse.push({ id: other, rel: myUnit.rel ?? undefined });
  }
  if (isAnchor && myUnit.parent) {
    const pu = units.find((u) => u.id === myUnit.parent);
    if (pu) {
      out.parents.push({ id: pu.anchor });
      if (pu.partner) out.parents.push({ id: pu.partner });
      units
        .filter((u) => u.parent === myUnit.parent && u.id !== myUnit.id)
        .forEach((u) => out.siblings.push({ id: u.anchor }));
    }
  }
  units
    .filter((u) => u.parent === myUnit.id)
    .forEach((u) => out.children.push({ id: u.anchor }));
  return out;
}

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
export function sourceOptions(): SourceOption[] {
  return media.slice(0, 6).map((m) => ({ id: m.id, label: m.title, type: m.type }));
}
