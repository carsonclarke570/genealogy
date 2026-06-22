import { describe, it, expect } from "vitest";
import { buildFamilyGraph, type RelationshipEdge } from "./family-graph";
import { compute } from "./tree-layout";

let seq = 0;
const spouse = (a: string, b: string, status: "married" | "divorced" | null = "married"): RelationshipEdge => ({
  id: `s${seq++}`, kind: "spouse", personId: a, relatedId: b, status,
});
const parent = (p: string, c: string): RelationshipEdge => ({
  id: `p${seq++}`, kind: "parent", personId: p, relatedId: c,
});

// grandma+grandpa → mom ; granny+gramps → dad ; mom+dad → kid
const twoSidedEdges: RelationshipEdge[] = [
  spouse("grandpa", "grandma"), parent("grandpa", "mom"), parent("grandma", "mom"),
  spouse("gramps", "granny"), parent("gramps", "dad"), parent("granny", "dad"),
  spouse("mom", "dad"), parent("mom", "kid"), parent("dad", "kid"),
];

const finite = (n: number) => Number.isFinite(n);

describe("compute — layered DAG layout", () => {
  it("is deterministic (same input → identical coordinates)", () => {
    const g = buildFamilyGraph(twoSidedEdges);
    const a = compute(g, "vertical");
    const b = compute(g, "vertical");
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("draws BOTH ancestral lines of a couple (each set of grandparents links to its child)", () => {
    const g = buildFamilyGraph(twoSidedEdges);
    const { edges } = compute(g, "vertical");
    const childrenFrom = (union: string) =>
      edges.filter((e) => e.kind === "child" && e.union === union).map((e) => (e as { child: string }).child);
    expect(childrenFrom("un_grandma__grandpa")).toContain("mom");
    expect(childrenFrom("un_gramps__granny")).toContain("dad");
    // and the couple connects down to the grandchild
    expect(childrenFrom("un_dad__mom")).toContain("kid");
  });

  it("ranks generations by longest path (kid two below each grandparent)", () => {
    const g = buildFamilyGraph(twoSidedEdges);
    const { nodes } = compute(g, "vertical");
    expect(nodes["grandpa"].gen).toBe(0);
    expect(nodes["mom"].gen).toBe(1);
    expect(nodes["kid"].gen).toBe(2);
  });

  it("pulls a married-in (ancestor-less) partner down onto their spouse's row", () => {
    const g = buildFamilyGraph([
      spouse("gp1", "gp2"), parent("gp1", "mum"), parent("gp2", "mum"),
      spouse("mum", "marriedIn"), // marriedIn has no recorded parents
    ]);
    const { nodes } = compute(g, "vertical");
    expect(nodes["mum"].gen).toBe(1);
    expect(nodes["marriedIn"].gen).toBe(1); // not floating at gen 0
  });

  it("produces only finite coordinates", () => {
    const g = buildFamilyGraph(twoSidedEdges);
    const layout = compute(g, "vertical");
    for (const n of Object.values(layout.nodes)) {
      expect(finite(n.x) && finite(n.y) && finite(n.w) && finite(n.h)).toBe(true);
    }
    for (const e of layout.edges) {
      const pts = e.kind === "spouse" ? [e.a, e.b] : [e.from, e.to];
      for (const pt of pts) expect(finite(pt.x) && finite(pt.y)).toBe(true);
    }
  });

  it("lays out disconnected families without overlapping them", () => {
    const g = buildFamilyGraph([spouse("a1", "a2"), spouse("b1", "b2")]);
    const layout = compute(g, "vertical");
    const xs = (ids: string[]) => ({
      min: Math.min(...ids.map((i) => layout.nodes[i].x)),
      max: Math.max(...ids.map((i) => layout.nodes[i].x + layout.nodes[i].w)),
    });
    const A = xs(["a1", "a2"]);
    const B = xs(["b1", "b2"]);
    // the two clusters occupy disjoint horizontal ranges
    const disjoint = A.max <= B.min || B.max <= A.min;
    expect(disjoint).toBe(true);
  });

  it("returns an empty layout for an empty graph", () => {
    const layout = compute(buildFamilyGraph([]), "vertical");
    expect(Object.keys(layout.nodes)).toHaveLength(0);
    expect(layout.generations).toBe(0);
  });

  it("supports horizontal mode (generations along x)", () => {
    const g = buildFamilyGraph(twoSidedEdges);
    const { nodes } = compute(g, "horizontal");
    // deeper generation sits further right
    expect(nodes["kid"].x).toBeGreaterThan(nodes["mom"].x);
    expect(nodes["mom"].x).toBeGreaterThan(nodes["grandpa"].x);
  });

  it("draws a same-row couple as a marriage junction (not a faint spouse line)", () => {
    const g = buildFamilyGraph(twoSidedEdges);
    const { junctions, edges } = compute(g, "vertical");
    const unions = junctions.map((j) => j.union);
    expect(unions).toContain("un_grandma__grandpa");
    expect(unions).toContain("un_dad__mom");
    // same-row couples no longer emit a flat spouse line that reads as siblings
    expect(edges.some((e) => e.kind === "spouse")).toBe(false);
  });

  it("hangs a couple's children from the marriage knot", () => {
    const g = buildFamilyGraph(twoSidedEdges);
    const { junctions, edges } = compute(g, "vertical");
    const j = junctions.find((j) => j.union === "un_dad__mom")!;
    const kidEdge = edges.find((e) => e.kind === "child" && e.child === "kid") as
      | { from: { x: number; y: number } }
      | undefined;
    expect(kidEdge?.from.x).toBe(j.knot.x);
    expect(kidEdge?.from.y).toBe(j.knot.y);
  });

  it("carries divorced status onto the junction", () => {
    const g = buildFamilyGraph([
      spouse("h", "w", "divorced"),
      parent("h", "c"),
      parent("w", "c"),
    ]);
    const { junctions } = compute(g, "vertical");
    expect(junctions).toHaveLength(1);
    expect(junctions[0].rel).toBe("divorced");
  });

  it("produces only finite junction coordinates", () => {
    const g = buildFamilyGraph(twoSidedEdges);
    const { junctions } = compute(g, "vertical");
    expect(junctions.length).toBeGreaterThan(0);
    for (const j of junctions) {
      for (const pt of [j.aDrop, j.bDrop, j.knot]) {
        expect(finite(pt.x) && finite(pt.y)).toBe(true);
      }
    }
  });
});
