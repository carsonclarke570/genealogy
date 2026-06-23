import { describe, it, expect } from "vitest";
import { buildFamilyGraph, type RelationshipEdge } from "./family-graph";
import { scopeFamily, homePerson, edgeWithinScope, detectLayoutConflicts } from "./family-scope";

let seq = 0;
const spouse = (a: string, b: string): RelationshipEdge => ({
  id: `s${seq++}`, kind: "spouse", personId: a, relatedId: b, status: "married",
});
const parent = (p: string, c: string): RelationshipEdge => ({
  id: `p${seq++}`, kind: "parent", personId: p, relatedId: c,
});

// me+wife→kid→gkid ; mom+dad→{me,bro} ; gpa+gma→{dad,uncle} ; uncle→cuz
const family: RelationshipEdge[] = [
  spouse("me", "wife"), parent("me", "kid"), parent("wife", "kid"), parent("kid", "gkid"),
  parent("mom", "me"), parent("dad", "me"), parent("mom", "bro"), parent("dad", "bro"),
  spouse("mom", "dad"),
  parent("gpa", "dad"), parent("gma", "dad"), parent("gpa", "uncle"), parent("gma", "uncle"),
  spouse("gpa", "gma"),
  parent("uncle", "cuz"),
];

describe("scopeFamily — degrees of separation", () => {
  const g = buildFamilyGraph(family);

  it("ranks kin by closeness: siblings < grandparents < cousins", () => {
    const { distance } = scopeFamily(g, "me", { budget: 100 });
    expect(distance.get("bro")).toBe(1);
    expect(distance.get("wife")).toBe(1);
    expect(distance.get("mom")).toBe(2);
    expect(distance.get("kid")).toBe(2);
    expect(distance.get("uncle")).toBe(3);
    expect(distance.get("gpa")).toBe(4);
    expect(distance.get("cuz")).toBe(5);
    expect(distance.get("bro")!).toBeLessThan(distance.get("gpa")!);
    expect(distance.get("gpa")!).toBeLessThan(distance.get("cuz")!);
  });

  it("admits closest-first up to budget, never stranding half a couple", () => {
    const { visible } = scopeFamily(g, "me", { budget: 5 });
    // both couples are whole: admitting `dad` pulls `mom`, `me` pulls `wife`
    expect([...visible].sort()).toEqual(["bro", "dad", "me", "mom", "wife"]);
    // far kin stay in the fog
    expect(visible.has("cuz")).toBe(false);
    expect(visible.has("gpa")).toBe(false);
    expect(visible.has("kid")).toBe(false);
  });

  it("tallies frontier counts by direction (up / down / side)", () => {
    const { frontier, visible } = scopeFamily(g, "me", { budget: 6 });
    // budget-6 neighbourhood: me, wife, bro, dad, mom, kid
    expect([...visible].sort()).toEqual(["bro", "dad", "kid", "me", "mom", "wife"]);
    // dad's parents (gpa,gma) hidden → up2; his sibling uncle hidden → side1
    expect(frontier.get("dad")).toEqual({ up: 2, down: 0, side: 1 });
    // kid's child gkid hidden → down1
    expect(frontier.get("kid")).toEqual({ up: 0, down: 1, side: 0 });
    // fully-surrounded people get no marker
    expect(frontier.has("me")).toBe(false);
  });

  it("is deterministic — identical visible set + frontier across calls", () => {
    const a = scopeFamily(g, "me", { budget: 6 });
    const b = scopeFamily(g, "me", { budget: 6 });
    expect([...a.visible].sort()).toEqual([...b.visible].sort());
    expect(JSON.stringify([...a.frontier].sort())).toBe(JSON.stringify([...b.frontier].sort()));
  });
});

describe("scopeFamily — remarriage-with-siblings conflict", () => {
  // christa (sibling beth) married edward (→carson) then andrew (→mabel)
  const conflict: RelationshipEdge[] = [
    spouse("dolores", "john"), parent("dolores", "christa"), parent("john", "christa"),
    parent("dolores", "beth"), parent("john", "beth"),
    spouse("edward", "christa"), parent("edward", "carson"), parent("christa", "carson"),
    spouse("christa", "andrew"), parent("christa", "mabel"), parent("andrew", "mabel"),
  ];
  const g = buildFamilyGraph(conflict);

  it("fogs the farther competing spouse, keeping the couple nearest focus", () => {
    const { visible } = scopeFamily(g, "carson", { budget: 100 });
    // carson's parents' marriage is kept intact...
    expect(visible.has("christa")).toBe(true);
    expect(visible.has("edward")).toBe(true);
    expect(visible.has("beth")).toBe(true); // christa's sibling stays
    // ...christa's second husband is pushed into the fog (no crossing edge)
    expect(visible.has("andrew")).toBe(false);
  });

  it("produces no one-sided spouse edge after filtering to the scope", () => {
    const { visible } = scopeFamily(g, "carson", { budget: 100 });
    const kept = conflict.filter(edgeWithinScope(visible));
    const dangling = kept.filter(
      (e) => e.kind === "spouse" && (!visible.has(e.personId) || !visible.has(e.relatedId)),
    );
    expect(dangling).toHaveLength(0);
    expect(kept.some((e) => e.personId === "andrew" || e.relatedId === "andrew")).toBe(false);
  });

  it("homePerson is the most-connected person", () => {
    expect(homePerson(g)).toBe("christa");
  });
});

describe("scopeFamily — layout-aware fog (geometric ambiguity)", () => {
  // dad & uncle are siblings; me is dad's child, cousin is uncle's child (same
  // generation). me marries a spouse whose own parents sit on the far side, so
  // the layout can't keep me under my parents AND beside my spouse — the cousin
  // link crosses. The scope must fog the farther branch, not draw the crossing.
  const cousins: RelationshipEdge[] = [
    spouse("gpa", "gma"), parent("gpa", "dad"), parent("gma", "dad"), parent("gpa", "uncle"), parent("gma", "uncle"),
    spouse("dad", "mom"), parent("dad", "me"), parent("mom", "me"),
    spouse("uncle", "aunt"), parent("uncle", "cousin"), parent("aunt", "cousin"),
    spouse("me", "spouse"), parent("sdad", "spouse"), parent("smom", "spouse"), spouse("sdad", "smom"),
  ];
  const g = buildFamilyGraph(cousins);

  it("leaves no geometric conflict in any scoped layout", () => {
    for (const focus of g.placed) {
      const { visible } = scopeFamily(g, focus, { budget: 100 });
      const sub = cousins.filter(edgeWithinScope(visible));
      expect(detectLayoutConflicts(buildFamilyGraph(sub))).toHaveLength(0);
    }
  });

  it("never fogs the focus's nuclear family (distance ≤ 2)", () => {
    const { distance, dropped } = scopeFamily(g, "me", { budget: 100 });
    for (const p of dropped) expect(distance.get(p)!).toBeGreaterThan(2);
    // ...and a conflict that only the nuclear family feeds is left drawn, never
    // resolved by hiding a parent/child/sibling/spouse.
    const { visible } = scopeFamily(g, "me", { budget: 100 });
    for (const close of ["mom", "dad", "spouse"]) expect(visible.has(close)).toBe(true);
  });
});
