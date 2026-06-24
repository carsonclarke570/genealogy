"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Avatar,
  Button,
  DateField,
  Dialog,
  LocationField,
  MultiSelect,
  ProvenanceMark,
  SegmentedControl,
  Textarea,
} from "@family-archive/ui";
import type {
  LocationValue,
  PartialDate,
  ProvenanceStatus,
} from "@family-archive/ui";
import { fullName, lifeDates, sourceOptions, type Residence } from "@/lib/family-data";
import { useDataset } from "@/lib/dataset";
import { serializePartialDate, type ResidenceDateKind } from "@/lib/dates";
import { PROV_LABEL } from "@/lib/prov";
import {
  createResidence,
  updateResidence,
  deleteResidence,
  type ResidenceInput,
} from "@/lib/actions";
import { Icon } from "./Icon";

/** Fetch place suggestions from the auth-gated geocoder feeding `LocationField`. */
const searchPlaces = (q: string) =>
  fetch(`/api/geocode?q=${encodeURIComponent(q)}`)
    .then((r) => r.json())
    .then((d) => d.suggestions);

/**
 * Add or edit a residence for a person — where they lived, for what span, and how
 * sure we are. A residence is first-class (not a stored `event`): a structured
 * location, a start and an optional end date ("lived there onward" when the end is
 * blank), and the unified provenance. Persists via the createResidence /
 * updateResidence server actions, then refreshes the dataset.
 */
export function AddResidenceDialog({
  open,
  onClose,
  lockedPersonId,
  editResidence,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  /** When opened from a person record, that person is pre-selected and always kept. */
  lockedPersonId?: string;
  /** When set, edit this residence instead of adding a new one. */
  editResidence?: Residence | null;
  /** Called after a successful create/update/delete (e.g. to toast). */
  onSaved?: (message: string) => void;
}) {
  const { media, people } = useDataset();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const editingId = editResidence?.id ?? null;

  const [location, setLocation] = useState<LocationValue | null>(null);
  const [residents, setResidents] = useState<string[]>([]);
  const [dateKind, setDateKind] = useState<ResidenceDateKind>("range");
  const [start, setStart] = useState<PartialDate | null>(null);
  const [end, setEnd] = useState<PartialDate | null>(null);
  const [prov, setProv] = useState<ProvenanceStatus>("unverified");
  const [mediaId, setMediaId] = useState<string>("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Seed the form whenever it opens (or the edit target changes).
  useEffect(() => {
    if (!open) return;
    setErrors({});
    if (editResidence) {
      setLocation(editResidence.location);
      setResidents(editResidence.personIds);
      setDateKind(editResidence.dateKind);
      setStart(editResidence.start);
      setEnd(editResidence.end);
      setProv(editResidence.prov);
      setMediaId(editResidence.source?.id ?? "");
      setNote(editResidence.note ?? "");
    } else {
      setLocation(null);
      setResidents(lockedPersonId ? [lockedPersonId] : []);
      setDateKind("range");
      setStart(null);
      setEnd(null);
      setProv("unverified");
      setMediaId("");
      setNote("");
    }
  }, [open, editResidence, lockedPersonId]);

  const personOptions = useMemo(
    () =>
      Object.values(people).map((p) => ({
        value: p.id,
        label: fullName(p),
        description: lifeDates(p),
        leading: <Avatar name={fullName(p)} size="sm" />,
      })),
    [people],
  );

  const sources = sourceOptions(media);
  // The citation label shown beside the editable provenance mark.
  const sourceLabel = mediaId
    ? sources.find((s) => s.id === mediaId)?.label ?? media.find((m) => m.id === mediaId)?.title
    : undefined;

  const submit = () =>
    startTransition(async () => {
      // The person whose record opened the dialog is always one of the residents.
      const personIds = [...new Set(lockedPersonId ? [lockedPersonId, ...residents] : residents)];
      const input: ResidenceInput = {
        personIds,
        location,
        dateKind,
        start: serializePartialDate(start),
        // A "point" residence has no end — only the single known date in `start`.
        end: dateKind === "point" ? null : serializePartialDate(end),
        prov,
        mediaId: mediaId || null,
        note: note.trim() || null,
      };
      const result = editingId ? await updateResidence(editingId, input) : await createResidence(input);
      if (result.ok) {
        setErrors({});
        onSaved?.(editingId ? "Residence updated" : "Residence added");
        router.refresh();
        onClose();
      } else {
        setErrors(result.errors);
      }
    });

  const remove = () =>
    startTransition(async () => {
      if (!editingId) return;
      await deleteResidence(editingId);
      onSaved?.("Residence removed");
      router.refresh();
      onClose();
    });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={editingId ? "Edit residence" : "Add a residence"}
      description="Where they lived, and when. Record a date range, or just a single date you know they lived there — and cite a document if you have one."
      footer={
        <>
          {editingId && (
            <Button
              variant="ghost"
              onClick={remove}
              disabled={pending}
              style={{ marginRight: "auto", color: "var(--color-danger)" }}
            >
              Delete
            </Button>
          )}
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} loading={pending} iconStart={<Icon name="plus" size={16} />}>
            {editingId ? "Save changes" : "Add residence"}
          </Button>
        </>
      }
    >
      <div style={{ display: "grid", gap: "var(--space-lg)" }}>
        {errors.form && (
          <div role="alert" style={{ color: "var(--color-danger)", fontSize: "var(--text-body-sm)" }}>
            {errors.form}
          </div>
        )}

        <LocationField
          label="Place"
          hint="From a country down to a street address — as much as you know."
          value={location}
          onChange={setLocation}
          onSearch={searchPlaces}
          error={errors.location}
        />

        <div style={{ display: "grid", gap: "var(--space-sm)" }}>
          <span className="app-label">Who lived here</span>
          <MultiSelect
            label="Residents"
            placeholder="Add the people who lived here…"
            selected={residents}
            onChange={setResidents}
            options={personOptions}
            summary={(n) => `${n} ${n === 1 ? "resident" : "residents"}`}
          />
          {errors.personIds && (
            <div role="alert" style={{ color: "var(--color-danger)", fontSize: "var(--text-body-sm)" }}>
              {errors.personIds}
            </div>
          )}
        </div>

        <div style={{ display: "grid", gap: "var(--space-sm)" }}>
          <span className="app-label">Dates</span>
          <SegmentedControl
            aria-label="What the dates mean"
            size="sm"
            value={dateKind}
            onValueChange={(v) => setDateKind(v as ResidenceDateKind)}
            items={[
              { value: "range", label: "Date range" },
              { value: "point", label: "Known date" },
            ]}
          />
          {dateKind === "range" ? (
            <div className="app-field-row">
              <div style={{ flex: 1 }}>
                <DateField
                  label="Moved in"
                  hint="A year is enough — add the month or day if you know them."
                  value={start}
                  onChange={setStart}
                />
              </div>
              <div style={{ flex: 1 }}>
                <DateField
                  label="Moved out"
                  hint="Leave blank if they lived there onward."
                  value={end}
                  onChange={setEnd}
                />
              </div>
            </div>
          ) : (
            <DateField
              label="Known to live here"
              hint="A date you know they lived here — not necessarily when they moved in or out."
              value={start}
              onChange={setStart}
            />
          )}
        </div>

        <Textarea
          label="Note (optional)"
          placeholder="e.g. The family home on Maple Street, kept until the war."
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
          <span className="app-label">Confidence</span>
          <ProvenanceMark
            status={prov}
            source={prov === "verified" ? sourceLabel : undefined}
            sources={sources}
            onChange={(status, _src, sourceId) => {
              setProv(status);
              // "Verified" cites a document; any other status clears the source.
              setMediaId(status === "verified" && sourceId && sourceId !== "__new" ? sourceId : "");
            }}
          />
          <span className="app-muted" style={{ fontSize: "var(--text-body-sm)" }}>
            {PROV_LABEL[prov]}
            {prov === "verified" && sourceLabel ? ` · ${sourceLabel}` : ""}
          </span>
        </div>
      </div>
    </Dialog>
  );
}
