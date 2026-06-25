"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Avatar,
  Breadcrumb,
  Button,
  DateField,
  Input,
  LocationField,
  MediaPreview,
  MultiCombobox,
  Select,
  Textarea,
} from "@family-archive/ui";
import type { LocationValue, PartialDate } from "@family-archive/ui";
import { fullName, lifeDates, mediaFileUrl } from "@/lib/family-data";
import { useDataset } from "@/lib/dataset";
import { updateMedia } from "@/lib/media-client";
import { MEDIA_TYPES } from "@/lib/media-validation";
import { censusResidenceId } from "@/lib/census-ids";
import { parsePartialDate, serializePartialDate } from "@/lib/dates";
import { DocViewer } from "./DocViewer";
import { Icon } from "./Icon";
import type { Screen } from "./AppShell";

const TYPE_LABELS: [(typeof MEDIA_TYPES)[number], string][] = [
  ["photo", "Photo"],
  ["certificate", "Certificate"],
  ["article", "Article"],
  ["obituary", "Obituary"],
  ["census", "Census"],
  ["grave", "Grave"],
  ["other", "Other"],
];

/** Fetch place suggestions from the auth-gated geocoder feeding `LocationField`. */
const searchPlaces = (q: string) =>
  fetch(`/api/geocode?q=${encodeURIComponent(q)}`)
    .then((r) => r.json())
    .then((d) => d.suggestions);

const isImageMime = (mime?: string | null) => Boolean(mime?.startsWith("image/"));

/**
 * MediaEdit — the full-screen "Edit media" screen: the existing file shown in a
 * zoom/pan document viewer on the left and its metadata form on the right, the
 * same split as {@link MediaUpload}. The file itself is immutable — re-upload for
 * a new file — so the left pane is a read-only viewer with no dropzone. Persists
 * via `PUT /api/media/[id]`, refreshes the dataset, then returns to the gallery.
 */
export function MediaEdit({
  mediaId,
  onNavigate,
  onToast,
}: {
  mediaId: string;
  onNavigate: (screen: Screen) => void;
  onToast: (msg: string) => void;
}) {
  const router = useRouter();
  const { people, media: allMedia, residences } = useDataset();
  const media = allMedia.find((m) => m.id === mediaId);

  // The screen mounts fresh per navigation, so seed straight from the target
  // (no re-seed effect needed). A Census pre-fills its place from the residence
  // it generated; a Grave from the burial place + per-person headstone dates.
  const [title, setTitle] = useState(media?.title ?? "");
  const [type, setType] = useState<(typeof MEDIA_TYPES)[number]>(media?.type ?? "photo");
  const [year, setYear] = useState(media?.year ? String(media.year) : "");
  // Media confidence isn't edited here for now (a media file is self-sourcing);
  // preserve whatever the record already carries so the update never wipes it.
  const prov = media?.prov ?? "unverified";
  const [description, setDescription] = useState(media?.description ?? "");
  const [location, setLocation] = useState<LocationValue | null>(() => {
    if (!media) return null;
    if (media.type === "grave") return media.location ?? null;
    const censusRes = residences.find((r) => r.id === censusResidenceId(media.id));
    return censusRes?.location ?? null;
  });
  const [graveDates, setGraveDates] = useState<Record<string, PartialDate | null>>(() => {
    if (!media || media.type !== "grave") return {};
    const dates: Record<string, PartialDate | null> = {};
    for (const [pid, raw] of Object.entries(media.personDates ?? {})) dates[pid] = parsePartialDate(raw);
    return dates;
  });
  const [selectedPeople, setSelectedPeople] = useState<string[]>(media?.people ?? []);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

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
      location,
      personDates:
        type === "grave"
          ? Object.fromEntries(
              selectedPeople
                .map((pid) => [pid, serializePartialDate(graveDates[pid])] as const)
                .filter((entry): entry is [string, string] => entry[1] != null),
            )
          : undefined,
    });
    setBusy(false);
    if (result.ok) {
      onToast("Media updated");
      router.refresh();
      onNavigate("gallery");
    } else {
      setErrors(result.errors);
    }
  };

  // The target vanished (e.g. deleted in another tab) — bail back to the gallery.
  if (!media) {
    return (
      <div className="app-upload-form" style={{ width: "auto", borderLeft: "none", padding: "var(--space-2xl)" }}>
        <Breadcrumb items={[{ label: "Media archive", onClick: () => onNavigate("gallery") }, { label: "Edit" }]} />
        <div className="app-muted" style={{ marginTop: "var(--space-lg)" }}>
          This record is no longer in the archive.
        </div>
      </div>
    );
  }

  const fileUrl = media.hasFile ? mediaFileUrl(media.id) : null;

  return (
    <div className="app-upload">
      {/* ---- left: read-only document viewer ---- */}
      <div className="app-upload-left">
        {fileUrl && isImageMime(media.mimeType) ? (
          <DocViewer url={fileUrl} name={media.title} />
        ) : fileUrl ? (
          <div className="app-doc-stage">
            <MediaPreview
              src={fileUrl}
              mimeType={media.mimeType}
              alt={media.title}
              variant="detail"
              className="app-doc-native"
              placeholder={<span style={{ color: "var(--color-muted)" }}>Preview not available</span>}
            />
          </div>
        ) : (
          <div className="app-doc-stage">
            <MediaPreview
              variant="detail"
              src={null}
              mimeType={media.mimeType}
              alt={media.title}
              className="app-doc-native"
              placeholder={media.type === "photo" ? "photo" : "scanned " + media.type}
            />
          </div>
        )}
      </div>

      {/* ---- right: metadata form ---- */}
      <aside className="app-upload-form">
        <div className="app-upload-formbody app-scroll">
          <Breadcrumb items={[{ label: "Media archive", onClick: () => onNavigate("gallery") }, { label: "Edit" }]} />
          <div className="app-display" style={{ fontSize: "var(--text-headline)", margin: "var(--space-sm) 0 4px" }}>
            Edit media
          </div>
          <div className="app-muted" style={{ fontSize: "var(--text-body-sm)", marginBottom: "var(--space-xl)" }}>
            Update the details or change who appears in this record. The file itself can’t be changed — re-upload for a new one.
          </div>

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
            </div>

            {type === "census" && (
              <LocationField
                label="Where they lived"
                hint="The census place. Its event (and the residence, if a place is set) for everyone below stay in step with this — unless you’ve edited them by hand. Clear the place to drop the residence."
                value={location}
                onChange={setLocation}
                onSearch={searchPlaces}
                error={errors.location}
              />
            )}

            {type === "grave" && (
              <LocationField
                label="Burial location"
                hint="Where they’re buried — shown on their death event."
                value={location}
                onChange={setLocation}
                onSearch={searchPlaces}
                error={errors.location}
              />
            )}

            <MultiCombobox
              label="People in this record"
              placeholder="Search people…"
              value={selectedPeople}
              onChange={setSelectedPeople}
              options={personOptions}
            />

            {type === "grave" && selectedPeople.length > 0 && (
              <div style={{ display: "grid", gap: "var(--space-md)" }}>
                <span className="fa-field__label">Headstone dates</span>
                {selectedPeople.map((pid) =>
                  people[pid] ? (
                    <DateField
                      key={pid}
                      label={fullName(people[pid])}
                      value={graveDates[pid] ?? null}
                      onChange={(d) => setGraveDates((prev) => ({ ...prev, [pid]: d }))}
                    />
                  ) : null,
                )}
              </div>
            )}

            <Textarea
              label="Description"
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
        </div>

        <div className="app-upload-actions">
          <Button variant="ghost" onClick={() => onNavigate("gallery")} disabled={busy}>
            Cancel
          </Button>
          <div style={{ flex: 1 }} />
          <Button variant="primary" iconStart={<Icon name="check" size={16} />} onClick={submit} loading={busy}>
            Save changes
          </Button>
        </div>
      </aside>
    </div>
  );
}
