"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar, Button, Dialog, Input, MultiSelect, Select, Textarea } from "@family-archive/ui";
import type { ProvenanceStatus } from "@family-archive/ui";
import { fullName, lifeDates, type MediaItem } from "@/lib/family-data";
import { useDataset } from "@/lib/dataset";
import { updateMedia } from "@/lib/media-client";
import { MEDIA_TYPES } from "@/lib/media-validation";
import { PROV_LABEL, provStatuses } from "@/lib/prov";
import { Icon } from "./Icon";

const TYPE_LABELS: [(typeof MEDIA_TYPES)[number], string][] = [
  ["photo", "Photo"],
  ["certificate", "Certificate"],
  ["article", "Article"],
  ["obituary", "Obituary"],
  ["other", "Other"],
];

/**
 * Edit an existing archive item's metadata (title/type/year/description) and the
 * people it's linked to. The file itself is immutable — re-upload for a new file.
 * Persists via `PUT /api/media/[id]`, then refreshes the dataset.
 */
export function MediaEdit({
  media,
  open,
  onClose,
  onToast,
}: {
  media: MediaItem | null;
  open: boolean;
  onClose: () => void;
  onToast: (msg: string) => void;
}) {
  const router = useRouter();
  const { people } = useDataset();

  const [title, setTitle] = useState("");
  const [type, setType] = useState<(typeof MEDIA_TYPES)[number]>("photo");
  const [year, setYear] = useState("");
  const [prov, setProv] = useState<ProvenanceStatus>("unverified");
  const [description, setDescription] = useState("");
  const [selectedPeople, setSelectedPeople] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  // Seed the form whenever it opens (or the target changes).
  useEffect(() => {
    if (!open || !media) return;
    setErrors({});
    setTitle(media.title);
    setType(media.type);
    setYear(media.year ? String(media.year) : "");
    setProv(media.prov);
    setDescription(media.description ?? "");
    setSelectedPeople(media.people);
  }, [open, media]);

  const close = () => {
    if (busy) return;
    onClose();
  };

  const submit = async () => {
    if (!media) return;
    setBusy(true);
    const result = await updateMedia(media.id, {
      title,
      type,
      year,
      prov,
      description,
      personIds: selectedPeople,
    });
    setBusy(false);
    if (result.ok) {
      onToast("Media updated");
      onClose();
      router.refresh();
    } else {
      setErrors(result.errors);
    }
  };

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

  return (
    <Dialog
      open={open}
      onClose={close}
      title="Edit media"
      description="Update the details or change who appears in this record."
      footer={
        <>
          <Button variant="ghost" onClick={close} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} loading={busy} iconStart={<Icon name="check" size={16} />}>
            Save changes
          </Button>
        </>
      }
    >
      <div style={{ display: "grid", gap: "var(--space-lg)" }}>
        <Input
          label="Title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          error={errors.title}
          placeholder="e.g. Eleanor Rivers — birth certificate"
        />

        <div style={{ display: "flex", gap: "var(--space-md)", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 160 }}>
            <Select
              label="Type"
              value={type}
              error={errors.type}
              onChange={(e) => setType(e.target.value as (typeof MEDIA_TYPES)[number])}
            >
              {TYPE_LABELS.map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
          <div style={{ width: 140, flex: "none" }}>
            <Input
              label="Year"
              inputMode="numeric"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              error={errors.year}
              placeholder="e.g. 1915"
            />
          </div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <Select
              label="Confidence"
              value={prov}
              error={errors.prov}
              onChange={(e) => setProv(e.target.value as ProvenanceStatus)}
            >
              {provStatuses.map((s) => (
                <option key={s} value={s}>
                  {PROV_LABEL[s]}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div>
          <div className="app-label" style={{ marginBottom: "var(--space-sm)" }}>
            People in this record
          </div>
          <MultiSelect
            label="People"
            placeholder="Link people…"
            selected={selectedPeople}
            onChange={setSelectedPeople}
            options={personOptions}
            summary={(n) => `${n} linked`}
          />
        </div>

        <Textarea
          label="Description (optional)"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Notes, provenance, who/what/where…"
        />

        {errors.form && (
          <div role="alert" style={{ color: "var(--color-danger)", fontSize: "var(--text-body-sm)" }}>
            {errors.form}
          </div>
        )}
      </div>
    </Dialog>
  );
}
