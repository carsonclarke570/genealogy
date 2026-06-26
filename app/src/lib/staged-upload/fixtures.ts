/** Shared fixtures for the staged-upload unit tests (no DB, pure data). */
import type { PartialDate } from "@family-archive/ui";
import type { Dataset, Person, Residence, TimelineEvent } from "@/lib/family-data";
import { buildFamilyGraph, type RelationshipEdge } from "@/lib/family-graph";

export function yearDate(y: number): PartialDate {
  return { precision: "year", year: y, month: null, day: null };
}

export function mkPerson(over: Partial<Person> & Pick<Person, "id" | "given" | "surname">): Person {
  return {
    maiden: null,
    sex: "f",
    born: null,
    bornDate: null,
    bornPlace: null,
    died: null,
    diedDate: null,
    diedPlace: null,
    living: true,
    notes: null,
    docs: {},
    mediaCount: 0,
    prov: {},
    names: [
      {
        id: `birth-${over.id}`,
        given: over.given,
        surname: over.surname,
        date: over.born != null ? yearDate(over.born) : null,
        reason: "birth",
        relationshipId: null,
        eventId: null,
        source: null,
        prov: "unverified",
        note: null,
        ordinal: 0,
      },
    ],
    ...over,
  };
}

/**
 * A small archive: Eleanor (P1) with a recorded parent (P2), a spouse (P3), one
 * residence and one stored military event. Enough to exercise every model.
 */
export function makeFixture(): Dataset {
  const eleanor = mkPerson({ id: "P1", given: "Eleanor Margaret", surname: "Whitfield", born: 1915, bornDate: yearDate(1915), bornPlace: "Boston, MA" });
  const father = mkPerson({ id: "P2", given: "James", surname: "Whitfield", sex: "m", born: 1880 });
  const spouse = mkPerson({ id: "P3", given: "Frederick", surname: "Reed", sex: "m", born: 1912 });

  const relationships: RelationshipEdge[] = [
    { id: "edge-parent", kind: "parent", personId: "P2", relatedId: "P1" },
    { id: "edge-spouse", kind: "spouse", personId: "P1", relatedId: "P3", status: "married", marriedDate: "1938" },
  ];

  const residences: Residence[] = [
    {
      id: "RES1",
      personIds: ["P1"],
      location: { label: "Concord, MA" },
      place: "Concord, MA",
      dateKind: "range",
      start: yearDate(1950),
      end: null,
      startYear: 1950,
      endYear: null,
      prov: "unverified",
      source: null,
      note: null,
    },
    // A census-derived residence — must be excluded from the seeded draft.
    {
      id: "R-census-M9",
      personIds: ["P1"],
      location: { label: "Lanark, Scotland" },
      place: "Lanark, Scotland",
      dateKind: "point",
      start: yearDate(1920),
      end: null,
      startYear: 1920,
      endYear: null,
      prov: "unverified",
      source: null,
      note: null,
    },
  ];

  const events: TimelineEvent[] = [
    {
      id: "b-P1",
      type: "birth",
      date: yearDate(1915),
      sortKey: 19150101,
      title: "Eleanor Whitfield was born",
      place: "Boston, MA",
      people: ["P1"],
      prov: "unverified",
      source: null,
      auto: true,
    },
    {
      id: "ev-EV1",
      type: "military",
      date: yearDate(1942),
      sortKey: 19420101,
      title: "Enlisted in the U.S. Army",
      place: "Boston, MA",
      people: ["P1"],
      prov: "unverified",
      source: null,
      auto: false,
    },
  ];

  return {
    people: { P1: eleanor, P2: father, P3: spouse },
    graph: buildFamilyGraph(relationships),
    relationships,
    media: [],
    residences,
    events,
    places: {},
  };
}

/** A diff/registry context backed by the fixture. */
export function makeCtx(dataset: Dataset) {
  return {
    nameOf: (id: string) => {
      const p = dataset.people[id];
      return p ? `${p.given} ${p.surname}` : "";
    },
    isExisting: (id: string) => !!dataset.people[id],
    peopleOpts: Object.values(dataset.people).map((p) => ({ value: p.id, label: `${p.given} ${p.surname}` })),
  };
}
