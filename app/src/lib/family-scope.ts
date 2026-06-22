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
import type { FamilyGraph, RelationshipEdge } from "./family-graph";

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

  // --- Resolve the irreducible remarriage-with-siblings conflict (v1: structural).
  resolveConflicts(graph, visible, distance, bornCmp);

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
 * A person remarried (≥2 fully-visible couples) who also has a visible sibling
 * can't keep both spouses adjacent AND stay in their sibling block — one spouse
 * edge would cross a sibling. Keep the couple closest to focus and fog the
 * competing spouse(s); `pruneToConnected` then sweeps any in-law branch that
 * dangled off them. Deterministic: closeness, then birth year, then id.
 */
function resolveConflicts(
  graph: FamilyGraph,
  visible: Set<string>,
  distance: Map<string, number>,
  bornCmp: (a: string, b: string) => number,
): void {
  const unionDist = (uid: string): number => {
    const u = graph.unionById[uid];
    const ds = [...u.partners, ...u.children]
      .filter((m) => visible.has(m))
      .map((m) => distance.get(m) ?? Infinity);
    return ds.length ? Math.min(...ds) : Infinity;
  };
  for (const x of [...visible].sort()) {
    const couples = (graph.partnerUnions[x] ?? []).filter((uid) => {
      const u = graph.unionById[uid];
      return u.partners.length === 2 && u.partners.every((p) => visible.has(p));
    });
    if (couples.length < 2) continue;
    if (!siblingsOf(graph, x).some((s) => visible.has(s))) continue; // not in a sibling block
    const keep = [...couples].sort((a, b) => unionDist(a) - unionDist(b) || (a < b ? -1 : 1))[0];
    for (const uid of couples) {
      if (uid === keep) continue;
      const partner = graph.unionById[uid].partners.find((p) => p !== x);
      if (partner) visible.delete(partner);
    }
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
