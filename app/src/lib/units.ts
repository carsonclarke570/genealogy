/**
 * Reconstruct couple-units from normalised relationship edges.
 *
 * Pure (no DB / no server-only) so it can be unit-tested. A unit is anchored by
 * either a partnered person (a spouse row's personId — the blood-line side, by
 * the seed convention) or any other person who appears in a relationship but
 * isn't a couple's partner (a child, or a lone parent). The partner side of a
 * couple renders inside its anchor's unit, so it gets no unit of its own. A
 * unit's `parent` links to the unit anchored by one of the anchor's own
 * parents. Siblings and children fall out of those parent links downstream
 * (see family-data.relationsOf / tree-layout).
 *
 * The "every involved person gets placed" rule is what lets a freshly-connected
 * person leave the Explorer's "unplaced" shelf no matter how they were linked.
 */
import type { Unit } from "./family-data";

export interface RelationshipEdge {
  kind: "spouse" | "parent";
  personId: string;
  relatedId: string;
  status?: "married" | "divorced" | null;
}

export function buildUnits(relationships: RelationshipEdge[]): Unit[] {
  const spouses = relationships.filter((r) => r.kind === "spouse");
  const parentEdges = relationships.filter((r) => r.kind === "parent");

  const parentsOf = new Map<string, string[]>();
  for (const r of parentEdges) {
    const list = parentsOf.get(r.relatedId) ?? [];
    list.push(r.personId);
    parentsOf.set(r.relatedId, list);
  }
  const partnerOf = new Map<string, { partner: string; rel: Unit["rel"] }>();
  const partnered = new Set<string>();
  for (const r of spouses) {
    partnerOf.set(r.personId, { partner: r.relatedId, rel: r.status ?? null });
    partnered.add(r.personId);
    partnered.add(r.relatedId);
  }

  // Anchors: the personId side of every couple, plus every other person who
  // appears in any relationship and isn't a couple's partner. The partner side
  // (a spouse row's relatedId) is drawn inside its anchor's unit, so it never
  // anchors one of its own.
  const partnerSide = new Set(spouses.map((r) => r.relatedId));
  const anchors: string[] = [];
  const seen = new Set<string>();
  const consider = (id: string) => {
    if (seen.has(id)) return;
    // A partner that doesn't also anchor its own couple renders via that couple.
    if (partnerSide.has(id) && !partnerOf.has(id)) return;
    seen.add(id);
    anchors.push(id);
  };
  for (const r of spouses) consider(r.personId);
  for (const r of parentEdges) {
    consider(r.personId); // a parent
    consider(r.relatedId); // their child
  }
  const anchorSet = new Set(anchors);
  const unitId = (anchor: string) => `u_${anchor}`;

  return anchors.map((anchor) => {
    const sp = partnerOf.get(anchor);
    const anchorParent = (parentsOf.get(anchor) ?? []).find((p) => anchorSet.has(p));
    return {
      id: unitId(anchor),
      parent: anchorParent ? unitId(anchorParent) : null,
      anchor,
      partner: sp?.partner ?? null,
      rel: sp?.rel ?? null,
    };
  });
}
