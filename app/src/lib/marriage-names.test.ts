import { describe, it, expect } from "vitest";
import { composeMarriageNameDrafts, type FlaggedSpouse } from "./marriage-names";

// The pure compose/dedup core of "took spouse's surname". The DB resolution
// (edges, surnames, existing rows) is faked here via the lookup maps.

const base = {
  given: "Eleanor Margaret",
  relBySpouse: new Map([["spouseA", "relA"]]),
  surnameByPerson: new Map([["spouseA", "Reed"]]),
  existingByRel: new Map<string, string>(),
  manualRelIds: new Set<string>(),
};
const flag = (over: Partial<FlaggedSpouse> = {}): FlaggedSpouse => ({
  spousePersonId: over.spousePersonId ?? "spouseA",
  marriedDate: over.marriedDate ?? "1969",
  prov: over.prov ?? "unverified",
});

describe("composeMarriageNameDrafts", () => {
  it("composes a marriage name change adopting the spouse's surname, keeping given names", () => {
    const [d, ...rest] = composeMarriageNameDrafts({ ...base, flagged: [flag()] });
    expect(rest).toHaveLength(0);
    expect(d).toMatchObject({
      id: null,
      given: "Eleanor Margaret",
      surname: "Reed",
      effectiveDate: "1969",
      reason: "marriage",
      causeRelationshipId: "relA",
      causeEventId: null,
      mediaId: null,
    });
  });

  it("reuses an existing marriage name row's id (idempotent re-save)", () => {
    const drafts = composeMarriageNameDrafts({
      ...base,
      existingByRel: new Map([["relA", "existing-name-id"]]),
      flagged: [flag()],
    });
    expect(drafts[0].id).toBe("existing-name-id");
  });

  it("skips an edge a manual name draft already covers (no duplicate)", () => {
    const drafts = composeMarriageNameDrafts({
      ...base,
      manualRelIds: new Set(["relA"]),
      flagged: [flag()],
    });
    expect(drafts).toHaveLength(0);
  });

  it("skips a flag whose spouse edge didn't resolve", () => {
    const drafts = composeMarriageNameDrafts({
      ...base,
      relBySpouse: new Map(),
      flagged: [flag()],
    });
    expect(drafts).toHaveLength(0);
  });

  it("skips when the spouse's surname is unknown", () => {
    const drafts = composeMarriageNameDrafts({
      ...base,
      surnameByPerson: new Map(),
      flagged: [flag()],
    });
    expect(drafts).toHaveLength(0);
  });

  it("emits at most one draft per edge even if flagged twice", () => {
    const drafts = composeMarriageNameDrafts({ ...base, flagged: [flag(), flag()] });
    expect(drafts).toHaveLength(1);
  });

  it("carries the marriage's confidence and date onto the name change", () => {
    const [d] = composeMarriageNameDrafts({
      ...base,
      flagged: [flag({ prov: "verified", marriedDate: "1969-06-14" })],
    });
    expect(d.prov).toBe("verified");
    expect(d.effectiveDate).toBe("1969-06-14");
  });
});
