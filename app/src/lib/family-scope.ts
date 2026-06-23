/**
 * Family scope — pick a navigable *neighbourhood* around a focused person for the
 * Explorer's "fog-of-war" view, instead of laying out the entire graph.
 *
 * We expand outward from the focus breadth-first by *degrees of separation* over
 * kin edges, pulling in the closest relatives first (siblings, then aunts/uncles
 * and grandparents, then first cousins, then removed cousins…) until a node
 * budget is hit. Everyone past the frontier is left in the "fog": hidden, but
 * counted on the nearest visible relative so the UI can draw a marker ("3 more
 * ancestors this way"). Clicking a node re-centres the scope on it.
 *
 * Pure + deterministic (no React/DB), unit-tested like family-graph.ts. The
 * Explorer recomputes layout on every render, so the visible set MUST be a
 * total-ordered function of (graph, focus, budget) — every sort breaks ties by
 * birth year then id, exactly like the layout's `makeCmp`.
 */
import { buildFamilyGraph, type FamilyGraph, type RelationshipEdge } from "./family-graph";
import { compute, COLU } from "./tree-layout";

/**
 * Edge weights set the closeness ordering — the single tuning knob. With
 * spouse/sibling = 1 and parent/child = 2 the rings fall out as:
 *   focus(0) · spouse/siblings(1) · parents(2) · aunts-uncles(3) ·
 *   grandparents(4) · first cousins(5) · …
 */
const W_SPOUSE = 1;
const W_SIBLING = 1;
const W_PARENT = 2;
const W_CHILD = 2;
const DEFAULT_BUDGET = 28;

export interface ScopeOpts {
  /** Max visible people (soft — a couple may be completed past it). */
  budget?: number;
  /** Birth years for deterministic tie-breaks (same map the layout uses). */
  bornOf?: Record<string, number | null | undefined>;
}

/** Hidden-kin tallies for one visible person, bucketed by drawing direction. */
export interface FrontierCount {
  up: number; // hidden parents
  down: number; // hidden children
  side: number; // hidden spouses + siblings
}

export interface Scope {
  /** People to lay out + draw. Always contains the focus. */
  visible: Set<string>;
  /** Visible people that touch hidden kin → get a frontier marker. */
  frontier: Map<string, FrontierCount>;
  /** Reachable kin left in the fog (by budget or conflict resolution). */
  dropped: Set<string>;
  /** Degree-of-separation from focus for every reachable person. */
  distance: Map<string, number>;
}

/** Everyone sharing a recorded parent with `p` (mirrors relationsOf's siblings). */
function siblingsOf(graph: FamilyGraph, p: string): string[] {
  const set = new Set<string>();
  for (const parent of graph.parentsOf[p] ?? []) {
    for (const c of graph.childrenOf[parent] ?? []) if (c !== p) set.add(c);
  }
  return [...set];
}

/** Weighted kin neighbours of `p`: [id, weight]. */
function neighbours(graph: FamilyGraph, p: string): Array<[string, number]> {
  const out: Array<[string, number]> = [];
  for (const q of graph.parentsOf[p] ?? []) out.push([q, W_PARENT]);
  for (const q of graph.childrenOf[p] ?? []) out.push([q, W_CHILD]);
  for (const s of graph.spouses[p] ?? []) out.push([s.id, W_SPOUSE]);
  for (const q of siblingsOf(graph, p)) out.push([q, W_SIBLING]);
  return out;
}

export function scopeFamily(graph: FamilyGraph, focusId: string, opts: ScopeOpts = {}): Scope {
  const budget = opts.budget ?? DEFAULT_BUDGET;
  const bornOf = opts.bornOf ?? {};
  const bornCmp = (a: string, b: string): number => {
    const ba = bornOf[a],
      bb = bornOf[b];
    const na = ba == null,
      nb = bb == null;
    if (na && nb) return 0;
    if (na) return 1; // unknown years sort last
    if (nb) return -1;
    return ba! - bb!;
  };

  // --- Dijkstra over the weighted kin graph → distance for every reachable kin.
  const distance = new Map<string, number>([[focusId, 0]]);
  const done = new Set<string>();
  for (;;) {
    let u: string | null = null;
    let du = Infinity;
    for (const [k, dk] of distance) {
      if (done.has(k)) continue;
      if (u === null || dk < du) {
        u = k;
        du = dk;
      }
    }
    if (u === null) break;
    done.add(u);
    for (const [v, w] of neighbours(graph, u)) {
      const nd = du + w;
      if (!distance.has(v) || nd < distance.get(v)!) distance.set(v, nd);
    }
  }

  // --- Admit in closeness order, keeping couples whole.
  const order = [...distance.keys()].sort((a, b) => {
    const d = distance.get(a)! - distance.get(b)!;
    if (d !== 0) return d;
    const c = bornCmp(a, b);
    return c !== 0 ? c : a < b ? -1 : a > b ? 1 : 0;
  });
  const visible = new Set<string>();
  for (const cand of order) {
    if (visible.has(cand)) continue;
    if (visible.size >= budget) break;
    visible.add(cand);
    // never strand half a couple
    for (const uid of graph.partnerUnions[cand] ?? []) {
      for (const partner of graph.unionById[uid].partners) visible.add(partner);
    }
  }

  // --- Resolve residual *geometric* ambiguity (v2: layout-aware). Trial-lay-out
  // the visible set, and while it still has crossings / stretched or coincident
  // unions, fog the farthest-from-focus person feeding the conflict and retry.
  resolveByLayout(graph, visible, distance, bornCmp, focusId, bornOf);

  // --- Keep only what stays connected to the focus through real (parent/child/
  // spouse) edges, so `compute` never gets a floating component or an orphaned
  // sibling whose connecting parent was fogged.
  pruneToConnected(graph, visible, focusId);

  // --- Frontier tallies (after all drops, so fogged kin count as hidden).
  const frontier = new Map<string, FrontierCount>();
  for (const v of visible) {
    const up = (graph.parentsOf[v] ?? []).filter((q) => !visible.has(q)).length;
    const down = (graph.childrenOf[v] ?? []).filter((q) => !visible.has(q)).length;
    const hidSpouse = (graph.spouses[v] ?? []).filter((s) => !visible.has(s.id)).length;
    const hidSib = siblingsOf(graph, v).filter((q) => !visible.has(q)).length;
    const side = hidSpouse + hidSib;
    if (up || down || side) frontier.set(v, { up, down, side });
  }

  const dropped = new Set<string>();
  for (const id of distance.keys()) if (!visible.has(id)) dropped.add(id);

  return { visible, frontier, dropped, distance };
}

/**
 * Reconstruct the raw relationship edges a `FamilyGraph` was built from, so a
 * sub-scope can be re-built (and trial-laid-out) without the caller threading
 * the original rows back in. Spouse status comes from the spouse map; parent
 * edges from `parentsOf`. Edge ids are synthetic — only kind/endpoints/status
 * matter to `buildFamilyGraph` + `compute`.
 */
function graphToRels(graph: FamilyGraph): RelationshipEdge[] {
  const rels: RelationshipEdge[] = [];
  for (const child of Object.keys(graph.parentsOf)) {
    for (const parent of graph.parentsOf[child]) {
      rels.push({ id: `p:${parent}:${child}`, kind: "parent", personId: parent, relatedId: child });
    }
  }
  for (const p of Object.keys(graph.spouses)) {
    for (const s of graph.spouses[p]) {
      if (p < s.id) rels.push({ id: `s:${p}:${s.id}`, kind: "spouse", personId: p, relatedId: s.id, status: s.rel });
    }
  }
  return rels;
}

/** A geometric ambiguity in a trial layout + the people whose removal could fix it. */
export interface LayoutConflict {
  kind: "crossing" | "wide-union" | "coincident-knot" | "cross-gen-union";
  /** Candidate people to fog (the farthest-from-focus one is chosen). */
  candidates: string[];
}

const segCross = (
  p1: { x: number; y: number }, p2: { x: number; y: number },
  p3: { x: number; y: number }, p4: { x: number; y: number },
): boolean => {
  const eq = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.abs(a.x - b.x) < 0.01 && Math.abs(a.y - b.y) < 0.01;
  // shared endpoints (common knot / same child target) are not a crossing
  if (eq(p1, p3) || eq(p1, p4) || eq(p2, p3) || eq(p2, p4)) return false;
  const d = (a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }) =>
    (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  const d1 = d(p3, p4, p1), d2 = d(p3, p4, p2), d3 = d(p1, p2, p3), d4 = d(p1, p2, p4);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
};

/**
 * Detect the genealogically-ambiguous geometry the fog is meant to prevent:
 *   · crossing — two parent→child links that cross (cousins read as siblings),
 *   · wide-union — a same-row couple drawn more than ~1.5 slots apart (a knot
 *     stranded between far-apart partners, e.g. a remarried person with a
 *     sibling who can't sit between both spouses),
 *   · coincident-knot — two unions sharing a marriage knot (children of two
 *     couples fanning from one point),
 *   · cross-gen-union — a parenting couple whose partners sit on different
 *     generation rows (each has recorded ancestry of differing depth, so neither
 *     is pulled down to the other). The layout can only draw them as a diagonal
 *     elbow spanning two rows, reading as "a generation apart"; fogging the
 *     farther partner hides the misalignment behind a frontier indicator.
 * Pure over the trial layout; orientation is the Explorer's default (vertical).
 */
export function detectLayoutConflicts(
  graph: FamilyGraph,
  bornOf: Record<string, number | null | undefined> = {},
): LayoutConflict[] {
  const layout = compute(graph, "vertical", bornOf);
  const out: LayoutConflict[] = [];

  const childEdges = layout.edges.filter((e) => e.kind === "child") as Array<
    Extract<(typeof layout.edges)[number], { kind: "child" }>
  >;
  for (let i = 0; i < childEdges.length; i++) {
    for (let j = i + 1; j < childEdges.length; j++) {
      const a = childEdges[i], b = childEdges[j];
      if (a.child === b.child) continue;
      if (segCross(a.from, a.to, b.from, b.to)) {
        out.push({ kind: "crossing", candidates: [a.child, b.child] });
      }
    }
  }

  // Adjacent partners sit one slot (COLU) apart; a knot is only *stranded*
  // (ambiguous) when a sibling sits between the partners — i.e. ≥2 slots — AND
  // children actually hang from that stranded knot. A wide *childless* marriage
  // has no child-edge to misread, so it is never flagged.
  const WIDE = COLU * 1.5;
  for (const u of graph.unions) {
    if (u.partners.length !== 2 || u.children.length === 0) continue;
    const [n0, n1] = u.partners.map((p) => layout.nodes[p]);
    if (!n0 || !n1 || n0.gen !== n1.gen) continue;
    if (Math.abs(n0.x - n1.x) > WIDE) {
      // What stretches a union wide is usually a partner pulled toward *another*
      // spouse (a remarriage): the union's own slot can't sit adjacent because the
      // partner is flanked by a competing union, forcing a sibling between them.
      // The union's own partners/children may all be the focus's protected nuclear
      // kin, so offering only them leaves resolveByLayout no one to fog. Add the
      // competing spouses (each partner's *other* spouses) — fogging one collapses
      // the remarriage and lets the row reflow adjacent.
      const competing: string[] = [];
      for (const p of u.partners) {
        for (const s of graph.spouses[p] ?? []) if (!u.partners.includes(s.id)) competing.push(s.id);
      }
      out.push({ kind: "wide-union", candidates: [...u.partners, ...u.children, ...competing] });
    }
  }

  // A parenting couple split across two generation rows draws as a diagonal
  // spouse elbow (the layout's `aligned()` fails when the partners' gens differ).
  // Gated on children to match wide-union: a *childless* cross-gen couple has no
  // child-edge to misread, so it's left as a harmless diagonal. Fogging the
  // farther partner collapses the union and lets the nearer partner carry a
  // hidden-spouse frontier marker instead.
  for (const u of graph.unions) {
    if (u.partners.length !== 2 || u.children.length === 0) continue;
    const [n0, n1] = u.partners.map((p) => layout.nodes[p]);
    if (!n0 || !n1 || n0.gen === n1.gen) continue;
    out.push({ kind: "cross-gen-union", candidates: [...u.partners] });
  }

  const knots = layout.junctions;
  for (let i = 0; i < knots.length; i++) {
    for (let j = i + 1; j < knots.length; j++) {
      if (Math.abs(knots[i].knot.x - knots[j].knot.x) < 0.5 && Math.abs(knots[i].knot.y - knots[j].knot.y) < 0.5) {
        const ua = graph.unionById[knots[i].union], ub = graph.unionById[knots[j].union];
        out.push({ kind: "coincident-knot", candidates: [...ua.partners, ...ua.children, ...ub.partners, ...ub.children] });
      }
    }
  }
  return out;
}

/**
 * Layout-aware conflict resolution (the "fog on conflict" the design promised).
 * Trial-lay-out the visible scope; while it still contains a geometric
 * ambiguity, fog the farthest-from-focus person feeding any conflict and retry.
 * Always shrinks `visible` by one per pass over a person that is not the focus,
 * so it terminates; `pruneToConnected` then sweeps anything it strands.
 * Triggers on conflict regardless of budget — a small family with a bad local
 * arrangement (the remarriage/cousin cases) gets protected too.
 */
function resolveByLayout(
  graph: FamilyGraph,
  visible: Set<string>,
  distance: Map<string, number>,
  bornCmp: (a: string, b: string) => number,
  focusId: string,
  bornOf: Record<string, number | null | undefined>,
): void {
  const allRels = graphToRels(graph);
  for (let pass = 0; pass < graph.placed.length; pass++) {
    const sub = allRels.filter((e) => visible.has(e.personId) && visible.has(e.relatedId));
    const conflicts = detectLayoutConflicts(buildFamilyGraph(sub), bornOf);
    if (conflicts.length === 0) break;

    // Pick the farthest-from-focus candidate across all conflicts. Never fog the
    // focus's nuclear family (distance ≤ 2: spouse, siblings, parents, children) —
    // hiding someone's parent to declutter a distant cousin would be worse than
    // the crossing. If only protected kin feed a conflict, we leave it drawn.
    // Ties: keep the closer birth year / smaller id visible → fog later.
    const PROTECT = 2;
    let victim: string | null = null;
    let best = -1;
    for (const c of conflicts) {
      for (const cand of c.candidates) {
        if (cand === focusId || !visible.has(cand)) continue;
        const d = distance.get(cand) ?? Infinity;
        if (d <= PROTECT) continue;
        if (d > best || (d === best && victim !== null && (bornCmp(cand, victim) > 0 || (bornCmp(cand, victim) === 0 && cand > victim)))) {
          best = d;
          victim = cand;
        }
      }
    }
    if (victim === null) break; // only the focus feeds the conflict — can't reduce
    visible.delete(victim);
    pruneToConnected(graph, visible, focusId);
  }
}

/** Drop visible people not reachable from the focus over parent/child/spouse edges. */
function pruneToConnected(graph: FamilyGraph, visible: Set<string>, focusId: string): void {
  if (!visible.has(focusId)) return;
  const keep = new Set<string>([focusId]);
  const stack = [focusId];
  while (stack.length) {
    const p = stack.pop()!;
    const adj = [
      ...(graph.parentsOf[p] ?? []),
      ...(graph.childrenOf[p] ?? []),
      ...(graph.spouses[p] ?? []).map((s) => s.id),
    ];
    for (const q of adj) {
      if (visible.has(q) && !keep.has(q)) {
        keep.add(q);
        stack.push(q);
      }
    }
  }
  for (const v of [...visible]) if (!keep.has(v)) visible.delete(v);
}

/** Predicate: a relationship edge whose endpoints are both visible (drop the rest). */
export function edgeWithinScope(visible: Set<string>): (e: RelationshipEdge) => boolean {
  return (e) => visible.has(e.personId) && visible.has(e.relatedId);
}

/**
 * A deterministic "home" person to open the Explorer on: the most-connected
 * person (parents + children + spouses + siblings), ties broken by id.
 */
export function homePerson(graph: FamilyGraph): string {
  let best = "";
  let bestDeg = -1;
  for (const p of graph.placed) {
    const deg =
      (graph.parentsOf[p]?.length ?? 0) +
      (graph.childrenOf[p]?.length ?? 0) +
      (graph.spouses[p]?.length ?? 0) +
      siblingsOf(graph, p).length;
    if (deg > bestDeg || (deg === bestDeg && p < best)) {
      bestDeg = deg;
      best = p;
    }
  }
  return best || graph.placed[0] || "";
}
