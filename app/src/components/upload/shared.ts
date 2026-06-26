/**
 * Shared client state + helpers for the staged "Upload media" wizard.
 *
 * A {@link Subject} is one person the document is about — either already in the
 * archive (its real `Person`) or newly added in the People step (a *synthetic*
 * `Person` built from the quick-add spec, so every stage can read it uniformly).
 * Each subject carries an editable {@link SubjectDraft} (registry.ts). The
 * {@link UploadCtx} is the lookup the diff + field controls need to resolve and
 * label person pointers (existing ids and other new subjects' temp ids alike).
 */
"use client";

import type { ComboboxOption } from "@family-archive/ui";
import type { Dataset, Person } from "@/lib/family-data";
import { fullName, lifeDates } from "@/lib/family-data";
import {
  seedEmptyDraft,
  seedFromPerson,
  syntheticPerson,
  type SubjectDraft,
} from "@/lib/staged-upload/registry";
import type { DiffCtx } from "@/lib/staged-upload/diff";
import type { NewPersonSpec } from "@/lib/staged-upload/payload";

export interface Subject {
  /** person.id for an existing subject, the temp id for a new one. */
  uid: string;
  kind: "existing" | "new";
  person: Person;
  /** When kind === "new", the quick-add spec used to create them on save. */
  spec?: NewPersonSpec;
  draft: SubjectDraft;
}

export function makeExistingSubject(dataset: Dataset, person: Person): Subject {
  return { uid: person.id, kind: "existing", person, draft: seedFromPerson(dataset, person) };
}

export function makeNewSubject(spec: NewPersonSpec): Subject {
  return { uid: spec.tempId, kind: "new", person: syntheticPerson(spec), spec, draft: seedEmptyDraft() };
}

/** Fetch place suggestions from the auth-gated geocoder feeding `LocationField`. */
export const searchPlaces = (q: string) =>
  fetch(`/api/geocode?q=${encodeURIComponent(q)}`)
    .then((r) => r.json())
    .then((d) => d.suggestions);

/** The lookup context the diff + person-pickers need. */
export interface UploadCtx extends DiffCtx {
  /** Options for a relationship target picker: existing people + this upload's new people. */
  peopleOpts: ComboboxOption[];
}

export function buildCtx(dataset: Dataset, subjects: Subject[]): UploadCtx {
  const newSubjects = subjects.filter((s) => s.kind === "new");
  const nameOf = (id: string): string => {
    if (dataset.people[id]) return fullName(dataset.people[id]);
    const s = subjects.find((x) => x.uid === id);
    return s ? fullName(s.person) : "";
  };
  const isExisting = (id: string): boolean => !!dataset.people[id];
  const peopleOpts: ComboboxOption[] = Object.values(dataset.people)
    .map((p) => ({ value: p.id, label: fullName(p), description: lifeDates(p) }))
    .concat(
      newSubjects.map((s) => ({
        value: s.uid,
        label: `${fullName(s.person)}  (new)`,
        description: "Added to this document",
      })),
    );
  return { nameOf, isExisting, peopleOpts };
}
