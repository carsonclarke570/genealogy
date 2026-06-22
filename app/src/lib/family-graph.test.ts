import { describe, it, expect } from "vitest";
import {
  buildFamilyGraph,
  relationsOf,
  lineageOf,
  type RelationshipEdge,
} from "./family-graph";

let seq = 0;
const spouse = (a: string, b: string, status: "married" | "divorced" | null = "married"): RelationshipEdge => ({
  id: `s${seq++}`,
  kind: "spouse",
  personId: a,
  relatedId: b,
  status,
});
const parent = (p: string, c: string): RelationshipEdge => ({
  id: `p${seq++}`,
  kind: "parent",
  personId: p,
  relatedId: c,
});

describe("buildFamilyGraph — unions", () => {
  it("makes one marriage union from a spouse edge, keyed by sorted partners", () => {
    const g = buildFamilyGraph([spouse("bob", "amy")]);
    expect(g.unions).toHaveLength(1);
    expect(g.unions[0].partners).toEqual(["amy", "bob"]);
    expect(g.unions[0].status).toBe("married");
  });

  it("attaches a child to its parents' marriage union (both parents recorded)", () => {
    const g = buildFamilyGraph([spouse("bob", "amy"), parent("bob", "kid"), parent("amy", "kid")]);
    expect(g.unions).toHaveLength(1);
    expect(g.unions[0].children).toEqual(["kid"]);
    expect(g.childUnion["kid"]).toBe(g.unions[0].id);
    expect(g.parentsOf["kid"]).toEqual(["amy", "bob"]);
  });

  it("subset-merges: a child with only ONE recorded parent attaches to that parent's marriage", () => {
    // Only mom recorded as kid's parent, but mom is married to dad → kid draws to the couple.
    const g = buildFamilyGraph([spouse("dad", "mom"), parent("mom", "kid")]);
    expect(g.unions).toHaveLength(1);
    expect(g.unions[0].partners).toEqual(["dad", "mom"]);
    expect(g.unions[0].children).toEqual(["kid"]);
  });

  it("does NOT guess when a parent has multiple marriages → standalone solo union", () => {
    const g = buildFamilyGraph([
      spouse("dad", "wife1"),
      spouse("dad", "wife2"),
      parent("dad", "kid"), // only dad recorded; ambiguous which marriage
    ]);
    const kidUnion = g.unionById[g.childUnion["kid"]!];
    expect(kidUnion.partners).toEqual(["dad"]); // solo, not merged into either marriage
    expect(kidUnion.children).toEqual(["kid"]);
  });

  it("co-parents who aren't married form a 2-partner standalone union", () => {
    const g = buildFamilyGraph([parent("a", "kid"), parent("b", "kid")]);
    expect(g.unions).toHaveLength(1);
    expect(g.unions[0].partners).toEqual(["a", "b"]);
    expect(g.unions[0].status).toBeNull();
  });

  it("places everyone in any relationship and excludes the unrelated", () => {
    const g = buildFamilyGraph([spouse("bob", "amy"), parent("bob", "kid"), parent("amy", "kid")]);
    expect(g.placed).toEqual(["amy", "bob", "kid"]);
    // a person with no edges never appears
    expect(g.placed).not.toContain("ghost");
  });

  it("is deterministic regardless of input edge order", () => {
    const edges = [spouse("bob", "amy"), parent("amy", "kid"), parent("bob", "kid")];
    const a = buildFamilyGraph(edges);
    const b = buildFamilyGraph([...edges].reverse());
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});

describe("relationsOf", () => {
  it("derives spouse/parents/children and keeps spouse status", () => {
    const g = buildFamilyGraph([spouse("bob", "amy", "divorced"), parent("bob", "kid"), parent("amy", "kid")]);
    const r = relationsOf(g, "bob");
    expect(r.spouse).toEqual([{ id: "amy", rel: "divorced" }]);
    expect(r.children).toEqual([{ id: "kid" }]);
    const k = relationsOf(g, "kid");
    expect(k.parents.map((p) => p.id)).toEqual(["amy", "bob"]);
  });

  it("resolves siblings via shared parents (works from either parent's side)", () => {
    const g = buildFamilyGraph([
      parent("mom", "a"),
      parent("dad", "a"),
      parent("mom", "b"),
      parent("dad", "b"),
    ]);
    expect(relationsOf(g, "a").siblings).toEqual([{ id: "b" }]);
    expect(relationsOf(g, "b").siblings).toEqual([{ id: "a" }]);
    // a half-sibling sharing just one parent still counts
    const g2 = buildFamilyGraph([parent("mom", "a"), parent("mom", "c"), parent("dad", "a")]);
    expect(relationsOf(g2, "a").siblings).toEqual([{ id: "c" }]);
  });
});

describe("lineageOf", () => {
  it("ascends through BOTH parents and descends through children", () => {
    // grandma+grandpa -> mom ; granny+gramps -> dad ; mom+dad -> kid
    const g = buildFamilyGraph([
      spouse("grandpa", "grandma"),
      parent("grandpa", "mom"),
      parent("grandma", "mom"),
      spouse("gramps", "granny"),
      parent("gramps", "dad"),
      parent("granny", "dad"),
      spouse("mom", "dad"),
      parent("mom", "kid"),
      parent("dad", "kid"),
    ]);
    const lin = lineageOf(g, "kid");
    // both grandparent lines are in the ancestry
    for (const id of ["mom", "dad", "grandpa", "grandma", "gramps", "granny", "kid"]) {
      expect(lin.people.has(id)).toBe(true);
    }
  });

  it("terminates on a cyclic parent chain in bad data", () => {
    // a is parent of b, b is parent of a (impossible, but must not hang)
    const g = buildFamilyGraph([parent("a", "b"), parent("b", "a")]);
    const lin = lineageOf(g, "a");
    expect(lin.people.has("a")).toBe(true);
    expect(lin.people.has("b")).toBe(true);
  });
});
