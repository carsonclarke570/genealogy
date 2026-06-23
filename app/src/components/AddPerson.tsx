"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Avatar,
  Breadcrumb,
  Button,
  Card,
  Checkbox,
  Combobox,
  DateField,
  Input,
  ProvenanceMark,
  RadioGroup,
  Select,
  Switch,
  Textarea,
} from "@family-archive/ui";
import type { ProvenanceStatus, PartialDate, SourceOption } from "@family-archive/ui";
import {
  fullName,
  lifeDates,
  relationsOf,
  sortNames,
  sourceOptions,
  NAME_REASON_LABEL,
  type NameReason,
  type Person,
} from "@/lib/family-data";
import { useDataset } from "@/lib/dataset";
import { serializePartialDate, parsePartialDate } from "@/lib/dates";
import { PROV_LABEL } from "@/lib/prov";
import { createPerson, updatePerson, type NameDraft, type RelationDraft, type RelationOp } from "@/lib/actions";
import { Icon } from "./Icon";
import { MiniNode } from "./shared";
import type { Screen } from "./AppShell";

interface ProvState {
  status: ProvenanceStatus;
  source?: string;
}

/** A relationship being drafted in the form, before it's submitted. */
interface RelRowState {
  /** Stable React key, local to the form. */
  key: string;
  /** How the chosen person relates to the one being added. */
  type: RelationDraft["type"];
  /** The existing person on the other end, or null until picked. */
  personId: string | null;
  /** Spouse rows only — when the couple married / divorced. */
  marriedDate?: PartialDate | null;
  divorcedDate?: PartialDate | null;
}

let relKeySeq = 0;
const newRelRow = (type: RelationDraft["type"]): RelRowState => ({
  key: `rel-${relKeySeq++}`,
  type,
  personId: null,
});

interface PersonOption {
  value: string;
  label: string;
  description: string;
  leading: React.ReactNode;
}

/**
 * One row of the Relationships editor: a relationship type + a searchable
 * person picker. Defined at module scope (not inside AddPerson) so React keeps
 * the Combobox mounted across the parent's re-renders — inlining it would
 * remount and reset the picker every time another row changed.
 */
function RelRow({
  row,
  options,
  onUpdate,
  onRemove,
}: {
  row: RelRowState;
  options: PersonOption[];
  onUpdate: (patch: Partial<RelRowState>) => void;
  onRemove: () => void;
}) {
  return (
    <div style={{ display: "grid", gap: "var(--space-sm)" }}>
      <div className="app-field-row" style={{ alignItems: "flex-end" }}>
        <div style={{ width: 130, flex: "none" }}>
          <Select
            value={row.type}
            aria-label="Relationship type"
            onChange={(e) => onUpdate({ type: e.target.value as RelationDraft["type"] })}
          >
            <option value="parent">Parent</option>
            <option value="spouse">Spouse</option>
            <option value="child">Child</option>
            <option value="sibling">Sibling</option>
          </Select>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Combobox
            aria-label="Related person"
            placeholder="Search people in the tree…"
            emptyMessage="No one by that name yet"
            options={options}
            value={row.personId}
            onChange={(personId) => onUpdate({ personId })}
          />
        </div>
        <Button
          variant="ghost"
          size="sm"
          iconStart={<Icon name="close" size={16} />}
          aria-label="Remove relationship"
          onClick={onRemove}
        />
      </div>
      {row.type === "spouse" && (
        <div className="app-field-row" style={{ paddingLeft: 130 + 16 }}>
          <div style={{ flex: 1 }}>
            <DateField label="Married" value={row.marriedDate ?? null} onChange={(d) => onUpdate({ marriedDate: d })} />
          </div>
          <div style={{ flex: 1 }}>
            <DateField label="Divorced (if applicable)" value={row.divorcedDate ?? null} onChange={(d) => onUpdate({ divorcedDate: d })} />
          </div>
        </div>
      )}
    </div>
  );
}

/** One later name (a name change) being drafted in the form. */
interface NameRowState {
  /** Stable React key, local to the form. */
  key: string;
  /** Existing `person_name` id (preserved across edits), or null for a new name. */
  id: string | null;
  given: string;
  surname: string;
  /** When this name took effect. */
  date: PartialDate | null;
  reason: NameReason;
  /** Encoded link to the causing event: "none" | `marriage:<relId>` | `event:<eventId>`. */
  cause: string;
  /** Source document id, or "". */
  source: string;
  prov: ProvenanceStatus;
  note: string;
}

let nameKeySeq = 0;
const newNameRow = (): NameRowState => ({
  key: `name-${nameKeySeq++}`,
  id: null,
  given: "",
  surname: "",
  date: null,
  reason: "marriage",
  cause: "none",
  source: "",
  prov: "unverified",
  note: "",
});

const NAME_REASON_CHOICES: NameReason[] = [
  "marriage",
  "immigration",
  "naturalization",
  "religious",
  "personal",
  "other",
];
const PROV_CHOICES: ProvenanceStatus[] = ["unverified", "verified", "estimated", "disputed"];

/**
 * One row of the Names editor: a full given+surname pair the person took on, with
 * its effective date, reason, the event that caused it, a cited source, and
 * confidence. Module-scoped (like RelRow) so React keeps it mounted across the
 * parent's re-renders. Inputs are controlled — their value lives in NameRowState.
 */
function NameRow({
  row,
  index,
  causeOptions,
  mediaOptions,
  onUpdate,
  onRemove,
}: {
  row: NameRowState;
  /** Position in the list (after the birth name) — names the group + drives the divider. */
  index: number;
  causeOptions: { value: string; label: string }[];
  mediaOptions: { id: string; title: string }[];
  onUpdate: (patch: Partial<NameRowState>) => void;
  onRemove: () => void;
}) {
  // Grouped + hairline-separated (not boxed): depth from a rule, never a card-in-card.
  return (
    <div
      role="group"
      aria-label={`Name ${index + 1}`}
      style={{
        display: "grid",
        gap: "var(--space-sm)",
        paddingTop: index > 0 ? "var(--space-lg)" : 0,
        borderTop: index > 0 ? "1px solid var(--color-border)" : "none",
      }}
    >
      <div className="app-field-row" style={{ alignItems: "flex-end" }}>
        <div style={{ flex: 1 }}>
          <Input label="Given names" placeholder="e.g. Eleanor Margaret" value={row.given} onChange={(e) => onUpdate({ given: e.target.value })} />
        </div>
        <div style={{ flex: 1 }}>
          <Input label="Surname" placeholder="e.g. Reed" value={row.surname} onChange={(e) => onUpdate({ surname: e.target.value })} />
        </div>
        <Button type="button" variant="ghost" size="sm" iconStart={<Icon name="close" size={16} />} aria-label="Remove name" onClick={onRemove} />
      </div>
      <div className="app-field-row" style={{ alignItems: "flex-end" }}>
        <div style={{ flex: 1 }}>
          <DateField label="Took effect" value={row.date} onChange={(d) => onUpdate({ date: d })} />
        </div>
        <div style={{ width: 180, flex: "none" }}>
          <Select label="Reason" value={row.reason} onChange={(e) => onUpdate({ reason: e.target.value as NameReason })}>
            {NAME_REASON_CHOICES.map((r) => (
              <option key={r} value={r}>
                {NAME_REASON_LABEL[r]}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div className="app-field-row" style={{ alignItems: "flex-end" }}>
        <div style={{ flex: 1 }}>
          <Select label="Linked to (optional)" value={row.cause} onChange={(e) => onUpdate({ cause: e.target.value })}>
            {causeOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
        <div style={{ flex: 1 }}>
          <Select label="Source document (optional)" value={row.source} onChange={(e) => onUpdate({ source: e.target.value })}>
            <option value="">No source on file</option>
            {mediaOptions.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </Select>
        </div>
        <div style={{ width: 150, flex: "none" }}>
          <Select label="Confidence" value={row.prov} onChange={(e) => onUpdate({ prov: e.target.value as ProvenanceStatus })}>
            {PROV_CHOICES.map((s) => (
              <option key={s} value={s}>
                {PROV_LABEL[s]}
              </option>
            ))}
          </Select>
        </div>
      </div>
    </div>
  );
}

// The read model keys provenance by domain field; the form keys it by UI field.
// Inverse of actions.ts PROV_KEY_MAP — used to seed the marks when editing.
const PROV_DOMAIN_TO_FORM: Record<string, string> = {
  born: "birthDate",
  bornPlace: "birthPlace",
  died: "deathDate",
  diedPlace: "deathPlace",
};

/** Seed the form's provenance state from a stored person's recorded confidences. */
function initialProv(person: Person | null): Record<string, ProvState> {
  if (!person?.prov) return {};
  const out: Record<string, ProvState> = {};
  for (const [domainKey, fact] of Object.entries(person.prov)) {
    const formKey = PROV_DOMAIN_TO_FORM[domainKey];
    if (formKey && fact) out[formKey] = { status: fact.status, source: fact.source ?? undefined };
  }
  return out;
}

/**
 * A field label with its confidence mark inline. Defined at module scope (not
 * inside AddPerson) so React keeps it mounted across the parent's re-renders —
 * inlining it would give the component a new identity each render, remounting the
 * uncontrolled <Input> below it and wiping whatever the user had typed.
 */
function ProvLabel({
  label,
  status,
  sources,
  onChange,
}: {
  label: string;
  status: ProvenanceStatus;
  sources: SourceOption[];
  onChange: (status: ProvenanceStatus, source?: string) => void;
}) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      {label}
      <ProvenanceMark status={status} sources={sources} onChange={onChange} size={13} />
    </span>
  );
}

/**
 * A text field carrying its provenance mark. Module-scoped for the same reason as
 * ProvLabel: keeping a stable component identity is what stops the uncontrolled
 * input from resetting to its defaultValue every time sibling form state changes.
 */
function ProvField({
  label,
  placeholder,
  fieldKey,
  required,
  defaultValue,
  error,
  status,
  sources,
  onProvChange,
}: {
  label: string;
  placeholder: string;
  fieldKey: string;
  required?: boolean;
  defaultValue?: string;
  error?: string;
  status: ProvenanceStatus;
  sources: SourceOption[];
  onProvChange: (k: string, status: ProvenanceStatus, source?: string) => void;
}) {
  return (
    <div style={{ flex: 1 }}>
      <Input
        name={fieldKey}
        placeholder={placeholder}
        required={required}
        defaultValue={defaultValue}
        error={error}
        label={
          <ProvLabel
            label={label}
            status={status}
            sources={sources}
            onChange={(s, src) => onProvChange(fieldKey, s, src)}
          />
        }
      />
    </div>
  );
}

export function AddPerson({
  editId,
  onNavigate,
  onToast,
}: {
  /** When set, edit this existing person instead of adding a new one. */
  editId?: string | null;
  onNavigate: (screen: Screen, personId?: string) => void;
  onToast: (message: string) => void;
}) {
  const { media, people, graph, relationships, events } = useDataset();
  const router = useRouter();
  const person = editId ? people[editId] ?? null : null;
  const isEdit = Boolean(editId);
  const [prov, setProv] = useState<Record<string, ProvState>>(() => initialProv(person));
  const [bornDate, setBornDate] = useState<PartialDate | null>(person?.bornDate ?? null);

  // The Identity card edits the *birth* name (the first in the person's history);
  // the Names section below manages every later name. Seed both from person.names.
  const sortedNames = useMemo(() => (person ? sortNames(person.names ?? []) : []), [person]);
  const birth = sortedNames[0] ?? null;
  const [names, setNames] = useState<NameRowState[]>(() =>
    sortedNames.slice(1).map((n) => ({
      key: `name-${nameKeySeq++}`,
      id: n.id,
      given: n.given,
      surname: n.surname,
      date: n.date,
      reason: n.reason === "birth" ? "other" : n.reason,
      cause: n.relationshipId ? `marriage:${n.relationshipId}` : n.eventId ? `event:${n.eventId}` : "none",
      source: n.source?.id ?? "",
      prov: n.prov,
      note: n.note ?? "",
    })),
  );
  const [diedDate, setDiedDate] = useState<PartialDate | null>(person?.diedDate ?? null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Editing starts with a blank slate (you add connections as needed); adding a
  // brand-new person pre-seeds the two most common links to fill in.
  const [rels, setRels] = useState<RelRowState[]>(() =>
    editId ? [] : [newRelRow("parent"), newRelRow("spouse")],
  );
  const [pending, startTransition] = useTransition();
  const sources = sourceOptions(media);

  // Everyone already in the archive is a candidate to connect to — except the
  // person being edited (you can't relate someone to themselves).
  const personOptions = useMemo(
    () =>
      Object.values(people)
        .filter((p) => p.id !== editId)
        .map((p) => ({
          value: p.id,
          label: fullName(p),
          description: lifeDates(p),
          leading: <Avatar name={fullName(p)} size="sm" />,
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [people, editId],
  );

  // Direct relationship edges this person has, each tied to the raw edge id so it
  // can be removed. Siblings aren't edges (they're derived from shared parents),
  // so they're shown separately as read-only context below.
  const editableRels = useMemo(() => {
    if (!editId) return [];
    const out: { edgeId: string; label: string; otherId: string; kind: "spouse" | "parent" }[] = [];
    for (const r of relationships) {
      if (r.kind === "spouse" && (r.personId === editId || r.relatedId === editId)) {
        out.push({ edgeId: r.id, label: "Spouse", otherId: r.personId === editId ? r.relatedId : r.personId, kind: "spouse" });
      } else if (r.kind === "parent" && r.relatedId === editId) {
        out.push({ edgeId: r.id, label: "Parent", otherId: r.personId, kind: "parent" });
      } else if (r.kind === "parent" && r.personId === editId) {
        out.push({ edgeId: r.id, label: "Child", otherId: r.relatedId, kind: "parent" });
      }
    }
    return out.sort((a, b) => a.label.localeCompare(b.label));
  }, [relationships, editId]);

  // Editable married/divorced dates for each existing spouse edge, seeded from
  // the stored partial-date strings. Keyed by edge id; emitted as setDates ops.
  const [spouseDates, setSpouseDates] = useState<
    Record<string, { married: PartialDate | null; divorced: PartialDate | null }>
  >(() => {
    const out: Record<string, { married: PartialDate | null; divorced: PartialDate | null }> = {};
    for (const r of relationships) {
      if (r.kind === "spouse" && (r.personId === editId || r.relatedId === editId)) {
        out[r.id] = { married: parsePartialDate(r.marriedDate), divorced: parsePartialDate(r.divorcedDate) };
      }
    }
    return out;
  });
  const setSpouseDate = (edgeId: string, patch: Partial<{ married: PartialDate | null; divorced: PartialDate | null }>) =>
    setSpouseDates((s) => {
      const cur = s[edgeId] ?? { married: null, divorced: null };
      return { ...s, [edgeId]: { ...cur, ...patch } };
    });

  const siblings = useMemo(
    () => (editId ? relationsOf(graph, editId).siblings : []),
    [graph, editId],
  );

  // Edges marked for removal (applied on Save). Toggle with the × / Undo control.
  const [removedEdges, setRemovedEdges] = useState<Set<string>>(() => new Set());
  const toggleRemove = (edgeId: string) =>
    setRemovedEdges((s) => {
      const next = new Set(s);
      next.has(edgeId) ? next.delete(edgeId) : next.add(edgeId);
      return next;
    });
  const relationshipOps: RelationOp[] = [
    ...[...removedEdges].map((id): RelationOp => ({ op: "remove", id })),
    // Persist dates for every spouse edge that's staying (idempotent re-write).
    ...editableRels
      .filter((r) => r.kind === "spouse" && !removedEdges.has(r.edgeId))
      .map((r): RelationOp => ({
        op: "setDates",
        id: r.edgeId,
        marriedDate: serializePartialDate(spouseDates[r.edgeId]?.married ?? null),
        divorcedDate: serializePartialDate(spouseDates[r.edgeId]?.divorced ?? null),
      })),
  ];

  const updateRel = (key: string, patch: Partial<RelRowState>) =>
    setRels((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const removeRel = (key: string) => setRels((rs) => rs.filter((r) => r.key !== key));
  const addRel = () => setRels((rs) => [...rs, newRelRow("parent")]);

  // Only rows with a person chosen are submitted, and at most one relationship
  // per person — picking the same person in two rows (e.g. parent *and* child)
  // would write contradictory edges, so the first row wins.
  const relationDrafts: RelationDraft[] = (() => {
    const seen = new Set<string>();
    const out: RelationDraft[] = [];
    for (const r of rels) {
      if (!r.personId || seen.has(r.personId)) continue;
      seen.add(r.personId);
      out.push(
        r.type === "spouse"
          ? {
              type: r.type,
              personId: r.personId,
              marriedDate: serializePartialDate(r.marriedDate ?? null),
              divorcedDate: serializePartialDate(r.divorcedDate ?? null),
            }
          : { type: r.type, personId: r.personId },
      );
    }
    return out;
  })();
  // Events a name change can attach to: this person's marriages (by edge id) and
  // their stored events (immigration, …). Only available when editing — a brand-new
  // person has no persisted edges/events yet to link to.
  const causeOptions = useMemo(() => {
    const opts = [{ value: "none", label: "— Not linked to an event —" }];
    if (!editId) return opts;
    for (const r of relationships) {
      if (r.kind === "spouse" && (r.personId === editId || r.relatedId === editId)) {
        const otherId = r.personId === editId ? r.relatedId : r.personId;
        const other = people[otherId];
        opts.push({ value: `marriage:${r.id}`, label: `Marriage${other ? ` to ${fullName(other)}` : ""}` });
      }
    }
    for (const ev of events) {
      if (!ev.auto && ev.id.startsWith("ev-") && ev.people.includes(editId)) {
        opts.push({ value: `event:${ev.id.slice(3)}`, label: ev.title });
      }
    }
    return opts;
  }, [relationships, events, people, editId]);
  const mediaOptions = useMemo(() => media.map((m) => ({ id: m.id, title: m.title })), [media]);

  const updateName = (key: string, patch: Partial<NameRowState>) =>
    setNames((ns) => ns.map((n) => (n.key === key ? { ...n, ...patch } : n)));
  const removeName = (key: string) => setNames((ns) => ns.filter((n) => n.key !== key));
  const addName = () => setNames((ns) => [...ns, newNameRow()]);

  // Only rows with both name parts filled are submitted; ordinal 0 is the birth
  // name (composed server-side from the Identity fields), so these start at 1.
  const nameDrafts: NameDraft[] = names
    .filter((n) => n.given.trim() && n.surname.trim())
    .map((n, i) => {
      const [kind, cid] = n.cause === "none" ? ["none", null] : n.cause.split(":");
      return {
        id: n.id,
        given: n.given.trim(),
        surname: n.surname.trim(),
        effectiveDate: serializePartialDate(n.date),
        reason: n.reason,
        causeRelationshipId: kind === "marriage" ? cid : null,
        causeEventId: kind === "event" ? cid : null,
        mediaId: n.source || null,
        prov: n.prov,
        note: n.note.trim() || null,
        ordinal: i + 1,
      };
    });

  const stOf = (k: string): ProvenanceStatus => prov[k]?.status ?? "unverified";
  const setP = (k: string, status: ProvenanceStatus, source?: string) =>
    setProv((s) => ({ ...s, [k]: { status, source } }));

  const handleSubmit = (formData: FormData) =>
    startTransition(async () => {
      const result =
        isEdit && person
          ? await updatePerson(person.id, formData)
          : await createPerson(formData);
      if (result.ok) {
        setErrors({});
        const unlinked = result.unlinkedSiblings ?? [];
        if (unlinked.length > 0) {
          // The sibling link is derived from shared parents; with none recorded
          // there's nothing to share, so tell the user rather than dropping it.
          const names = unlinked
            .map((id) => people[id]?.given.split(" ")[0] ?? "someone")
            .join(", ");
          onToast(
            `Saved, but couldn't link ${names} as a sibling — they have no recorded parents yet. Add a parent to them first, then re-link.`,
          );
        } else {
          onToast(isEdit ? "Changes saved to the record" : "Person saved to the family archive");
        }
        router.refresh();
        onNavigate("person", result.id);
      } else {
        setErrors(result.errors);
      }
    });

  // A field label with its confidence mark inline — wraps the module-scope
  // ProvLabel with this form's prov state, for the precision-aware date fields.
  const provLabel = (label: string, k: string) => (
    <ProvLabel label={label} status={stOf(k)} sources={sources} onChange={(s, src) => setP(k, s, src)} />
  );
  // The per-field provenance wiring every ProvField needs, keyed by field name.
  const provProps = (k: string) => ({ fieldKey: k, status: stOf(k), sources, onProvChange: setP, error: errors[k] });

  // Edit was requested for someone who isn't in the current dataset (stale link,
  // or deleted in another tab). Don't render a blank "add" form under an "edit"
  // heading — that would silently create a duplicate on save.
  if (isEdit && !person) {
    return (
      <div
        className="app-scroll"
        style={{ height: "100%", overflow: "auto", padding: "var(--space-xl) var(--space-2xl) var(--space-4xl)" }}
      >
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ marginBottom: "var(--space-md)" }}>
            <Breadcrumb
              items={[
                { label: "Family tree", onClick: () => onNavigate("explorer") },
                { label: "Edit a person" },
              ]}
            />
          </div>
          <div className="app-muted" style={{ fontSize: "var(--text-body)" }}>
            That person’s record could not be found. They may have been removed.{" "}
            <Button variant="ghost" size="sm" onClick={() => onNavigate("explorer")}>
              Back to the family tree
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="app-scroll"
      style={{ height: "100%", overflow: "auto", padding: "var(--space-xl) var(--space-2xl) var(--space-4xl)" }}
    >
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <div style={{ marginBottom: "var(--space-md)" }}>
          <Breadcrumb
            items={[
              { label: "Family tree", onClick: () => onNavigate("explorer") },
              { label: isEdit ? "Edit a person" : "Add a person" },
            ]}
          />
        </div>
        <div className="app-display" style={{ fontSize: "var(--text-display)", marginBottom: 4 }}>
          {isEdit && person ? `Edit ${fullName(person)}` : "Add a person"}
        </div>
        <div className="app-muted" style={{ fontSize: "var(--text-body)", marginBottom: "var(--space-xl)", maxWidth: "60ch" }}>
          {isEdit
            ? "Update what the family knows. Tap a confidence mark to record how sure you are; leave blanks where the record is silent."
            : "Records are sacred — fill what you know, leave the rest blank. Nothing is published outside the family."}
        </div>

        <form className="app-form-grid" action={handleSubmit}>
          <input type="hidden" name="prov" value={JSON.stringify(prov)} />
          <input type="hidden" name="birthDate" value={serializePartialDate(bornDate) ?? ""} />
          <input type="hidden" name="deathDate" value={serializePartialDate(diedDate) ?? ""} />
          <input type="hidden" name="relationships" value={JSON.stringify(relationDrafts)} />
          <input type="hidden" name="relationshipOps" value={JSON.stringify(relationshipOps)} />
          <input type="hidden" name="names" value={JSON.stringify(nameDrafts)} />
          {errors.form && (
            <div
              role="alert"
              style={{
                gridColumn: "1 / -1",
                display: "flex",
                alignItems: "center",
                gap: "var(--space-sm)",
                padding: "var(--space-md)",
                borderRadius: "var(--radius-md)",
                background: "var(--color-danger-tint)",
                color: "var(--color-danger)",
                fontSize: "var(--text-body-sm)",
              }}
            >
              <Icon name="alert" size={16} />
              <span>{errors.form}</span>
            </div>
          )}
          <div style={{ display: "grid", gap: "var(--space-xl)" }}>
            <Card title="Identity">
              <div className="app-muted" style={{ fontSize: "var(--text-body-sm)", marginBottom: "var(--space-md)" }}>
                The name recorded at birth. Later names — taken at marriage, immigration, or by choice — go in
                “Names &amp; name changes” below. Tap a confidence mark to record how sure you are.
              </div>
              <div style={{ display: "grid", gap: "var(--space-lg)" }}>
                <div className="app-field-row">
                  <ProvField label="Given names" placeholder="e.g. Eleanor Margaret" required defaultValue={birth?.given ?? person?.given} {...provProps("given")} />
                  <ProvField label="Surname at birth" placeholder="e.g. Clarke" required defaultValue={birth?.surname ?? person?.surname} {...provProps("surname")} />
                </div>
                <div className="app-field-row" style={{ alignItems: "flex-end" }}>
                  <div style={{ width: 160, flex: "none" }}>
                    <Select label="Sex" name="sex" defaultValue={person?.sex ?? ""} required error={errors.sex}>
                      <option value="">—</option>
                      <option value="f">Female</option>
                      <option value="m">Male</option>
                      <option value="o">Other</option>
                    </Select>
                  </div>
                </div>
                <Checkbox
                  name="living"
                  label="Living person"
                  description="Hides sensitive details (certificates, exact dates) from non-curators."
                  defaultChecked={person?.living ?? false}
                />
              </div>
            </Card>

            <Card title="Life events">
              <div style={{ display: "grid", gap: "var(--space-lg)" }}>
                <div>
                  <div className="app-label" style={{ marginBottom: "var(--space-sm)" }}>
                    Birth
                  </div>
                  <div className="app-field-row" style={{ alignItems: "flex-start" }}>
                    <div style={{ flex: 1 }}>
                      <DateField
                        label={provLabel("Date", "birthDate")}
                        hint="A year is enough — add the month or day if you know them."
                        value={bornDate}
                        onChange={setBornDate}
                      />
                    </div>
                    <ProvField label="Place" placeholder="City, country" defaultValue={person?.bornPlace ?? undefined} {...provProps("birthPlace")} />
                  </div>
                </div>
                <div>
                  <div className="app-label" style={{ marginBottom: "var(--space-sm)" }}>
                    Death <span style={{ fontWeight: 400 }}>(if applicable)</span>
                  </div>
                  <div className="app-field-row" style={{ alignItems: "flex-start" }}>
                    <div style={{ flex: 1 }}>
                      <DateField
                        label={provLabel("Date", "deathDate")}
                        value={diedDate}
                        onChange={setDiedDate}
                      />
                    </div>
                    <ProvField label="Place" placeholder="City, country" defaultValue={person?.diedPlace ?? undefined} {...provProps("deathPlace")} />
                  </div>
                </div>
              </div>
            </Card>

            <Card title="Names &amp; name changes">
              <div className="app-muted" style={{ fontSize: "var(--text-body-sm)", marginBottom: "var(--space-md)" }}>
                Record every name this person was known by after birth — each becomes a dated entry on their
                timeline. Link one to the marriage or event that caused it and it shows nested inside that event.
              </div>
              <div style={{ display: "grid", gap: "var(--space-md)" }}>
                {names.map((row, i) => (
                  <NameRow
                    key={row.key}
                    row={row}
                    index={i}
                    causeOptions={causeOptions}
                    mediaOptions={mediaOptions}
                    onUpdate={(patch) => updateName(row.key, patch)}
                    onRemove={() => removeName(row.key)}
                  />
                ))}
                <div>
                  <Button type="button" variant="ghost" size="sm" iconStart={<Icon name="plus" size={16} />} onClick={addName}>
                    Add a name
                  </Button>
                </div>
              </div>
            </Card>

            {/* Editing relationships: remove existing links (the × toggles a
                mark applied on Save) and/or add new ones. Siblings aren't edges
                — they fall out of shared parents — so they're shown read-only;
                remove a parent link to change them. */}
            <Card title="Relationships">
              <div className="app-muted" style={{ fontSize: "var(--text-body-sm)", marginBottom: "var(--space-md)" }}>
                {isEdit
                  ? "Add or remove connections to others in the tree. Linking someone places them on the canvas; removing their last link returns them to the “Unplaced” shelf."
                  : "Connect this person to others already in the tree. Anyone left unconnected waits in the “Unplaced” shelf until you link them."}
              </div>
              {isEdit && editableRels.length > 0 && (
                <div style={{ marginBottom: "var(--space-lg)" }}>
                  <div className="app-label" style={{ marginBottom: "var(--space-sm)" }}>
                    Current connections
                  </div>
                  <div style={{ display: "grid", gap: "var(--space-sm)" }}>
                    {editableRels.map((r) => {
                      const marked = removedEdges.has(r.edgeId);
                      return (
                        <div key={r.edgeId} style={{ display: "grid", gap: "var(--space-sm)" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
                            <div
                              style={{
                                flex: 1,
                                minWidth: 0,
                                opacity: marked ? 0.45 : 1,
                                textDecoration: marked ? "line-through" : "none",
                              }}
                            >
                              <MiniNode id={r.otherId} rel={r.label} />
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              iconStart={marked ? undefined : <Icon name="close" size={16} />}
                              aria-label={marked ? "Keep relationship" : "Remove relationship"}
                              onClick={() => toggleRemove(r.edgeId)}
                            >
                              {marked ? "Undo" : ""}
                            </Button>
                          </div>
                          {r.kind === "spouse" && !marked && (
                            <div className="app-field-row" style={{ paddingLeft: "var(--space-lg)" }}>
                              <div style={{ flex: 1 }}>
                                <DateField
                                  label="Married"
                                  value={spouseDates[r.edgeId]?.married ?? null}
                                  onChange={(d) => setSpouseDate(r.edgeId, { married: d })}
                                />
                              </div>
                              <div style={{ flex: 1 }}>
                                <DateField
                                  label="Divorced (if applicable)"
                                  value={spouseDates[r.edgeId]?.divorced ?? null}
                                  onChange={(d) => setSpouseDate(r.edgeId, { divorced: d })}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {siblings.length > 0 && (
                    <div className="app-muted" style={{ fontSize: "var(--text-label)", marginTop: "var(--space-sm)" }}>
                      Siblings (via shared parents):{" "}
                      {siblings.map((s) => people[s.id]?.given.split(" ")[0] ?? s.id).join(", ")}. Remove a
                      shared parent link to change them.
                    </div>
                  )}
                </div>
              )}
              <div style={{ display: "grid", gap: "var(--space-md)" }}>
                {isEdit && editableRels.length > 0 && (
                  <div className="app-label">Add a connection</div>
                )}
                {rels.map((row) => (
                  <RelRow
                    key={row.key}
                    row={row}
                    options={personOptions}
                    onUpdate={(patch) => updateRel(row.key, patch)}
                    onRemove={() => removeRel(row.key)}
                  />
                ))}
                <div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    iconStart={<Icon name="plus" size={16} />}
                    onClick={addRel}
                  >
                    Add relationship
                  </Button>
                </div>
              </div>
            </Card>

            <Card title="Notes">
              <Textarea
                name="notes"
                rows={4}
                placeholder="Biography, anecdotes, sources to follow up…"
                defaultValue={person?.notes ?? undefined}
              />
            </Card>
          </div>

          <div style={{ display: "grid", gap: "var(--space-lg)", position: "sticky", top: 0 }}>
            <Card title="Portrait">
              <button className="app-dropzone" style={{ height: 150, borderRadius: "var(--radius-full)" }}>
                <Icon name="upload" />
                <span style={{ fontSize: "var(--text-body-sm)" }}>Drop a photo</span>
              </button>
            </Card>
            <Card title="Documents">
              <button className="app-dropzone" style={{ height: 96 }}>
                <Icon name="upload" />
                <span style={{ fontSize: "var(--text-body-sm)" }}>Certificates, articles, PDFs</span>
              </button>
            </Card>
            <Card title="Visibility">
              <RadioGroup
                legend=""
                name="visibility"
                defaultValue="family"
                options={[
                  { value: "family", label: "Everyone in the family" },
                  { value: "curators", label: "Curators only", description: "For sensitive records." },
                ]}
              />
              <div style={{ marginTop: "var(--space-md)" }}>
                <Switch label="Notify contributors when saved" />
              </div>
            </Card>
            <Card>
              <div style={{ display: "grid", gap: "var(--space-sm)" }}>
                <Button type="submit" variant="primary" fullWidth loading={pending}>
                  {isEdit ? "Save changes" : "Save person"}
                </Button>
                <Button type="button" variant="secondary" fullWidth disabled={pending} onClick={() => onNavigate("explorer")}>
                  Cancel
                </Button>
                <div className="app-muted" style={{ fontSize: "var(--text-label)", textAlign: "center" }}>
                  Saved to the family archive only
                </div>
              </div>
            </Card>
          </div>
        </form>
      </div>
    </div>
  );
}
