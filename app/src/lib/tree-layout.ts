/**
 * Tree layout engine for the Explorer.
 *
 * Ported from the design prototype (hf/layout.js): lays out the couple-unit tree
 * abstractly, then maps it to vertical / horizontal / radial pixel coordinates,
 * and computes spouse + parent→child edges and lineage highlighting. Pure
 * functions — no DOM, no React.
 */
import { type Unit } from "./family-data";

export type TreeMode = "vertical" | "horizontal" | "radial";

const NODE_W = 236;
const NODE_H = 84;
const GAPU = 0.5; // gap between sibling units, in box-units
const COLU = NODE_W + 42; // px per box-unit, packing axis (vertical mode)
const ROWV = NODE_H + 80; // px per generation row (vertical mode)
const ROWU = NODE_H + 30; // px per box-unit, packing axis (horizontal mode)
const COLH = NODE_W + 140; // px per generation column (horizontal mode)

export { NODE_W, NODE_H };

interface PackedUnit extends Unit {
  _start: number;
  _center: number;
}

export interface TreeNode {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  gen: number;
  unitId: string;
  anchor: boolean;
}

interface Point {
  x: number;
  y: number;
}

export type TreeEdge =
  | { kind: "spouse"; rel: "married" | "divorced" | null; a: Point; b: Point; unitId: string }
  | { kind: "parent"; from: Point; to: Point; childUnit: string; parentUnit: string };

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface Layout {
  nodes: Record<string, TreeNode>;
  edges: TreeEdge[];
  bounds: Bounds;
  mode: TreeMode;
}

function buildIndexes(units: Unit[]) {
  const byUnit: Record<string, PackedUnit> = {};
  units.forEach((u) => (byUnit[u.id] = { ...u, _start: 0, _center: 0 }));
  const childrenOf: Record<string, string[]> = {};
  units.forEach((u) => {
    if (u.parent) (childrenOf[u.parent] = childrenOf[u.parent] || []).push(u.id);
  });
  const unitOfPerson: Record<string, string> = {};
  units.forEach((u) => {
    unitOfPerson[u.anchor] = u.id;
    if (u.partner) unitOfPerson[u.partner] = u.id;
  });
  return { byUnit, childrenOf, unitOfPerson };
}

const nBoxes = (u: PackedUnit) => (u.partner ? 2 : 1);

export function compute(units: Unit[], mode: TreeMode): Layout {
  const { byUnit, childrenOf } = buildIndexes(units);
  const depth: Record<string, number> = {};
  let cursor = 0;

  function place(uid: string, d: number) {
    const u = byUnit[uid];
    depth[uid] = d;
    const kids = childrenOf[uid] || [];
    const w = nBoxes(u);
    if (kids.length === 0) {
      u._start = cursor;
      cursor += w + GAPU;
    } else {
      kids.forEach((k) => place(k, d + 1));
      const first = byUnit[kids[0]];
      const last = byUnit[kids[kids.length - 1]];
      const center = (first._center + last._center) / 2;
      u._start = center - w / 2;
      cursor = Math.max(cursor, u._start + w + GAPU);
    }
    u._center = u._start + w / 2;
  }

  units.filter((u) => !u.parent).forEach((u) => place(u.id, 0));
  let min = Infinity;
  units.forEach((u) => (min = Math.min(min, byUnit[u.id]._start)));
  units.forEach((u) => {
    byUnit[u.id]._start -= min;
    byUnit[u.id]._center -= min;
  });

  let maxCenter = 0;
  units.forEach((u) => (maxCenter = Math.max(maxCenter, byUnit[u.id]._center)));

  function boxes(u: PackedUnit): Record<string, Point> {
    const out: Record<string, Point> = {};
    if (mode === "vertical") {
      const y = depth[u.id] * ROWV;
      out[u.anchor] = { x: u._start * COLU, y };
      if (u.partner) out[u.partner] = { x: (u._start + 1) * COLU, y };
    } else if (mode === "horizontal") {
      const x = depth[u.id] * COLH;
      out[u.anchor] = { x, y: u._start * ROWU };
      if (u.partner) out[u.partner] = { x, y: (u._start + 1) * ROWU };
    } else {
      const spread = (300 * Math.PI) / 180;
      const start = (-150 * Math.PI) / 180 - Math.PI / 2;
      const ring = 250;
      const ang = start + (u._center / (maxCenter || 1)) * spread;
      const r = depth[u.id] === 0 ? 0 : 120 + depth[u.id] * ring * 0.62;
      const cx = Math.cos(ang) * r;
      const cy = Math.sin(ang) * r;
      if (u.partner) {
        const tx = -Math.sin(ang);
        const ty = Math.cos(ang);
        const off = NODE_W * 0.58;
        out[u.anchor] = { x: cx - tx * off - NODE_W / 2, y: cy - ty * off - NODE_H / 2 };
        out[u.partner] = { x: cx + tx * off - NODE_W / 2, y: cy + ty * off - NODE_H / 2 };
      } else {
        out[u.anchor] = { x: cx - NODE_W / 2, y: cy - NODE_H / 2 };
      }
    }
    return out;
  }

  const nodes: Record<string, TreeNode> = {};
  units.forEach((unit) => {
    const u = byUnit[unit.id];
    const b = boxes(u);
    Object.keys(b).forEach((pid) => {
      nodes[pid] = {
        id: pid,
        x: b[pid].x,
        y: b[pid].y,
        w: NODE_W,
        h: NODE_H,
        gen: depth[u.id],
        unitId: u.id,
        anchor: pid === u.anchor,
      };
    });
  });

  const center = (pid: string): Point => ({
    x: nodes[pid].x + NODE_W / 2,
    y: nodes[pid].y + NODE_H / 2,
  });

  const edges: TreeEdge[] = [];
  units.forEach((unit) => {
    const u = byUnit[unit.id];
    if (u.partner)
      edges.push({ kind: "spouse", rel: u.rel, a: center(u.anchor), b: center(u.partner), unitId: u.id });
  });
  units.forEach((unit) => {
    const u = byUnit[unit.id];
    if (!u.parent) return;
    const p = byUnit[u.parent];
    const pcA = center(p.anchor);
    const pcB = p.partner ? center(p.partner) : pcA;
    const from = { x: (pcA.x + pcB.x) / 2, y: (pcA.y + pcB.y) / 2 };
    const to = center(u.anchor);
    edges.push({ kind: "parent", from, to, childUnit: u.id, parentUnit: p.id });
  });

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  Object.values(nodes).forEach((n) => {
    minX = Math.min(minX, n.x);
    minY = Math.min(minY, n.y);
    maxX = Math.max(maxX, n.x + n.w);
    maxY = Math.max(maxY, n.y + n.h);
  });
  const pad = 80;
  const bounds: Bounds = { minX: minX - pad, minY: minY - pad, maxX: maxX + pad, maxY: maxY + pad };
  return { nodes, edges, bounds, mode };
}

export interface Lineage {
  people: Set<string>;
  units: Set<string>;
}

export function lineage(units: Unit[], focusId: string): Lineage {
  const { byUnit, childrenOf, unitOfPerson } = buildIndexes(units);
  const uid = unitOfPerson[focusId];
  if (!uid) return { people: new Set(), units: new Set() };

  const up: string[] = [];
  let cur: PackedUnit | undefined = byUnit[uid];
  while (cur && cur.parent) {
    up.push(cur.parent);
    cur = byUnit[cur.parent];
  }
  const down: string[] = [];
  (function walk(u: string) {
    (childrenOf[u] || []).forEach((k) => {
      down.push(k);
      walk(k);
    });
  })(uid);

  const unitSet = new Set<string>([uid, ...up, ...down]);
  const people = new Set<string>();
  unitSet.forEach((u2) => {
    const u = byUnit[u2];
    people.add(u.anchor);
    if (u.partner) people.add(u.partner);
  });
  return { people, units: unitSet };
}
