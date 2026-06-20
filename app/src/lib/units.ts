/**
 * Reconstruct couple-units from normalised relationship edges.
 *
 * Pure (no DB / no server-only) so it can be unit-tested. A unit is anchored by
 * either a partnered person (a spouse row's personId — the blood-line side, by
 * the seed convention) or a child with no spouse; its `parent` links to the unit
 * anchored by one of the anchor's own parents. Siblings and children fall out of
 * those parent links downstream (see family-data.relationsOf / tree-layout).
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

  const anchors: string[] = [...spouses.map((r) => r.personId)];
  for (const child of parentsOf.keys()) {
    if (!partnered.has(child)) anchors.push(child);
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
