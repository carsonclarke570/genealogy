import { describe, it, expect } from "vitest";
import {
  buildTimeline,
  eventsOf,
  byDate,
  fmtDate,
  yearSpan,
  type StoredEvent,
} from "./timeline";
import type { Person, MediaItem } from "./family-data";
import type { RelationshipEdge } from "./family-graph";

// ── factories ──────────────────────────────────────────────────────────────
const person = (id: string, over: Partial<Person> = {}): Person => ({
  id,
  given: over.given ?? `${id[0].toUpperCase()}${id.slice(1)} Q`,
  surname: over.surname ?? "Doe",
  maiden: null,
  sex: "o",
  born: over.born ?? 1900,
  bornDate: over.bornDate ?? (over.born !== undefined ? null : { precision: "year", year: 1900, month: null, day: null }),
  bornPlace: over.bornPlace ?? null,
  died: over.died ?? null,
  diedDate: over.diedDate ?? null,
  diedPlace: over.diedPlace ?? null,
  living: over.living ?? false,
  notes: null,
  docs: {},
  prov: over.prov,
  ...over,
});

const peopleMap = (...ps: Person[]): Record<string, Person> =>
  Object.fromEntries(ps.map((p) => [p.id, p]));

let relSeq = 0;
const spouse = (
  a: string,
  b: string,
  over: Partial<RelationshipEdge> = {},
): RelationshipEdge => ({
  id: `s${relSeq++}`,
  kind: "spouse",
  personId: a,
  relatedId: b,
  status: "married",
  ...over,
});

const media = (id: string, over: Partial<MediaItem> = {}): MediaItem => ({
  id,
  type: over.type ?? "photo",
  title: over.title ?? "A photo",
  year: over.year ?? 1950,
  people: over.people ?? [],
});

const stored = (over: Partial<StoredEvent> = {}): StoredEvent => ({
  id: over.id ?? "e1",
  type: over.type ?? "immigration",
  title: over.title ?? "Sailed for America",
  date: over.date ?? "1911-04",
  place: over.place ?? null,
  prov: over.prov ?? "unverified",
  mediaId: over.mediaId ?? null,
  people: over.people ?? [],
});

const empty = { people: {}, relationships: [], media: [], events: [] as StoredEvent[] };

describe("buildTimeline — derived birth/death", () => {
  it("synthesizes a birth and a death event from a person", () => {
    const p = person("amy", { born: 1900, bornDate: { precision: "year", year: 1900, month: null, day: null }, died: 1980, diedDate: { precision: "year", year: 1980, month: null, day: null } });
    const evs = buildTimeline({ ...empty, people: peopleMap(p) });
    expect(evs.map((e) => e.id)).toEqual(["b-amy", "d-amy"]);
    expect(evs[0].type).toBe("birth");
    expect(evs[1].type).toBe("death");
  });

  it("omits the death event for a living person", () => {
    const p = person("liv", { born: 1990, living: true, died: null });
    const evs = buildTimeline({ ...empty, people: peopleMap(p) });
    expect(evs.map((e) => e.id)).toEqual(["b-liv"]);
  });

  it("uses prov from the person's recorded confidence", () => {
    const p = person("art", { born: 1918, prov: { born: { status: "disputed" } } });
    const [birth] = buildTimeline({ ...empty, people: peopleMap(p) });
    expect(birth.prov).toBe("disputed");
  });
});

describe("buildTimeline — media / source dedup", () => {
  it("attaches a birth certificate as the birth event's source, not a standalone event", () => {
    const p = person("ele", { born: 1915, bornDate: { precision: "year", year: 1915, month: null, day: null } });
    const cert = media("M-cert", { type: "certificate", title: "Eleanor — birth certificate", year: 1915, people: ["ele"] });
    const evs = buildTimeline({ ...empty, people: peopleMap(p), media: [cert] });
    // exactly one event (the birth) — the certificate did NOT become a document event
    expect(evs).toHaveLength(1);
    expect(evs[0].id).toBe("b-ele");
    expect(evs[0].source).toEqual({ id: "M-cert", title: "Eleanor — birth certificate", type: "certificate" });
    expect(evs.some((e) => e.id === "me-M-cert")).toBe(false);
  });

  it("makes a standalone document event for an unrelated dated media item", () => {
    const p = person("rose", { born: 1921 });
    const article = media("M-art", { type: "article", title: "Rose opens a bakery", year: 1958, people: ["rose"] });
    const evs = buildTimeline({ ...empty, people: peopleMap(p), media: [article] });
    const doc = evs.find((e) => e.id === "me-M-art");
    expect(doc).toBeDefined();
    expect(doc!.type).toBe("document");
    expect(doc!.source).toEqual({ id: "M-art", title: "Rose opens a bakery", type: "article" });
  });

  it("attaches an obituary as the death source and consumes it", () => {
    const p = person("tom", { born: 1888, died: 1971 });
    const obit = media("M-ob", { type: "obituary", title: "Thomas, 1888–1971", year: 1971, people: ["tom"] });
    const evs = buildTimeline({ ...empty, people: peopleMap(p), media: [obit] });
    const death = evs.find((e) => e.id === "d-tom")!;
    expect(death.source?.id).toBe("M-ob");
    expect(evs.some((e) => e.id === "me-M-ob")).toBe(false);
  });
});

describe("buildTimeline — marriage / divorce", () => {
  it("keys the marriage id on the sorted partner pair regardless of edge direction", () => {
    const a = person("bob", { born: 1900 });
    const b = person("amy", { born: 1902 });
    const fwd = buildTimeline({ ...empty, people: peopleMap(a, b), relationships: [spouse("bob", "amy", { marriedDate: "1925" })] });
    const rev = buildTimeline({ ...empty, people: peopleMap(a, b), relationships: [spouse("amy", "bob", { marriedDate: "1925" })] });
    const idFwd = fwd.find((e) => e.type === "marriage")!.id;
    const idRev = rev.find((e) => e.type === "marriage")!.id;
    expect(idFwd).toBe("m-amy__bob");
    expect(idRev).toBe("m-amy__bob");
  });

  it("skips a marriage with no recorded date", () => {
    const a = person("bob", { born: 1900 });
    const b = person("amy", { born: 1902 });
    const evs = buildTimeline({ ...empty, people: peopleMap(a, b), relationships: [spouse("bob", "amy")] });
    expect(evs.some((e) => e.type === "marriage")).toBe(false);
  });

  it("emits a divorce only when status is divorced and a date is present", () => {
    const a = person("meg", { born: 1946 });
    const b = person("don", { born: 1944 });
    const married = buildTimeline({ ...empty, people: peopleMap(a, b), relationships: [spouse("meg", "don", { marriedDate: "1969", divorcedDate: "1981" })] });
    expect(married.some((e) => e.type === "divorce")).toBe(false); // status still "married"
    const divorced = buildTimeline({ ...empty, people: peopleMap(a, b), relationships: [spouse("meg", "don", { status: "divorced", marriedDate: "1969", divorcedDate: "1981" })] });
    const div = divorced.find((e) => e.type === "divorce")!;
    expect(div.id).toBe("dv-don__meg");
    expect(fmtDate(div)).toBe("1981");
  });

  it("a marriage surfaces on both partners' timelines", () => {
    const a = person("bob", { born: 1900 });
    const b = person("amy", { born: 1902 });
    const evs = buildTimeline({ ...empty, people: peopleMap(a, b), relationships: [spouse("bob", "amy", { marriedDate: "1925" })] });
    expect(eventsOf(evs, "bob").some((e) => e.type === "marriage")).toBe(true);
    expect(eventsOf(evs, "amy").some((e) => e.type === "marriage")).toBe(true);
  });
});

describe("buildTimeline — stored events", () => {
  it("includes stored events prefixed with ev- and linked to their people", () => {
    const p = person("tom", { born: 1888 });
    const e = stored({ id: "imm1", type: "immigration", title: "Sailed for America", date: "1911-04", people: ["tom"] });
    const evs = buildTimeline({ ...empty, people: peopleMap(p), events: [e] });
    const stored1 = evs.find((x) => x.id === "ev-imm1")!;
    expect(stored1.type).toBe("immigration");
    expect(stored1.auto).toBe(false);
    expect(eventsOf(evs, "tom").map((x) => x.id)).toContain("ev-imm1");
  });
});

describe("buildTimeline — ordering", () => {
  it("sorts chronologically, with a year-only date before a same-year dated event", () => {
    const p = person("x", { born: 1947, bornDate: { precision: "year", year: 1947, month: null, day: null } });
    // a stored event in June 1947 should sort AFTER the year-only 1947 birth
    const e = stored({ id: "j", type: "career", title: "Started work", date: "1947-06-12", people: ["x"] });
    const evs = buildTimeline({ ...empty, people: peopleMap(p), events: [e] });
    expect(evs.map((x) => x.id)).toEqual(["b-x", "ev-j"]);
  });

  it("is deterministic — identical input yields identical order", () => {
    const a = person("bob", { born: 1900, died: 1970 });
    const b = person("amy", { born: 1902, died: 1980 });
    const input = { ...empty, people: peopleMap(a, b), relationships: [spouse("bob", "amy", { marriedDate: "1925" })] };
    const r1 = buildTimeline(input).map((e) => e.id);
    const r2 = buildTimeline(input).map((e) => e.id);
    expect(r1).toEqual(r2);
  });

  it("byDate orders two events by their sort key", () => {
    const p1 = person("a", { born: 1900 });
    const p2 = person("b", { born: 1950 });
    const [e1, e2] = buildTimeline({ ...empty, people: peopleMap(p1, p2) });
    expect(byDate(e1, e2)).toBeLessThan(0);
  });
});

describe("yearSpan", () => {
  it("returns the min/max year across events, or a default when empty", () => {
    expect(yearSpan([])).toEqual([1900, 2025]);
    const evs = buildTimeline({ ...empty, people: peopleMap(person("a", { born: 1888 }), person("b", { born: 2002 })) });
    expect(yearSpan(evs)).toEqual([1888, 2002]);
  });
});
