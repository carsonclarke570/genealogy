/**
 * Staged upload — the record-model registry (client + server safe, pure).
 *
 * This is the scalable heart of the feature. Every editable slice of a person's
 * record is described once, here, as a {@link Model}. The wizard's per-person
 * Update stage (components/upload/UpdateStage.tsx), the change extraction
 * (diff.ts), the change summary and the danger-scan (ReviewStage) all read this
 * registry — so making a new kind of record editable from an upload is one new
 * `Model` entry here (plus its payload member + applier), with no changes to the
 * wizard, the diff, or the review.
 *
 * A model is one of three kinds:
 *   - "fields"     — a flat set of leaf fields (person identity).
 *   - "rows"       — grouped leaf fields (birth & death).
 *   - "collection" — an add/edit/remove list (names, relationships, residences,
 *                    events), seeded with the items already on file.
 *
 * Leaf drafts live in `SubjectDraft.leaves`, keyed by a dotted path that mirrors
 * the model shape ("person.surname", "life.birth.date"); collections live under
 * their model key. `originalValue` provides the baseline for dirty-detection.
 */
import type { PartialDate, LocationValue } from "@family-archive/ui";
import type { Dataset, Person } from "@/lib/family-data";
import { relationsOf } from "@/lib/family-graph";
import { parsePartialDate } from "@/lib/dates";
import type { IconName } from "@/components/Icon";
import type { ModelKey } from "./payload";

// ── field + model descriptors ────────────────────────────────────────────────

export type FieldType = "text" | "textarea" | "select" | "date" | "place" | "person" | "year";

/** A single editable leaf. */
export interface FieldDesc {
  key: string;
  label: string;
  type: FieldType;
  options?: [string, string][];
  placeholder?: string;
  hint?: string;
  /** Render at half-width in the 2-column grid. */
  half?: boolean;
  /** Only show this field when the predicate holds (e.g. spouse-only status). */
  when?: (item: CollItem) => boolean;
  /** Changing this field always warns, with this message. */
  danger?: string;
  /** Conditional warning, computed from the (old, new) values. */
  dangerWhen?: (oldVal: unknown, newVal: unknown) => string | null;
}

interface ModelBase {
  key: ModelKey;
  label: string;
  icon: IconName;
  blurb?: string;
}
export interface FieldsModel extends ModelBase {
  kind: "fields";
  fields: FieldDesc[];
}
export interface RowsModel extends ModelBase {
  kind: "rows";
  rows: { key: string; label: string; fields: FieldDesc[] }[];
}
export interface CollectionModel extends ModelBase {
  kind: "collection";
  addLabel: string;
  emptyHint: string;
  /** Removing an existing item always warns, with this message. */
  removeDanger?: string;
  item: {
    fields: FieldDesc[];
    title: (item: CollItem, ctx: RegistryCtx) => string;
  };
}
export type Model = FieldsModel | RowsModel | CollectionModel;

/** One item of a collection draft (existing on file, or newly added). */
export interface CollItem {
  _id: string;
  _new: boolean;
  _existing: boolean;
  _removed: boolean;
  /** Original field values for an existing item, for dirty detection. */
  _orig?: Record<string, unknown>;
  [field: string]: unknown;
}

export type LeafValue = string | PartialDate | LocationValue | null;

/** A subject's editable draft: changed leaves (by dotted path) + collections. */
export interface SubjectDraft {
  leaves: Record<string, LeafValue>;
  names: CollItem[];
  rels: CollItem[];
  residences: CollItem[];
  events: CollItem[];
}

/** Lookup context the registry/diff need (resolve a person pointer to a name). */
export interface RegistryCtx {
  nameOf: (pointer: string) => string;
}

// ── option sets ──────────────────────────────────────────────────────────────

export const SEX: [string, string][] = [
  ["f", "Female"],
  ["m", "Male"],
  ["o", "Other / unspecified"],
];
const LIVING: [string, string][] = [
  ["living", "Living"],
  ["deceased", "Deceased"],
];
const REL_TYPE: [string, string][] = [
  ["parent", "Parent"],
  ["child", "Child"],
  ["spouse", "Spouse / partner"],
  ["sibling", "Sibling"],
];
const REL_STATUS: [string, string][] = [
  ["married", "Married"],
  ["divorced", "Divorced"],
];
const NAME_REASON: [string, string][] = [
  ["marriage", "Marriage"],
  ["naturalization", "Naturalization"],
  ["immigration", "Immigration / anglicisation"],
  ["religious", "Religious"],
  ["personal", "Personal"],
  ["other", "Other"],
];
/** Stored, user-addable event types (births/deaths/residence/census are handled elsewhere). */
export const EVENT_TYPE: [string, string][] = [
  ["immigration", "Immigration"],
  ["military", "Military"],
  ["education", "Education"],
  ["career", "Career"],
  ["religious", "Religious"],
  ["other", "Other"],
];

const REL_TYPE_LABEL = new Map(REL_TYPE);
const EVENT_TYPE_LABEL = new Map(EVENT_TYPE);

// ── helpers ──────────────────────────────────────────────────────────────────

function yr(d: unknown): number | null {
  return d && typeof d === "object" && "year" in d ? ((d as PartialDate).year ?? null) : null;
}
function yearDate(y: number | null | undefined): PartialDate | null {
  return y == null ? null : { precision: "year", year: y, month: null, day: null };
}
function placeValue(label: string | null | undefined): LocationValue | null {
  const t = (label ?? "").trim();
  return t ? { label: t } : null;
}

// ── the registry ─────────────────────────────────────────────────────────────

export const MODELS: Model[] = [
  {
    key: "person",
    label: "Person details",
    icon: "edit",
    kind: "fields",
    blurb: "Correct or fill in the core identity fields for this person.",
    fields: [
      { key: "given", label: "Given names", type: "text", placeholder: "e.g. Eleanor Margaret" },
      {
        key: "surname",
        label: "Surname",
        type: "text",
        danger:
          "Renaming the surname relabels this person's family line and can split or merge lineage groups across the tree.",
      },
      { key: "sex", label: "Sex", type: "select", options: SEX, half: true },
      {
        key: "living",
        label: "Status",
        type: "select",
        options: LIVING,
        half: true,
        dangerWhen: (o, n) =>
          o !== n
            ? "Switching living status adds or removes the death event and changes how this person is drawn in the tree and timeline."
            : null,
      },
      { key: "notes", label: "Notes", type: "textarea", placeholder: "Anything else the document records…" },
    ],
  },

  {
    key: "life",
    label: "Birth & death",
    icon: "birth",
    kind: "rows",
    blurb: "The two anchor events. Year alone is fine — narrow to month or day if the document gives it.",
    rows: [
      {
        key: "birth",
        label: "Birth",
        fields: [
          {
            key: "date",
            label: "Date of birth",
            type: "date",
            dangerWhen: (o, n) =>
              yr(o) !== yr(n)
                ? "Changing the birth year re-sorts this person on the timeline and may reorder their generation in the tree."
                : null,
          },
          { key: "place", label: "Place of birth", type: "place" },
        ],
      },
      {
        key: "death",
        label: "Death",
        fields: [
          {
            key: "date",
            label: "Date of death",
            type: "date",
            danger: "Recording a death marks this person deceased and adds a death event.",
          },
          { key: "place", label: "Place of death", type: "place" },
        ],
      },
    ],
  },

  {
    key: "names",
    label: "Name changes",
    icon: "edit",
    kind: "collection",
    addLabel: "Add a name change",
    emptyHint: "Record a marriage name, a legal change, or an anglicisation at immigration.",
    item: {
      title: (it) => {
        const name = [it.given, it.surname].map((s) => (s as string) || "").join(" ").trim();
        return name || "New name";
      },
      fields: [
        { key: "given", label: "Given names", type: "text", half: true, placeholder: "e.g. Eleanor" },
        { key: "surname", label: "Surname", type: "text", half: true, placeholder: "e.g. Whitfield" },
        { key: "reason", label: "Reason", type: "select", options: NAME_REASON, half: true },
        { key: "date", label: "When", type: "date", half: true },
      ],
    },
  },

  {
    key: "rels",
    label: "Relationships",
    icon: "link",
    kind: "collection",
    addLabel: "Add a relationship",
    emptyHint: "Link this person to a parent, child, spouse, or sibling — existing or newly added.",
    removeDanger:
      "Removing a relationship can detach descendants from the family tree. Their records stay, but the branch is cut.",
    item: {
      title: (it, ctx) => {
        const who = ctx.nameOf(String(it.person ?? ""));
        const t = REL_TYPE_LABEL.get(String(it.type)) ?? "Relative";
        return who ? `${t} · ${who}` : t;
      },
      fields: [
        {
          key: "type",
          label: "This person is the…",
          type: "select",
          options: REL_TYPE,
          half: true,
          dangerWhen: (_o, n) =>
            n === "parent"
              ? "Adding a parent re-parents this person — and everyone below them — onto a new branch of the tree."
              : null,
        },
        { key: "person", label: "…of", type: "person", half: true, placeholder: "Search or add a person" },
        { key: "status", label: "Status", type: "select", options: REL_STATUS, half: true, when: (it) => it.type === "spouse" },
        { key: "date", label: "Since", type: "date", half: true, when: (it) => it.type === "spouse" },
      ],
    },
  },

  {
    key: "residences",
    label: "Residences",
    icon: "home",
    kind: "collection",
    addLabel: "Add a residence",
    emptyHint: "Where this person lived, and when — drawn from a census, directory, or letter.",
    item: {
      title: (it) => {
        const loc = it.place as LocationValue | null;
        return loc?.label || "Residence";
      },
      fields: [
        { key: "place", label: "Place", type: "place", placeholder: "City, county, country" },
        { key: "from", label: "From", type: "date", half: true },
        { key: "to", label: "To", type: "date", half: true },
        { key: "note", label: "Note", type: "text", placeholder: "Optional" },
      ],
    },
  },

  {
    key: "events",
    label: "Life events",
    icon: "calendar",
    kind: "collection",
    addLabel: "Add an event",
    emptyHint: "Marriages, military service, education, immigration, careers — anything dated.",
    item: {
      title: (it) => (it.title as string) || EVENT_TYPE_LABEL.get(String(it.type)) || "Event",
      fields: [
        { key: "type", label: "Type", type: "select", options: EVENT_TYPE, half: true },
        { key: "date", label: "Date", type: "date", half: true },
        { key: "title", label: "What happened", type: "text", placeholder: "e.g. Enlisted in the U.S. Army" },
        { key: "place", label: "Place", type: "place", placeholder: "City, county, country" },
      ],
    },
  },
];

export function model(key: ModelKey): Model | undefined {
  return MODELS.find((m) => m.key === key);
}

/** Resolve a leaf field's declared danger for an (old, new) edit. */
export function fieldDanger(field: FieldDesc, oldVal: unknown, newVal: unknown): string | null {
  if (field.dangerWhen) return field.dangerWhen(oldVal, newVal);
  if (field.danger) return field.danger;
  return null;
}

// ── original (baseline) values, for dirty-detection ──────────────────────────

/** The baseline value of a "fields"/"rows" leaf, against which an edit is dirty. */
export function originalValue(p: Person, modelKey: ModelKey, path: string): LeafValue | undefined {
  if (modelKey === "person") {
    if (path === "given") return p.given;
    if (path === "surname") return p.surname;
    if (path === "sex") return p.sex;
    if (path === "living") return p.living ? "living" : "deceased";
    if (path === "notes") return p.notes ?? "";
  }
  if (modelKey === "life") {
    if (path === "birth.date") return p.bornDate ?? yearDate(p.born);
    if (path === "birth.place") return placeValue(p.bornPlace);
    if (path === "death.date") return p.living ? null : (p.diedDate ?? yearDate(p.died));
    if (path === "death.place") return p.living ? null : placeValue(p.diedPlace);
  }
  return undefined;
}

// ── seeding a draft from an existing person ──────────────────────────────────

let collCounter = 0;
function collId(prefix: string): string {
  return `${prefix}${collCounter++}`;
}

function relationshipEdgeId(
  dataset: Dataset,
  personId: string,
  kind: "parent" | "spouse",
  otherId: string,
  direction: "out" | "in",
): string | null {
  for (const e of dataset.relationships) {
    if (e.kind !== kind) continue;
    if (kind === "spouse") {
      if ((e.personId === personId && e.relatedId === otherId) || (e.personId === otherId && e.relatedId === personId)) return e.id;
    } else if (direction === "out") {
      if (e.personId === personId && e.relatedId === otherId) return e.id;
    } else {
      if (e.personId === otherId && e.relatedId === personId) return e.id;
    }
  }
  return null;
}

/**
 * Build a subject's editable draft from the person already in the archive: empty
 * leaves (changes land as the curator edits), and collections seeded with the
 * items on file (each carrying its real row id + an `_orig` snapshot for dirty
 * detection). Census-derived rows are excluded — they're owned by the census sync.
 */
export function seedFromPerson(dataset: Dataset, person: Person): SubjectDraft {
  // Name changes (every name but the birth one).
  const names: CollItem[] = (person.names ?? [])
    .filter((n) => n.reason !== "birth")
    .map((n) => {
      const data = {
        given: n.given,
        surname: n.surname,
        reason: n.reason,
        date: n.date ?? null,
      };
      return { _id: n.id, _new: false, _existing: true, _removed: false, _orig: { ...data }, ...data } as CollItem;
    });

  // Relationships (parents, spouses, children — siblings are derived, not edges).
  const rel = relationsOf(dataset.graph, person.id);
  const rels: CollItem[] = [];
  const pushRel = (id: string, type: string, edgeId: string | null, status: string | null, date: PartialDate | null) => {
    const data = { type, person: id, status, date };
    rels.push({
      _id: edgeId ?? collId("r"),
      _new: false,
      _existing: true,
      _removed: false,
      _orig: { ...data },
      ...data,
    } as CollItem);
  };
  for (const r of rel.parents) pushRel(r.id, "parent", relationshipEdgeId(dataset, person.id, "parent", r.id, "in"), null, null);
  for (const r of rel.children) pushRel(r.id, "child", relationshipEdgeId(dataset, person.id, "parent", r.id, "out"), null, null);
  for (const r of rel.spouse) {
    const edge = dataset.relationships.find(
      (e) => e.kind === "spouse" && ((e.personId === person.id && e.relatedId === r.id) || (e.personId === r.id && e.relatedId === person.id)),
    );
    pushRel(r.id, "spouse", edge?.id ?? null, edge?.status ?? (r.rel ?? "married"), parsePartialDate(edge?.marriedDate ?? null));
  }

  // Residences (excluding census-derived ones, which the census sync owns).
  const residences: CollItem[] = dataset.residences
    .filter((r) => r.personIds.includes(person.id) && !r.id.startsWith("R-census-"))
    .map((r) => {
      const data = {
        place: r.location,
        from: r.start ?? null,
        to: r.end ?? null,
        note: r.note ?? "",
      };
      return { _id: r.id, _new: false, _existing: true, _removed: false, _orig: { ...data }, ...data } as CollItem;
    });

  // Stored, user-addable life events (excluding census-derived ones).
  const editableEventTypes = new Set(EVENT_TYPE.map(([v]) => v));
  const events: CollItem[] = dataset.events
    .filter(
      (e) =>
        !e.auto &&
        e.people.includes(person.id) &&
        editableEventTypes.has(e.type) &&
        e.id.startsWith("ev-") &&
        !e.id.startsWith("ev-E-census-"),
    )
    .map((e) => {
      const data = {
        type: e.type,
        title: e.title,
        date: e.date ?? null,
        place: placeValue(e.place),
      };
      return { _id: e.id.replace(/^ev-/, ""), _new: false, _existing: true, _removed: false, _orig: { ...data }, ...data } as CollItem;
    });

  return { leaves: {}, names, rels, residences, events };
}

/** An empty draft for a brand-new person (no items on file yet). */
export function seedEmptyDraft(): SubjectDraft {
  return { leaves: {}, names: [], rels: [], residences: [], events: [] };
}

/** A blank collection item for the given model, all fields empty. */
export function blankItem(m: CollectionModel): CollItem {
  const item: CollItem = { _id: collId("n"), _new: true, _existing: false, _removed: false };
  for (const f of m.item.fields) item[f.key] = f.type === "date" || f.type === "place" ? null : "";
  return item;
}

/** A synthetic Person for a newly-added subject, so the registry can read it like any other. */
export function syntheticPerson(spec: { tempId: string; given: string; surname: string; sex: "m" | "f" | "o"; bornYear?: number | null }): Person {
  return {
    id: spec.tempId,
    given: spec.given,
    surname: spec.surname,
    maiden: null,
    sex: spec.sex,
    born: spec.bornYear ?? null,
    bornDate: yearDate(spec.bornYear ?? null),
    bornPlace: null,
    died: null,
    diedDate: null,
    diedPlace: null,
    living: true,
    notes: null,
    docs: {},
    mediaCount: 0,
    prov: {},
    names: [
      {
        id: `birth-${spec.tempId}`,
        given: spec.given,
        surname: spec.surname,
        date: yearDate(spec.bornYear ?? null),
        reason: "birth",
        relationshipId: null,
        eventId: null,
        source: null,
        prov: "unverified",
        note: null,
        ordinal: 0,
      },
    ],
  };
}
