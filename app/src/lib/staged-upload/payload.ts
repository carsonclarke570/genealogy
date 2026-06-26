/**
 * Staged upload — the wire payload (pure types, client + server safe).
 *
 * The staged "Upload media" wizard uploads one document and, in the same flow,
 * applies a batch of *incremental record changes* to several people — some
 * already in the archive, some newly added by the document. This module is the
 * single serialisable contract between the wizard (which builds the payload from
 * its drafts, see lib/staged-upload/diff.ts) and the server applier (which writes
 * it, see lib/staged-upload/apply.ts).
 *
 * The design that makes this robust: every editable slice of a person's record is
 * a "model" (person, life, names, rels, residences, events). A {@link RecordChange}
 * is a discriminated union over `model × op` — adding a new record model later is
 * one new union member here, one registry entry in registry.ts, and one applier in
 * appliers.ts; nothing else changes. Dates travel as canonical partial-date
 * strings (lib/dates.ts), places as the design-system {@link LocationValue}.
 */
import type { LocationValue } from "@family-archive/ui";

/** The editable record models, each a slice of a person's record. */
export const MODEL_KEYS = ["person", "life", "names", "rels", "residences", "events"] as const;
export type ModelKey = (typeof MODEL_KEYS)[number];

/**
 * A reference to a person on either end of a relationship/residence/event. It may
 * point at someone already in the archive, or at another *new* subject in this
 * same upload (by the temp id the wizard assigned) — the server resolves temp
 * pointers to real ids after creating the new people (two-pass, see apply.ts).
 */
export type PersonPointer =
  | { ref: "existing"; id: string }
  | { ref: "temp"; id: string };

/** The minimal spec the People step captures to quickly add a brand-new person. */
export interface NewPersonSpec {
  /** Client-assigned id, unique within this upload; mapped to a real id on save. */
  tempId: string;
  given: string;
  surname: string;
  sex: "m" | "f" | "o";
  /** Birth year, when the document gives one (optional). */
  bornYear?: number | null;
}

/** A subject of the upload: an existing person, or a newly-added one. */
export type SubjectRef =
  | { kind: "existing"; personId: string }
  | { kind: "new"; spec: NewPersonSpec };

// ── per-model change payloads ────────────────────────────────────────────────

/** A core identity field on the person row. */
export interface PersonSetChange {
  model: "person";
  op: "set-field";
  field: "given" | "surname" | "sex" | "living" | "notes";
  value: string | boolean | null;
}

/** A birth/death anchor fact. Dates are canonical strings; places are locations. */
export interface LifeSetChange {
  model: "life";
  op: "set-field";
  field: "bornDate" | "bornPlace" | "diedDate" | "diedPlace";
  value: string | LocationValue | null;
}

export interface NameItemData {
  given: string;
  surname: string;
  /** Canonical partial-date string the name took effect, or null. */
  effectiveDate: string | null;
  reason: "birth" | "marriage" | "immigration" | "naturalization" | "religious" | "personal" | "other";
  note?: string | null;
}

export interface RelItemData {
  /** How the *target* relates to the subject (the subject is the …'s …). */
  type: "parent" | "child" | "spouse" | "sibling";
  target: PersonPointer;
  /** Spouse rows only: canonical partial-date strings. */
  marriedDate?: string | null;
  divorcedDate?: string | null;
  /** Spouse rows only: the subject adopted this spouse's surname. */
  tookSpouseSurname?: boolean;
}

export interface ResidenceItemData {
  location: LocationValue | null;
  /** "range" (move-in → move-out) or "point" (a single known date). */
  dateKind: "range" | "point";
  start: string | null;
  end: string | null;
  note?: string | null;
  /** Other residents of this home (the subject is always included implicitly). */
  otherResidents?: PersonPointer[];
}

export interface EventItemData {
  type: string;
  title: string;
  date: string | null;
  place?: string | null;
  location?: LocationValue | null;
  /** Other participants (the subject is always included implicitly). */
  otherPeople?: PersonPointer[];
}

/** The four generic collection ops, parameterised by the item shape. */
type AddItem<T> = { op: "add-item"; tempItemId: string; data: T };
type UpdateItem<T> = { op: "update-item"; itemId: string; data: T };
type RemoveItem = { op: "remove-item"; itemId: string };
type CollectionOp<T> = AddItem<T> | UpdateItem<T> | RemoveItem;

/** Every change the wizard can apply, discriminated by `model` then `op`. */
export type RecordChange =
  | PersonSetChange
  | LifeSetChange
  | ({ model: "names" } & CollectionOp<NameItemData>)
  | ({ model: "rels" } & CollectionOp<RelItemData>)
  | ({ model: "residences" } & CollectionOp<ResidenceItemData>)
  | ({ model: "events" } & CollectionOp<EventItemData>);

/** All changes for one subject of the upload. */
export interface SubjectPayload {
  ref: SubjectRef;
  changes: RecordChange[];
}

/** The full batch of record updates riding alongside the uploaded file. */
export interface BatchUpdates {
  subjects: SubjectPayload[];
}

/** Narrow a change to a given model (handy for the appliers). */
export function changesForModel<M extends ModelKey>(
  changes: RecordChange[],
  model: M,
): Extract<RecordChange, { model: M }>[] {
  return changes.filter((c) => c.model === model) as Extract<RecordChange, { model: M }>[];
}
