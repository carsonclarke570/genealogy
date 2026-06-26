import { describe, it, expect } from "vitest";
import { originalValue, seedFromPerson, syntheticPerson } from "./registry";
import { makeFixture } from "./fixtures";

describe("registry.originalValue", () => {
  const d = makeFixture();
  const p = d.people.P1;

  it("reads person identity fields", () => {
    expect(originalValue(p, "person", "given")).toBe("Eleanor Margaret");
    expect(originalValue(p, "person", "surname")).toBe("Whitfield");
    expect(originalValue(p, "person", "living")).toBe("living");
  });

  it("reads birth date as a partial date and place as a location", () => {
    expect(originalValue(p, "life", "birth.date")).toMatchObject({ year: 1915 });
    expect(originalValue(p, "life", "birth.place")).toMatchObject({ label: "Boston, MA" });
  });

  it("returns null death fields for a living person", () => {
    expect(originalValue(p, "life", "death.date")).toBeNull();
    expect(originalValue(p, "life", "death.place")).toBeNull();
  });
});

describe("registry.seedFromPerson", () => {
  const d = makeFixture();
  const draft = seedFromPerson(d, d.people.P1);

  it("starts with no leaf changes", () => {
    expect(draft.leaves).toEqual({});
  });

  it("seeds existing relationships with their real edge ids", () => {
    const parent = draft.rels.find((r) => r.type === "parent");
    const spouse = draft.rels.find((r) => r.type === "spouse");
    expect(parent?._id).toBe("edge-parent");
    expect(parent?._existing).toBe(true);
    expect(spouse?._id).toBe("edge-spouse");
    expect(spouse?.person).toBe("P3");
  });

  it("seeds residences but excludes census-derived ones", () => {
    expect(draft.residences.map((r) => r._id)).toEqual(["RES1"]);
  });

  it("seeds stored events (stripping the ev- prefix) and skips auto events", () => {
    expect(draft.events).toHaveLength(1);
    expect(draft.events[0]._id).toBe("EV1");
    expect(draft.events[0].type).toBe("military");
  });
});

describe("registry.syntheticPerson", () => {
  it("builds a usable Person from a quick-add spec", () => {
    const p = syntheticPerson({ tempId: "new-1", given: "Henry", surname: "Whitfield", sex: "m", bornYear: 1885 });
    expect(p.id).toBe("new-1");
    expect(p.living).toBe(true);
    expect(originalValue(p, "life", "birth.date")).toMatchObject({ year: 1885 });
    expect(p.names[0].reason).toBe("birth");
  });
});
