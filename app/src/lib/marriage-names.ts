// Pure core of the "took spouse's surname" feature: given a person's flagged
// spouses and the lookups resolved from the database, compose the marriage name
// changes to upsert. Kept out of the server-only write path (actions.ts) so it
// can be unit-tested in isolation — the I/O (resolving edges, surnames, existing
// rows) lives in `buildSurnameNameDrafts`, the decision lives here.

import type { NameDraft } from "./actions";

/** A spouse the form flagged as "the subject took their surname". */
export interface FlaggedSpouse {
  spousePersonId: string;
  /** Canonical partial-date string the marriage took effect, or null. */
  marriedDate: string | null;
  /** Confidence to stamp on the name change (mirrors the marriage's). */
  prov: string;
}

/**
 * Compose marriage `NameDraft`s for each flagged spouse, given the resolved
 * lookups. Rules, in order:
 *  - skip a flag whose spouse edge didn't resolve (e.g. an invalid spouse);
 *  - skip a flag whose edge a *manual* name draft already covers (the manual row
 *    wins — emitting a second draft for one edge would collide on insert);
 *  - skip a second flag for an edge already emitted (dedupe within the batch);
 *  - reuse the existing marriage name row's id for an edge, so re-saving updates
 *    rather than duplicates;
 *  - keep the subject's `given` names; adopt the spouse's `surname`.
 */
export function composeMarriageNameDrafts(args: {
  given: string;
  flagged: FlaggedSpouse[];
  /** spouse person id → resolved spouse relationship (edge) id. */
  relBySpouse: Map<string, string>;
  /** spouse person id → that spouse's current surname (the name adopted). */
  surnameByPerson: Map<string, string>;
  /** relationship id → existing `person_name` row id to reuse, if any. */
  existingByRel: Map<string, string>;
  /** relationship ids already covered by a manual name draft. */
  manualRelIds: Set<string>;
}): NameDraft[] {
  const { given, flagged, relBySpouse, surnameByPerson, existingByRel, manualRelIds } = args;
  const out: NameDraft[] = [];
  const used = new Set<string>();
  for (const f of flagged) {
    const relId = relBySpouse.get(f.spousePersonId);
    if (!relId || used.has(relId) || manualRelIds.has(relId)) continue;
    const surname = surnameByPerson.get(f.spousePersonId);
    if (!surname) continue;
    used.add(relId);
    out.push({
      id: existingByRel.get(relId) ?? null,
      given,
      surname,
      effectiveDate: f.marriedDate,
      reason: "marriage",
      causeRelationshipId: relId,
      causeEventId: null,
      mediaId: null,
      prov: f.prov,
      note: null,
    });
  }
  return out;
}
