/**
 * Staged upload — pure change extraction (client + server safe, unit-tested).
 *
 * Walks a subject's {@link SubjectDraft} against the {@link MODELS} registry and
 * the person's baseline values, producing one {@link ChangeEntry} per real change.
 * Each entry carries both a human label + danger note (for the Review stage) and
 * the typed, serialisable {@link RecordChange} (for the wire payload) — so the UI
 * and the server applier can never disagree about what a change *is*. Pure: no DB,
 * no React, no globals.
 */
import type { PartialDate, LocationValue } from "@family-archive/ui";
import type { Person } from "@/lib/family-data";
import { serializePartialDate } from "@/lib/dates";
import {
  MODELS,
  fieldDanger,
  originalValue,
  type CollItem,
  type CollectionModel,
  type FieldDesc,
  type LeafValue,
  type RegistryCtx,
  type SubjectDraft,
} from "./registry";
import type {
  EventItemData,
  ModelKey,
  NameItemData,
  PersonPointer,
  RecordChange,
  RelItemData,
  ResidenceItemData,
  SubjectPayload,
  SubjectRef,
} from "./payload";

const MONTHS = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Context the diff needs to label and resolve people pointers. */
export interface DiffCtx extends RegistryCtx {
  /** True when an id is a person already in the archive (vs a new subject's temp id). */
  isExisting: (id: string) => boolean;
}

export type ChangeOp = "set" | "add" | "update" | "remove";

/** One extracted change: display label + danger note + the wire change. */
export interface ChangeEntry {
  modelKey: ModelKey;
  modelLabel: string;
  op: ChangeOp;
  label: string;
  danger: string | null;
  change: RecordChange;
}

// ── value helpers ─────────────────────────────────────────────────────────────

function isPartialDate(v: unknown): v is PartialDate {
  return !!v && typeof v === "object" && "year" in (v as object) && "precision" in (v as object);
}
function isLocation(v: unknown): v is LocationValue {
  return !!v && typeof v === "object" && "label" in (v as object) && !("precision" in (v as object));
}

/** Equality that understands partial dates and locations (compared by label). */
export function valEq(a: unknown, b: unknown): boolean {
  if (isPartialDate(a) || isPartialDate(b)) {
    if (!isPartialDate(a) || !isPartialDate(b)) return !a && !b;
    return a.year === b.year && (a.month ?? null) === (b.month ?? null) && (a.day ?? null) === (b.day ?? null) && a.precision === b.precision;
  }
  if (isLocation(a) || isLocation(b)) {
    const la = isLocation(a) ? a.label.trim() : "";
    const lb = isLocation(b) ? b.label.trim() : "";
    return la === lb;
  }
  return (a == null ? "" : a) === (b == null ? "" : b);
}

/** Human-readable rendering of a leaf value for the change summary. */
export function show(v: unknown): string {
  if (v == null || v === "") return "—";
  if (isPartialDate(v)) {
    if (v.precision === "day" && v.day) return `${v.day} ${MONTHS[v.month ?? 0]} ${v.year}`;
    if (v.precision === "month" && v.month) return `${MONTHS[v.month]} ${v.year}`;
    return String(v.year);
  }
  if (isLocation(v)) return v.label;
  return String(v);
}

function pointer(id: string, ctx: DiffCtx): PersonPointer {
  return ctx.isExisting(id) ? { ref: "existing", id } : { ref: "temp", id };
}

// ── per-model wire mappers ────────────────────────────────────────────────────

function nameData(it: CollItem): NameItemData {
  return {
    given: String(it.given ?? "").trim(),
    surname: String(it.surname ?? "").trim(),
    effectiveDate: serializePartialDate(it.date as PartialDate | null),
    reason: (String(it.reason || "other") as NameItemData["reason"]),
    note: null,
  };
}
function relData(it: CollItem, ctx: DiffCtx): RelItemData {
  const isSpouse = it.type === "spouse";
  const date = serializePartialDate(it.date as PartialDate | null);
  const divorced = isSpouse && it.status === "divorced";
  return {
    type: String(it.type) as RelItemData["type"],
    target: pointer(String(it.person ?? ""), ctx),
    marriedDate: isSpouse && !divorced ? date : null,
    divorcedDate: divorced ? date : null,
  };
}
function residenceData(it: CollItem): ResidenceItemData {
  const to = it.to as PartialDate | null;
  return {
    location: (it.place as LocationValue | null) ?? null,
    dateKind: "range",
    start: serializePartialDate(it.from as PartialDate | null),
    end: serializePartialDate(to),
    note: String(it.note ?? "") || null,
  };
}
function eventData(it: CollItem): EventItemData {
  const loc = it.place as LocationValue | null;
  return {
    type: String(it.type || "other"),
    title: String(it.title ?? "").trim(),
    date: serializePartialDate(it.date as PartialDate | null),
    place: loc?.label ?? null,
    location: loc ?? null,
  };
}

/** Does a brand-new collection item carry enough to be worth saving? */
function hasContent(m: CollectionModel, it: CollItem): boolean {
  if (m.key === "rels") return !!it.type && !!it.person;
  if (m.key === "names") return !!String(it.given ?? "").trim() || !!String(it.surname ?? "").trim();
  if (m.key === "residences") return !!(it.place as LocationValue | null)?.label;
  if (m.key === "events") return !!it.type || !!String(it.title ?? "").trim();
  return m.item.fields.some((f) => {
    const v = it[f.key];
    return v != null && (typeof v !== "object" || isPartialDate(v) ? show(v) !== "—" : !!(v as LocationValue).label);
  });
}

function collData(
  m: CollectionModel,
  it: CollItem,
  ctx: DiffCtx,
): NameItemData | RelItemData | ResidenceItemData | EventItemData {
  switch (m.key) {
    case "names":
      return nameData(it);
    case "rels":
      return relData(it, ctx);
    case "residences":
      return residenceData(it);
    default:
      return eventData(it);
  }
}

/** Scan a new item's fields for any declared danger. */
function itemDanger(m: CollectionModel, it: CollItem): string | null {
  for (const f of m.item.fields) {
    const d = fieldDanger(f, "", it[f.key]);
    if (d) return d;
  }
  return null;
}

// ── the extraction ────────────────────────────────────────────────────────────

const PERSON_BOOL = (v: LeafValue) => v === "living";

/** All real changes a subject's draft represents, as labelled, typed entries. */
export function subjectChanges(person: Person, draft: SubjectDraft, ctx: DiffCtx): ChangeEntry[] {
  const out: ChangeEntry[] = [];

  for (const m of MODELS) {
    if (m.kind === "fields") {
      for (const f of m.fields) {
        const path = `${m.key}.${f.key}`;
        if (!(path in draft.leaves)) continue;
        const cur = draft.leaves[path];
        const orig = originalValue(person, m.key, f.key);
        if (valEq(cur, orig)) continue;
        const field = f.key as Extract<RecordChange, { model: "person" }>["field"];
        const value = field === "living" ? PERSON_BOOL(cur) : (cur as string | null);
        out.push({
          modelKey: m.key,
          modelLabel: m.label,
          op: "set",
          label: `${f.label}: ${show(orig)} → ${show(cur)}`,
          danger: fieldDanger(f, orig, cur),
          change: { model: "person", op: "set-field", field, value },
        });
      }
    } else if (m.kind === "rows") {
      for (const row of m.rows) {
        for (const f of row.fields) {
          const path = `${m.key}.${row.key}.${f.key}`;
          if (!(path in draft.leaves)) continue;
          const cur = draft.leaves[path];
          const orig = originalValue(person, m.key, `${row.key}.${f.key}`);
          if (valEq(cur, orig)) continue;
          const field = (`${row.key === "birth" ? "born" : "died"}${f.key === "date" ? "Date" : "Place"}`) as Extract<
            RecordChange,
            { model: "life" }
          >["field"];
          const value = f.type === "date" ? serializePartialDate(cur as PartialDate | null) : (cur as LocationValue | null);
          out.push({
            modelKey: m.key,
            modelLabel: m.label,
            op: "set",
            label: `${row.label} ${f.label.toLowerCase()}: ${show(orig)} → ${show(cur)}`,
            danger: fieldDanger(f, orig, cur),
            change: { model: "life", op: "set-field", field, value },
          });
        }
      }
    } else {
      const items = (draft[m.key as "names" | "rels" | "residences" | "events"] as CollItem[]) ?? [];
      for (const it of items) {
        const title = m.item.title(it, ctx);
        if (it._existing && it._removed) {
          out.push({
            modelKey: m.key,
            modelLabel: m.label,
            op: "remove",
            label: title,
            danger: m.removeDanger ?? null,
            change: { model: m.key, op: "remove-item", itemId: it._id } as RecordChange,
          });
        } else if (it._new) {
          if (!hasContent(m, it)) continue;
          out.push({
            modelKey: m.key,
            modelLabel: m.label,
            op: "add",
            label: title,
            danger: itemDanger(m, it),
            change: { model: m.key, op: "add-item", tempItemId: it._id, data: collData(m, it, ctx) } as RecordChange,
          });
        } else if (it._existing && it._orig) {
          const edited = m.item.fields.some((f: FieldDesc) => !valEq(it[f.key], it._orig?.[f.key]));
          if (!edited) continue;
          out.push({
            modelKey: m.key,
            modelLabel: m.label,
            op: "update",
            label: title,
            danger: null,
            change: { model: m.key, op: "update-item", itemId: it._id, data: collData(m, it, ctx) } as RecordChange,
          });
        }
      }
    }
  }

  return out;
}

/** The wire payload for one subject: its ref + the typed changes its draft implies. */
export function buildSubjectPayload(ref: SubjectRef, person: Person, draft: SubjectDraft, ctx: DiffCtx): SubjectPayload {
  return { ref, changes: subjectChanges(person, draft, ctx).map((e) => e.change) };
}
