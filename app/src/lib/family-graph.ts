/**
 * Family graph — derive a DAG view of the family from normalised relationship
 * edges. Replaces the old single-parent "couple-unit" model (units.ts): there a
 * couple hung from only one partner's parents (the "anchor"), so the other
 * partner's ancestry had nowhere to attach. Here every partner keeps their own
 * link upward to their own parents, so BOTH ancestral lines of a couple show.
 *
 * Pure (no DB / no server-only) so it can be unit-tested and run on the client.
 *
 * The central abstraction is a **union**: a co-parenting / marriage group,
 * identified by its sorted set of partner ids. A union is drawn as its partners
 * side by side, connects down to its children, and each partner connects up to
 * their own parents' union. Unions come from spouse edges and from the
 * parent-sets of children (see buildFamilyGraph for the merge heuristic).
 */
import type { Relations } from "./family-data";

export interface RelationshipEdge {
  /** The relationship row id — needed so the edit form can remove a specific edge. */
  id: string;
  kind: "spouse" | "parent";
  personId: string;
  relatedId: string;
  status?: "married" | "divorced" | null;
  /** Spouse edges only: canonical partial-date strings the timeline reads. */
  marriedDate?: string | null;
  divorcedDate?: string | null;
}

export type UnionStatus = "married" | "divorced" | null;

export interface Union {
  /** `un_` + sorted partner ids joined by `__`. Stable + deterministic. */
  id: string;
  /** 1 or 2 partner ids, sorted. A lone/solo parent yields a 1-partner union. */
  partners: string[];
  status: UnionStatus;
  /** Child person ids, sorted. */
  children: string[];
}

export interface Spouse {
  id: string;
  rel: UnionStatus;
}

export interface FamilyGraph {
  unions: Union[];
  unionById: Record<string, Union>;
  /** person → ids of unions they are a partner in (remarriage ⇒ several). */
  partnerUnions: Record<string, string[]>;
  /** person → the union they are a child of (their parent-set's union), or null. */
  childUnion: Record<string, string | null>;
  /** person → recorded parent ids (sorted). */
  parentsOf: Record<string, string[]>;
  /** person → recorded child ids (sorted). */
  childrenOf: Record<string, string[]>;
  /** person → their spouses (from spouse edges), deduped + sorted. */
  spouses: Record<string, Spouse[]>;
  /** every person that appears in any relationship (gets drawn on the canvas). */
  placed: string[];
}

const unionKey = (partners: string[]): string => "un_" + [...partners].sort().join("__");
const sortedUnique = (xs: Iterable<string>): string[] => [...new Set(xs)].sort();

/** Re-key a record with sorted keys, so the whole graph is order-independent. */
function byKey<T>(obj: Record<string, T>): Record<string, T> {
  const out: Record<string, T> = {};
  for (const k of Object.keys(obj).sort()) out[k] = obj[k];
  return out;
}

/** Merge two union statuses: an explicit "married" wins; otherwise keep what's set. */
function mergeStatus(a: UnionStatus, b: UnionStatus): UnionStatus {
  if (a === "married" || b === "married") return "married";
  return a ?? b ?? null;
}

export function buildFamilyGraph(rels: RelationshipEdge[]): FamilyGraph {
  const spouseRels = rels.filter((r) => r.kind === "spouse");
  const parentRels = rels.filter((r) => r.kind === "parent");

  // parentsOf / childrenOf (deduped, sorted for determinism).
  const parentSets: Record<string, Set<string>> = {};
  const childSets: Record<string, Set<string>> = {};
  for (const r of parentRels) {
    (parentSets[r.relatedId] ??= new Set()).add(r.personId);
    (childSets[r.personId] ??= new Set()).add(r.relatedId);
  }
  const parentsOf: Record<string, string[]> = {};
  for (const k of Object.keys(parentSets)) parentsOf[k] = [...parentSets[k]].sort();
  const childrenOf: Record<string, string[]> = {};
  for (const k of Object.keys(childSets)) childrenOf[k] = [...childSets[k]].sort();

  // Marriage unions from spouse edges, plus the raw spouses map.
  const unionMap = new Map<string, Union>();
  const spouseDraft: Record<string, Spouse[]> = {};
  for (const r of spouseRels) {
    const partners = [r.personId, r.relatedId].sort();
    const k = unionKey(partners);
    const status = r.status ?? null;
    const existing = unionMap.get(k);
    if (existing) existing.status = mergeStatus(existing.status, status);
    else unionMap.set(k, { id: k, partners, status, children: [] });
    (spouseDraft[r.personId] ??= []).push({ id: r.relatedId, rel: status });
    (spouseDraft[r.relatedId] ??= []).push({ id: r.personId, rel: status });
  }
  const marriageUnions = [...unionMap.values()];

  // Resolve each child's parent-set to a union.
  //   - parent-set ⊆ exactly one marriage union → attach to it (handles "only
  //     one parent recorded but they're married"; the child draws to the couple).
  //   - otherwise → a standalone union keyed by the exact parent-set (co-parents
  //     who aren't married, a solo parent, or an ambiguous case we won't guess).
  const childUnion: Record<string, string | null> = {};
  for (const child of Object.keys(parentsOf)) {
    const pset = parentsOf[child];
    const supersets = marriageUnions.filter((u) => pset.every((p) => u.partners.includes(p)));
    let union: Union;
    if (supersets.length === 1) {
      union = supersets[0];
    } else {
      const k = unionKey(pset);
      union = unionMap.get(k) ?? { id: k, partners: pset, status: null, children: [] };
      unionMap.set(k, union);
    }
    childUnion[child] = union.id;
  }
  for (const child of Object.keys(childUnion)) {
    const u = unionMap.get(childUnion[child]!)!;
    if (!u.children.includes(child)) u.children.push(child);
  }
  for (const u of unionMap.values()) u.children.sort();

  const unions = [...unionMap.values()].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const unionById: Record<string, Union> = {};
  const partnerUnions: Record<string, string[]> = {};
  for (const u of unions) {
    unionById[u.id] = u;
    for (const p of u.partners) (partnerUnions[p] ??= []).push(u.id);
  }
  for (const k of Object.keys(partnerUnions)) partnerUnions[k].sort();

  // Dedup + sort spouses.
  const spouses: Record<string, Spouse[]> = {};
  for (const k of Object.keys(spouseDraft)) {
    const seen = new Set<string>();
    spouses[k] = spouseDraft[k]
      .filter((s) => (seen.has(s.id) ? false : (seen.add(s.id), true)))
      .sort((a, b) => (a.id < b.id ? -1 : 1));
  }

  // Everyone who appears in any relationship: union partners + union children.
  const placed = sortedUnique(unions.flatMap((u) => [...u.partners, ...u.children]));

  return {
    unions,
    unionById: byKey(unionById),
    partnerUnions: byKey(partnerUnions),
    childUnion: byKey(childUnion),
    parentsOf: byKey(parentsOf),
    childrenOf: byKey(childrenOf),
    spouses: byKey(spouses),
    placed,
  };
}

/**
 * A person's immediate relatives, derived straight from the raw edges (not the
 * layout) so the record / search / edit panels don't depend on how the tree is
 * drawn. Siblings = everyone who shares at least one recorded parent.
 */
export function relationsOf(graph: FamilyGraph, pid: string): Relations {
  const parents = graph.parentsOf[pid] ?? [];
  const children = graph.childrenOf[pid] ?? [];
  const spouse = (graph.spouses[pid] ?? []).map((s) => ({ id: s.id, rel: s.rel ?? undefined }));

  const siblingSet = new Set<string>();
  for (const parent of parents) {
    for (const sib of graph.childrenOf[parent] ?? []) if (sib !== pid) siblingSet.add(sib);
  }
  return {
    spouse,
    parents: parents.map((id) => ({ id })),
    children: children.map((id) => ({ id })),
    siblings: [...siblingSet].sort().map((id) => ({ id })),
  };
}

export interface Lineage {
  people: Set<string>;
  unions: Set<string>;
}

/**
 * The focus person's bloodline: all ancestors (up through BOTH parents) and all
 * descendants, plus the focus's spouses, and every union touching those people
 * (so the Explorer can highlight the connecting edges).
 */
export function lineageOf(graph: FamilyGraph, focusId: string): Lineage {
  const people = new Set<string>([focusId]);

  const climb = (start: string, step: (id: string) => string[]) => {
    const stack = [start];
    while (stack.length) {
      const cur = stack.pop()!;
      for (const next of step(cur)) {
        if (!people.has(next)) {
          people.add(next);
          stack.push(next);
        }
      }
    }
  };
  climb(focusId, (id) => graph.parentsOf[id] ?? []);
  climb(focusId, (id) => graph.childrenOf[id] ?? []);
  for (const s of graph.spouses[focusId] ?? []) people.add(s.id);

  const unions = new Set<string>();
  for (const u of graph.unions) {
    if (u.partners.some((p) => people.has(p)) || u.children.some((c) => people.has(c))) {
      unions.add(u.id);
    }
  }
  return { people, unions };
}
