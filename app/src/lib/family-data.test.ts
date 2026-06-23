import { describe, it, expect } from "vitest";
import {
  sortNames,
  currentName,
  birthName,
  assemblePersonNames,
  type PersonName,
  type PersonNameRecord,
} from "./family-data";
import type { PartialDate } from "@family-archive/ui";

const yr = (year: number): PartialDate => ({ precision: "year", year, month: null, day: null });

const name = (id: string, surname: string, over: Partial<PersonName> = {}): PersonName => ({
  id,
  given: over.given ?? "Meg",
  surname,
  date: over.date ?? null,
  reason: over.reason ?? "birth",
  relationshipId: over.relationshipId ?? null,
  eventId: over.eventId ?? null,
  source: over.source ?? null,
  prov: over.prov ?? "unverified",
  note: over.note ?? null,
  ordinal: over.ordinal ?? 0,
});

describe("sortNames", () => {
  it("orders by effective date, earliest first", () => {
    const out = sortNames([name("b", "Reed", { date: yr(1969), ordinal: 1 }), name("a", "Bain", { date: yr(1946), ordinal: 0 })]);
    expect(out.map((n) => n.id)).toEqual(["a", "b"]);
  });

  it("sorts an undated name last (treated as the most recent)", () => {
    const out = sortNames([name("undated", "Reed", { ordinal: 1 }), name("dated", "Bain", { date: yr(1946), ordinal: 0 })]);
    expect(out.map((n) => n.id)).toEqual(["dated", "undated"]);
  });

  it("breaks an effective-date tie by ordinal", () => {
    const out = sortNames([name("second", "Reed", { ordinal: 1 }), name("first", "Bain", { ordinal: 0 })]);
    expect(out.map((n) => n.id)).toEqual(["first", "second"]);
  });

  it("does not mutate its input", () => {
    const input = [name("b", "Reed", { date: yr(1969) }), name("a", "Bain", { date: yr(1946) })];
    const before = input.map((n) => n.id);
    sortNames(input);
    expect(input.map((n) => n.id)).toEqual(before);
  });
});

describe("currentName / birthName", () => {
  it("returns null for an empty history", () => {
    expect(currentName([])).toBeNull();
    expect(birthName([])).toBeNull();
  });

  it("returns the latest as current and earliest as birth", () => {
    const names = [name("a", "Bain", { date: yr(1946), ordinal: 0 }), name("b", "Reed", { date: yr(1969), ordinal: 1 })];
    expect(currentName(names)?.id).toBe("b");
    expect(birthName(names)?.id).toBe("a");
  });

  it("with all-undated names, ordinal decides current", () => {
    const names = [name("a", "Bain", { ordinal: 0 }), name("b", "Reed", { ordinal: 1 })];
    expect(currentName(names)?.surname).toBe("Reed");
    expect(birthName(names)?.surname).toBe("Bain");
  });
});

describe("assemblePersonNames", () => {
  const row = (over: Partial<PersonNameRecord> & { id: string; personId: string }): PersonNameRecord => ({
    given: "Meg",
    surname: "Bain",
    effectiveDate: null,
    reason: "birth",
    relationshipId: null,
    eventId: null,
    mediaId: null,
    prov: "unverified",
    note: null,
    ordinal: 0,
    ...over,
  });

  it("groups rows by person and sorts each history", () => {
    const rows = [
      row({ id: "p1-b", personId: "p1", surname: "Reed", effectiveDate: "1969", reason: "marriage", ordinal: 1 }),
      row({ id: "p1-a", personId: "p1", surname: "Bain", effectiveDate: "1946", ordinal: 0 }),
      row({ id: "p2-a", personId: "p2", surname: "Cole", effectiveDate: "1919", ordinal: 0 }),
    ];
    const out = assemblePersonNames(rows, new Map());
    expect(out.get("p1")!.map((n) => n.id)).toEqual(["p1-a", "p1-b"]);
    expect(out.get("p1")![1].date).toEqual(yr(1969));
    expect(out.get("p2")!.map((n) => n.surname)).toEqual(["Cole"]);
  });

  it("resolves a cited source from the media map", () => {
    const rows = [row({ id: "n1", personId: "p1", mediaId: "M-1" })];
    const mediaById = new Map([["M-1", { id: "M-1", title: "Marriage record", type: "certificate" as const }]]);
    const out = assemblePersonNames(rows, mediaById);
    expect(out.get("p1")![0].source).toEqual({ id: "M-1", title: "Marriage record", type: "certificate" });
  });
});
