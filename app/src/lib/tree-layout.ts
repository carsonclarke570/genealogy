/**
 * Layout engine for the Explorer — a layered family-graph DAG.
 *
 * Unlike the old single-parent tree packer, this places people in generation
 * layers and lets every partner connect upward to THEIR OWN parents' union, so
 * both ancestral lines of a couple are drawn. The pipeline is a small Sugiyama:
 *
 *   1. layer    — gen(person) = longest path over parent edges, then a
 *                 "spouse pull-down" so married-in (ancestor-less) people sit on
 *                 their partner's row instead of floating at the top.
 *   2. order    — DFS seed (families grouped), then a few barycenter sweeps to
 *                 reduce edge crossings; same-gen couples kept adjacent.
 *   3. position — per-row coordinate assignment by isotonic regression (centers
 *                 nodes under their neighbours while respecting min spacing).
 *   4. edges    — spouse connectors + union→child links; the union's child
 *                 anchor hangs just below the lower partner (cross-gen safe).
 *
 * Disconnected family clusters are laid out independently and packed side by
 * side (sharing the generation axis). Pure + deterministic: every sort breaks
 * ties by stable id (optionally birth year first), and records are built with
 * sorted keys upstream, so the same input always yields identical coordinates
 * (the layout recomputes on every render — it must not jitter).
 */
import { type FamilyGraph, type UnionStatus, lineageOf } from "./family-graph";

export { lineageOf as lineage } from "./family-graph";
export type { Lineage } from "./family-graph";

export type TreeMode = "vertical" | "horizontal";

const NODE_W = 236;
const NODE_H = 84;
const ROWV = NODE_H + 80; // generation row pitch (vertical)
const COLU = NODE_W + 42; // packing pitch within a row (vertical)
const COLH = NODE_W + 140; // generation column pitch (horizontal)
const ROWU = NODE_H + 30; // packing pitch within a column (horizontal)
const COMPONENT_GAP = 2; // extra slots between disconnected clusters
const ORDER_SWEEPS = 4;
const COORD_SWEEPS = 4;
const UNION_DROP = 22; // how far the marriage knot sits below/right of a couple

export { NODE_W, NODE_H };

export interface TreeNode {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  gen: number;
  /** A union this person renders with (first partner-union, else child-union). */
  unionId: string | null;
}

interface Point {
  x: number;
  y: number;
}

export type TreeEdge =
  | { kind: "spouse"; rel: UnionStatus; a: Point; b: Point; union: string }
  | { kind: "child"; from: Point; to: Point; union: string; child: string };

/**
 * A drawn marriage/co-parent bond for a same-row couple: a bracket dropping from
 * each partner to a shared "knot" that the children descend from. Rendering this
 * (rather than a faint line between node centres) is what stops a couple reading
 * as two siblings sitting side by side.
 */
export interface Junction {
  union: string;
  /** Where the bracket leaves each partner (their bottom-/right-centre). */
  aDrop: Point;
  bDrop: Point;
  /** The knot the bracket meets at and children hang from. */
  knot: Point;
  rel: UnionStatus;
}

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface Layout {
  nodes: Record<string, TreeNode>;
  edges: TreeEdge[];
  junctions: Junction[];
  bounds: Bounds;
  mode: TreeMode;
  generations: number;
}

/** Sort comparator: birth year (unknown last), then stable id. */
function makeCmp(bornOf: Record<string, number | null | undefined>) {
  return (a: string, b: string) => {
    const ba = bornOf[a] ?? Number.POSITIVE_INFINITY;
    const bb = bornOf[b] ?? Number.POSITIVE_INFINITY;
    if (ba !== bb) return ba - bb;
    return a < b ? -1 : a > b ? 1 : 0;
  };
}

/** gen(person) = longest path over parent edges; cycle-guarded for bad data. */
function assignGenerations(graph: FamilyGraph): Record<string, number> {
  const gen: Record<string, number> = {};
  const visiting = new Set<string>();
  const rank = (p: string): number => {
    if (p in gen) return gen[p];
    if (visiting.has(p)) return 0; // cycle in bad data — cut it
    visiting.add(p);
    let g = 0;
    for (const parent of graph.parentsOf[p] ?? []) g = Math.max(g, rank(parent) + 1);
    visiting.delete(p);
    gen[p] = g;
    return g;
  };
  for (const p of graph.placed) rank(p);

  // Reconcile to a fixpoint, alternating two relaxations (each only ever raises
  // a generation, so this is monotone and terminates):
  //   · spouse pull-down — a parentless partner adopts the max gen of their
  //     union, so people who married in (no recorded ancestors) sit on their
  //     spouse's row instead of floating at the top.
  //   · child push-down — a child sits at least one row below every parent.
  // The push-down is what keeps a *raised* parent from ending up level with
  // their own child: when a married-in spouse is pulled down, the longest-path
  // ranks computed before the pull no longer hold for that couple's descendants,
  // so they must be re-pushed (and that can cascade through further remarriages).
  for (let pass = 0; pass <= graph.placed.length; pass++) {
    let changed = false;
    for (const u of graph.unions) {
      const g = Math.max(...u.partners.map((p) => gen[p] ?? 0));
      for (const p of u.partners) {
        if ((graph.parentsOf[p]?.length ?? 0) === 0 && (gen[p] ?? 0) < g) {
          gen[p] = g;
          changed = true;
        }
      }
    }
    for (const p of graph.placed) {
      for (const parent of graph.parentsOf[p] ?? []) {
        if ((gen[p] ?? 0) < (gen[parent] ?? 0) + 1) {
          gen[p] = (gen[parent] ?? 0) + 1;
          changed = true;
        }
      }
    }
    if (!changed) break;
  }
  return gen;
}

/** Number of generations spanned (deepest parent-chain + 1); 0 if no one is placed. */
export function countGenerations(graph: FamilyGraph): number {
  if (graph.placed.length === 0) return 0;
  const gen = assignGenerations(graph);
  return Math.max(...graph.placed.map((p) => gen[p])) + 1;
}

/** Weakly-connected components over spouse + parent edges (via the unions). */
function findComponents(graph: FamilyGraph): string[][] {
  const root: Record<string, string> = {};
  const find = (x: string): string => {
    while (root[x] !== x) {
      root[x] = root[root[x]];
      x = root[x];
    }
    return x;
  };
  for (const p of graph.placed) root[p] = p;
  const link = (a: string, b: string) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) root[ra < rb ? rb : ra] = ra < rb ? ra : rb;
  };
  for (const u of graph.unions) {
    const members = [...u.partners, ...u.children];
    for (let i = 1; i < members.length; i++) link(members[0], members[i]);
  }
  const groups: Record<string, string[]> = {};
  for (const p of graph.placed) (groups[find(p)] ??= []).push(p);
  // deterministic order: by each group's smallest member
  return Object.values(groups)
    .map((g) => g.sort())
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
}

/** Initial left-to-right order within each gen, via a families-grouped DFS. */
function seedOrder(
  graph: FamilyGraph,
  members: Set<string>,
  gen: Record<string, number>,
  cmp: (a: string, b: string) => number,
): Record<number, string[]> {
  const visited = new Set<string>();
  const index: Record<string, number> = {};
  let counter = 0;
  const mark = (p: string) => {
    if (visited.has(p)) return;
    visited.add(p);
    index[p] = counter++;
  };
  const visit = (p: string) => {
    if (visited.has(p)) return;
    mark(p);
    for (const uid of graph.partnerUnions[p] ?? []) {
      const u = graph.unionById[uid];
      for (const q of u.partners) if (q !== p && members.has(q)) mark(q); // co-partner adjacent
      for (const c of [...u.children].sort(cmp)) if (members.has(c)) visit(c);
    }
  };
  const roots = [...members].filter((p) => (graph.parentsOf[p]?.length ?? 0) === 0).sort(cmp);
  for (const r of roots) visit(r);
  for (const p of [...members].sort(cmp)) visit(p); // safety: anything not reached

  const rows: Record<number, string[]> = {};
  for (const p of members) (rows[gen[p]] ??= []).push(p);
  for (const g of Object.keys(rows)) rows[+g].sort((a, b) => index[a] - index[b]);
  return rows;
}

/** Pull same-gen partners of a union next to each other within a row. */
function gluePartners(graph: FamilyGraph, row: string[], gen: Record<string, number>): string[] {
  const inRow = new Set(row);
  const out: string[] = [];
  const placed = new Set<string>();
  for (const p of row) {
    if (placed.has(p)) continue;
    out.push(p);
    placed.add(p);
    for (const uid of graph.partnerUnions[p] ?? []) {
      for (const q of graph.unionById[uid].partners) {
        if (q !== p && inRow.has(q) && !placed.has(q) && gen[q] === gen[p]) {
          out.push(q);
          placed.add(q);
        }
      }
    }
  }
  return out;
}

/** Mean rank (normalised to [0,1]) of a person's neighbours in their own rows. */
function barycenter(ids: string[], rankOf: Record<string, number>, rowLen: Record<number, number>, gen: Record<string, number>): number | null {
  if (ids.length === 0) return null;
  let sum = 0;
  for (const id of ids) {
    const len = rowLen[gen[id]] ?? 1;
    sum += len > 1 ? rankOf[id] / (len - 1) : 0.5;
  }
  return sum / ids.length;
}

/** Isotonic regression (pool-adjacent-violators, L2): smallest non-decreasing fit. */
function isotonic(t: number[]): number[] {
  const vals: number[] = [];
  const counts: number[] = [];
  const sums: number[] = [];
  for (const v of t) {
    vals.push(v);
    counts.push(1);
    sums.push(v);
    while (vals.length >= 2 && vals[vals.length - 2] > vals[vals.length - 1]) {
      const s = sums.pop()! + sums[sums.length - 1];
      const c = counts.pop()! + counts[counts.length - 1];
      sums[sums.length - 1] = s;
      counts[counts.length - 1] = c;
      vals.pop();
      vals[vals.length - 1] = s / c;
    }
  }
  const out: number[] = [];
  for (let i = 0; i < vals.length; i++) for (let k = 0; k < counts[i]; k++) out.push(vals[i]);
  return out;
}

/**
 * Place a row's centers as close to `desired` as possible while keeping the
 * given order with a minimum centre-to-centre separation. Reduces to isotonic
 * regression after the substitution z[i] = x[i] - i*sep.
 */
function placeRow(order: string[], desired: Record<string, number>, sep: number, pos: Record<string, number>) {
  const t = order.map((p, i) => desired[p] - i * sep);
  const z = isotonic(t);
  order.forEach((p, i) => (pos[p] = z[i] + i * sep));
}

export function compute(
  graph: FamilyGraph,
  mode: TreeMode,
  bornOf: Record<string, number | null | undefined> = {},
): Layout {
  const empty: Layout = {
    nodes: {},
    edges: [],
    junctions: [],
    bounds: { minX: 0, minY: 0, maxX: 1, maxY: 1 },
    mode,
    generations: 0,
  };
  if (graph.placed.length === 0) return empty;

  const cmp = makeCmp(bornOf);
  const gen = assignGenerations(graph);
  const sep = mode === "vertical" ? COLU : ROWU;

  // pos[p] = centre coordinate along the packing axis (x for vertical, y for horizontal).
  const pos: Record<string, number> = {};
  let cursor = 0; // running offset so components don't overlap

  for (const component of findComponents(graph)) {
    const members = new Set(component);
    const rows = seedOrder(graph, members, gen, cmp);
    const gens = Object.keys(rows).map(Number).sort((a, b) => a - b);

    // --- order sweeps (crossing reduction) ---
    const rankOf: Record<string, number> = {};
    const rowLen: Record<number, number> = {};
    const reindex = () => {
      for (const g of gens) {
        rowLen[g] = rows[g].length;
        rows[g].forEach((p, i) => (rankOf[p] = i));
      }
    };
    reindex();
    for (let pass = 0; pass < ORDER_SWEEPS; pass++) {
      const down = pass % 2 === 0;
      const seq = down ? gens : [...gens].reverse();
      for (const g of seq) {
        const bary: Record<string, number> = {};
        for (const p of rows[g]) {
          const neigh = down
            ? graph.parentsOf[p] ?? []
            : [...(graph.childrenOf[p] ?? []), ...partnersInRow(graph, p, members)];
          const b = barycenter(
            neigh.filter((n) => members.has(n)),
            rankOf,
            rowLen,
            gen,
          );
          bary[p] = b ?? (rowLen[g] > 1 ? rankOf[p] / (rowLen[g] - 1) : 0.5);
        }
        rows[g] = [...rows[g]].sort((a, b) => bary[a] - bary[b] || cmp(a, b));
        rows[g] = gluePartners(graph, rows[g], gen);
        reindex();
      }
    }

    // --- coordinate assignment ---
    let localMin = Number.POSITIVE_INFINITY;
    for (const g of gens) rows[g].forEach((p, i) => (pos[p] = i * sep));
    for (let pass = 0; pass < COORD_SWEEPS; pass++) {
      const down = pass % 2 === 0;
      const seq = down ? gens : [...gens].reverse();
      for (const g of seq) {
        const desired: Record<string, number> = {};
        for (const p of rows[g]) {
          const neigh = down
            ? graph.parentsOf[p] ?? []
            : [...(graph.childrenOf[p] ?? []), ...partnersInRow(graph, p, members)];
          const vals = neigh.filter((n) => members.has(n)).map((n) => pos[n]);
          desired[p] = vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : pos[p];
        }
        placeRow(rows[g], desired, sep, pos);
      }
    }
    for (const p of component) localMin = Math.min(localMin, pos[p]);
    // shift this component to start at the running cursor, then advance it
    let localMax = Number.NEGATIVE_INFINITY;
    for (const p of component) {
      pos[p] = pos[p] - localMin + cursor;
      localMax = Math.max(localMax, pos[p]);
    }
    cursor = localMax + sep * (1 + COMPONENT_GAP);
  }

  // --- map (gen, pos) → pixel boxes ---
  const nodes: Record<string, TreeNode> = {};
  for (const p of graph.placed) {
    const g = gen[p];
    const cx = mode === "vertical" ? pos[p] : g * COLH + NODE_W / 2;
    const cy = mode === "vertical" ? g * ROWV + NODE_H / 2 : pos[p];
    nodes[p] = {
      id: p,
      x: cx - NODE_W / 2,
      y: cy - NODE_H / 2,
      w: NODE_W,
      h: NODE_H,
      gen: g,
      unionId: graph.partnerUnions[p]?.[0] ?? graph.childUnion[p] ?? null,
    };
  }

  const centre = (p: string): Point => ({ x: nodes[p].x + NODE_W / 2, y: nodes[p].y + NODE_H / 2 });
  const childTo = (p: string): Point =>
    mode === "vertical" ? { x: centre(p).x, y: nodes[p].y } : { x: nodes[p].x, y: centre(p).y };
  // The point on a partner where the marriage bracket leaves it.
  const dropOf = (p: string): Point =>
    mode === "vertical"
      ? { x: centre(p).x, y: nodes[p].y + NODE_H }
      : { x: nodes[p].x + NODE_W, y: centre(p).y };
  const childAnchor = (partners: string[], drop = 0): Point => {
    if (mode === "vertical") {
      const x = partners.reduce((s, p) => s + centre(p).x, 0) / partners.length;
      const y = Math.max(...partners.map((p) => nodes[p].y + NODE_H)) + drop;
      return { x, y };
    }
    const y = partners.reduce((s, p) => s + centre(p).y, 0) / partners.length;
    const x = Math.max(...partners.map((p) => nodes[p].x + NODE_W)) + drop;
    return { x, y };
  };
  // Two partners are "aligned" when they share a generation row — the common
  // case, drawn as a marriage knot. A cross-generation couple keeps an elbow.
  const aligned = (partners: string[]): boolean =>
    partners.length === 2 &&
    (mode === "vertical"
      ? nodes[partners[0]].y === nodes[partners[1]].y
      : nodes[partners[0]].x === nodes[partners[1]].x);

  const edges: TreeEdge[] = [];
  const junctions: Junction[] = [];
  for (const u of graph.unions) {
    // Where this union's children descend from. A same-row couple gets a knot
    // (drawn as a bracket joining the partners); otherwise the children hang
    // from the couple/solo-parent anchor and a cross-gen couple keeps an elbow.
    let descendFrom: Point;
    if (aligned(u.partners)) {
      const knot = childAnchor(u.partners, UNION_DROP);
      junctions.push({
        union: u.id,
        aDrop: dropOf(u.partners[0]),
        bDrop: dropOf(u.partners[1]),
        knot,
        rel: u.status,
      });
      descendFrom = knot;
    } else {
      if (u.partners.length === 2) {
        edges.push({ kind: "spouse", rel: u.status, a: centre(u.partners[0]), b: centre(u.partners[1]), union: u.id });
      }
      descendFrom = childAnchor(u.partners);
    }
    for (const c of u.children) {
      edges.push({ kind: "child", from: descendFrom, to: childTo(c), union: u.id, child: c });
    }
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const n of Object.values(nodes)) {
    minX = Math.min(minX, n.x);
    minY = Math.min(minY, n.y);
    maxX = Math.max(maxX, n.x + n.w);
    maxY = Math.max(maxY, n.y + n.h);
  }
  const pad = 80;
  const bounds: Bounds = { minX: minX - pad, minY: minY - pad, maxX: maxX + pad, maxY: maxY + pad };
  const generations = Math.max(...graph.placed.map((p) => gen[p])) + 1;
  return { nodes, edges, junctions, bounds, mode, generations };
}

/** A person's co-partners that currently share their generation row. */
function partnersInRow(graph: FamilyGraph, p: string, members: Set<string>): string[] {
  const out: string[] = [];
  for (const uid of graph.partnerUnions[p] ?? []) {
    for (const q of graph.unionById[uid].partners) if (q !== p && members.has(q)) out.push(q);
  }
  return out;
}
