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
import type { ProvenanceStatus, PartialDate } from "@family-archive/ui";
import { fullName, lifeDates, sourceOptions, type Person } from "@/lib/family-data";
import { useDataset } from "@/lib/dataset";
import { serializePartialDate } from "@/lib/dates";
import { createPerson, updatePerson, type RelationDraft } from "@/lib/actions";
import { Icon } from "./Icon";
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
  const { media, people } = useDataset();
  const router = useRouter();
  const person = editId ? people[editId] ?? null : null;
  const isEdit = Boolean(editId);
  const [prov, setProv] = useState<Record<string, ProvState>>(() => initialProv(person));
  const [bornDate, setBornDate] = useState<PartialDate | null>(person?.bornDate ?? null);
  const [diedDate, setDiedDate] = useState<PartialDate | null>(person?.diedDate ?? null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [rels, setRels] = useState<RelRowState[]>(() => [
    newRelRow("parent"),
    newRelRow("spouse"),
  ]);
  const [pending, startTransition] = useTransition();
  const sources = sourceOptions(media);

  // Everyone already in the archive is a candidate to connect to.
  const personOptions = useMemo(
    () =>
      Object.values(people)
        .map((p) => ({
          value: p.id,
          label: fullName(p),
          description: lifeDates(p),
          leading: <Avatar name={fullName(p)} size="sm" />,
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [people],
  );

  const updateRel = (key: string, patch: Partial<RelRowState>) =>
    setRels((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const removeRel = (key: string) => setRels((rs) => rs.filter((r) => r.key !== key));
  const addRel = () => setRels((rs) => [...rs, newRelRow("parent")]);

  // Only rows with a person chosen are submitted.
  const relationships: RelationDraft[] = rels
    .filter((r) => r.personId)
    .map((r) => ({ type: r.type, personId: r.personId! }));
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
        onToast(isEdit ? "Changes saved to the record" : "Person saved to the family archive");
        router.refresh();
        onNavigate("person", result.id);
      } else {
        setErrors(result.errors);
      }
    });

  // A field label with its confidence mark inline — shared by the text fields and
  // the precision-aware date fields so every fact carries its provenance.
  const provLabel = (label: string, k: string) => (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      {label}
      <ProvenanceMark
        status={stOf(k)}
        sources={sources}
        onChange={(status, source) => setP(k, status, source)}
        size={13}
      />
    </span>
  );

  const ProvField = ({
    label,
    placeholder,
    k,
    required,
    defaultValue,
  }: {
    label: string;
    placeholder: string;
    k: string;
    required?: boolean;
    defaultValue?: string;
  }) => (
    <div style={{ flex: 1 }}>
      <Input
        name={k}
        placeholder={placeholder}
        required={required}
        defaultValue={defaultValue}
        error={errors[k]}
        label={provLabel(label, k)}
      />
    </div>
  );

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
          {!isEdit && (
            <input type="hidden" name="relationships" value={JSON.stringify(relationships)} />
          )}
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
                Tap the mark by any field to set its confidence — verified (cite a source), estimated, or disputed.
              </div>
              <div style={{ display: "grid", gap: "var(--space-lg)" }}>
                <div className="app-field-row">
                  <ProvField label="Given names" placeholder="e.g. Eleanor Margaret" k="given" required defaultValue={person?.given} />
                  <ProvField label="Surname" placeholder="e.g. Clarke" k="surname" required defaultValue={person?.surname} />
                </div>
                <div className="app-field-row" style={{ alignItems: "flex-end" }}>
                  <ProvField label="Maiden name (optional)" placeholder="e.g. Hartley" k="maiden" defaultValue={person?.maiden ?? undefined} />
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
                    <ProvField label="Place" placeholder="City, country" k="birthPlace" defaultValue={person?.bornPlace ?? undefined} />
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
                    <ProvField label="Place" placeholder="City, country" k="deathPlace" defaultValue={person?.diedPlace ?? undefined} />
                  </div>
                </div>
              </div>
            </Card>

            {/* Relationships are wired up when first connecting a person. Editing
                them safely (re-anchoring couples, the sibling→shared-parents
                rule, removals) needs its own flow, so the edit form leaves them
                untouched rather than faking an additive-only editor. */}
            {!isEdit && (
              <Card title="Relationships">
                <div className="app-muted" style={{ fontSize: "var(--text-body-sm)", marginBottom: "var(--space-md)" }}>
                  Connect this person to others already in the tree. Anyone left
                  unconnected waits in the “Unplaced” shelf until you link them.
                </div>
                <div style={{ display: "grid", gap: "var(--space-md)" }}>
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
            )}

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
