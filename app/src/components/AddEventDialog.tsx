"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Avatar,
  Button,
  Combobox,
  DateField,
  Dialog,
  DOC_TYPE_LABEL,
  IconBadge,
  Input,
  LocationField,
  MultiCombobox,
  Select,
  sourceMeta,
} from "@family-archive/ui";
import type { LocationValue, PartialDate, ProvenanceStatus } from "@family-archive/ui";
import { fullName, lifeDates, sourceOptions, type TimelineEvent } from "@/lib/family-data";
import { useDataset } from "@/lib/dataset";
import { serializePartialDate } from "@/lib/dates";
import { locationFromLabel, locationLabel } from "@/lib/locations";
import { provStatuses } from "@/lib/prov";
import { EVENT_META, STORED_EVENT_TYPES, meta } from "@/lib/timeline";
import { createEvent, updateEvent, deleteEvent, type EventInput } from "@/lib/actions";
import { Icon, type IconName } from "./Icon";

const PROV_LABEL: Record<ProvenanceStatus, string> = {
  verified: "Verified",
  unverified: "Unverified",
  estimated: "Estimated",
  disputed: "Disputed",
};

/**
 * Add or edit a stored life event (immigration, military, education, …) and link
 * it to one or more people. Births, deaths, marriages and divorces are derived
 * from the person/relationship records — they're edited on the person form, so
 * they never appear here. Persists via the createEvent/updateEvent server
 * actions, then refreshes the dataset.
 */
export function AddEventDialog({
  open,
  onClose,
  editEvent,
  presetPersonId,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  /** When set, edit this stored event (must be a non-derived `ev-…` event). */
  editEvent?: TimelineEvent | null;
  /** Pre-link this person when adding from their timeline. */
  presetPersonId?: string | null;
  /** Called after a successful create/update/delete (e.g. to toast). */
  onSaved?: (message: string) => void;
}) {
  const { people, media } = useDataset();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const editingId = editEvent ? editEvent.id.replace(/^ev-/, "") : null;

  const [type, setType] = useState<string>("immigration");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState<PartialDate | null>(null);
  const [place, setPlace] = useState<LocationValue | null>(null);
  const [prov, setProv] = useState<ProvenanceStatus>("unverified");
  const [mediaId, setMediaId] = useState<string>("");
  const [persons, setPersons] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Seed the form whenever it opens (or the edit target changes).
  useEffect(() => {
    if (!open) return;
    setErrors({});
    if (editEvent) {
      setType(editEvent.type);
      setTitle(editEvent.title);
      setDate(editEvent.date);
      setPlace(locationFromLabel(editEvent.place));
      setProv(editEvent.prov);
      setMediaId(editEvent.source?.id ?? "");
      setPersons(editEvent.people);
    } else {
      setType("immigration");
      setTitle("");
      setDate(null);
      setPlace(null);
      setProv("unverified");
      setMediaId("");
      setPersons(presetPersonId ? [presetPersonId] : []);
    }
  }, [open, editEvent, presetPersonId]);

  const m = meta(type as TimelineEvent["type"]);

  const personOptions = Object.values(people)
    .sort((a, b) => (a.born ?? 0) - (b.born ?? 0))
    .map((p) => ({
      value: p.id,
      label: fullName(p),
      description: lifeDates(p),
      leading: <Avatar name={fullName(p)} size="sm" />,
    }));

  // The full archive, as searchable source options (title + type · year).
  const sourceDocOptions = sourceOptions(media).map((s) => ({
    value: s.id,
    label: s.label,
    description: sourceMeta(s),
    leading: (
      <span
        aria-hidden="true"
        style={{
          display: "block",
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: `var(--doc-${s.type ?? "other"})`,
        }}
      />
    ),
    keywords: `${s.type ? DOC_TYPE_LABEL[s.type] : ""} ${s.year ?? ""}`,
  }));

  const submit = () =>
    startTransition(async () => {
      const input: EventInput = {
        type,
        title,
        date: serializePartialDate(date),
        place: locationLabel(place) || null,
        location: place,
        prov,
        mediaId: mediaId || null,
        people: persons,
      };
      const result = editingId ? await updateEvent(editingId, input) : await createEvent(input);
      if (result.ok) {
        setErrors({});
        onSaved?.(editingId ? "Event updated" : "Event added to the timeline");
        router.refresh();
        onClose();
      } else {
        setErrors(result.errors);
      }
    });

  const remove = () =>
    startTransition(async () => {
      if (!editingId) return;
      await deleteEvent(editingId);
      onSaved?.("Event removed");
      router.refresh();
      onClose();
    });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={editingId ? "Edit life event" : "Add a life event"}
      description="Link a document if you have one — facts are sacred. Everyone you tag sees it on their own timeline too."
      footer={
        <>
          {editingId && (
            <Button variant="ghost" onClick={remove} disabled={pending} style={{ marginRight: "auto", color: "var(--color-danger)" }}>
              Delete
            </Button>
          )}
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} loading={pending} iconStart={<Icon name="plus" size={16} />}>
            {editingId ? "Save changes" : "Add event"}
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
        <div style={{ display: "flex", gap: "var(--space-md)", alignItems: "flex-end" }}>
          <span style={{ flex: "none", paddingBottom: 2 }}>
            <IconBadge icon={<Icon name={m.icon as IconName} />} color={m.color} size={40} />
          </span>
          <div style={{ flex: 1 }}>
            <Select label="Type" value={type} onChange={(e) => setType(e.target.value)} error={errors.type}>
              {STORED_EVENT_TYPES.map((k) => (
                <option key={k} value={k}>
                  {EVENT_META[k].label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <Input
          label="What happened"
          placeholder="e.g. Sailed for America aboard the SS Carmania"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          error={errors.title}
        />

        <div className="app-field-row">
          <div style={{ flex: 1 }}>
            <DateField
              label="Date"
              hint="A year is enough — add the month or day if you know them."
              value={date}
              onChange={setDate}
            />
          </div>
          <div style={{ flex: 1 }}>
            <LocationField
              label="Place"
              placeholder="City, country"
              value={place}
              onChange={setPlace}
              onSearch={(q) =>
                fetch("/api/geocode?q=" + encodeURIComponent(q))
                  .then((r) => r.json())
                  .then((d) => d.suggestions)
              }
            />
          </div>
        </div>

        <div>
          <div className="app-label" style={{ marginBottom: "var(--space-sm)" }}>
            People involved
          </div>
          <MultiCombobox
            aria-label="People involved"
            placeholder="Search family members…"
            value={persons}
            onChange={setPersons}
            options={personOptions}
          />
        </div>

        <div className="app-field-row">
          <div style={{ flex: 1, minWidth: 0 }}>
            <Combobox
              label="Source document (optional)"
              placeholder="Search documents…"
              emptyMessage="No documents match"
              value={mediaId || null}
              onChange={(v) => setMediaId(v ?? "")}
              options={sourceDocOptions}
            />
          </div>
          <div style={{ width: 170, flex: "none" }}>
            <Select label="Confidence" value={prov} onChange={(e) => setProv(e.target.value as ProvenanceStatus)}>
              {provStatuses.map((s) => (
                <option key={s} value={s}>
                  {PROV_LABEL[s]}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
