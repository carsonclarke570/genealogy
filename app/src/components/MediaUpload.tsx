"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Avatar,
  Breadcrumb,
  Button,
  DateField,
  FileDropzone,
  IconButton,
  Input,
  LocationField,
  MediaPreview,
  MultiCombobox,
  Select,
  Textarea,
} from "@family-archive/ui";
import type { LocationValue, PartialDate } from "@family-archive/ui";
import { fullName, lifeDates } from "@/lib/family-data";
import { useDataset } from "@/lib/dataset";
import { uploadMedia } from "@/lib/media-client";
import { MAX_UPLOAD_BYTES, MEDIA_TYPES } from "@/lib/media-validation";
import { PROV_LABEL, provStatuses } from "@/lib/prov";
import { serializePartialDate } from "@/lib/dates";
import { Icon } from "./Icon";
import type { Screen } from "./AppShell";

const ACCEPT = "image/jpeg,image/png,image/webp,image/gif,application/pdf";
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"]);

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

function prettySize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Strip the extension off a filename to seed the title field. */
function titleFromFilename(name: string): string {
  return name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
}

const isImageFile = (f: File) => f.type.startsWith("image/");

/**
 * DocViewer — a zoom / pan / rotate stage over a chosen image, so a curator can
 * read a scan while typing the metadata beside it. Drag to pan, scroll (or the
 * toolbar) to zoom, rotate in 90° steps, and "fit" to reset. Images only; PDFs
 * keep their own embedded viewer (see {@link MediaUpload}).
 */
function DocViewer({ url, name }: { url: string; name: string }) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [rot, setRot] = useState(0);
  const [off, setOff] = useState({ x: 0, y: 0 });
  const [grabbing, setGrabbing] = useState(false);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  const reset = useCallback(() => {
    setScale(1);
    setRot(0);
    setOff({ x: 0, y: 0 });
  }, []);
  // A replaced file is a fresh document — start from a clean transform.
  useEffect(() => reset(), [url, reset]);

  // Wheel-to-zoom needs a non-passive listener: React registers `wheel` at the
  // root as passive, so an onWheel handler can't call preventDefault to stop the
  // page from scrolling. Attach it natively instead.
  useEffect(() => {
    const el = surfaceRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setScale((s) => Math.min(6, Math.max(0.25, s * (e.deltaY < 0 ? 1.12 : 0.89))));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const clamp = (s: number) => Math.min(6, Math.max(0.25, s));
  const zoomBy = (f: number) => setScale((s) => clamp(s * f));

  const onDown = (e: React.PointerEvent) => {
    drag.current = { x: e.clientX, y: e.clientY, ox: off.x, oy: off.y };
    setGrabbing(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    setOff({ x: drag.current.ox + (e.clientX - drag.current.x), y: drag.current.oy + (e.clientY - drag.current.y) });
  };
  const onUp = () => {
    drag.current = null;
    setGrabbing(false);
  };

  return (
    <div className="app-doc-stage">
      <div
        ref={surfaceRef}
        className={"app-doc-surface" + (grabbing ? " grabbing" : "")}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        <div className="app-doc-content" style={{ transform: `translate(${off.x}px, ${off.y}px) scale(${scale}) rotate(${rot}deg)` }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={name} className="app-doc-img" draggable={false} />
        </div>
      </div>

      <div className="app-doc-tools">
        <IconButton aria-label="Zoom out" onClick={() => zoomBy(0.83)}>
          <Icon name="zoomOut" />
        </IconButton>
        <button type="button" className="app-doc-zoom" onClick={() => setScale(1)} title="Reset zoom">
          {Math.round(scale * 100)}%
        </button>
        <IconButton aria-label="Zoom in" onClick={() => zoomBy(1.2)}>
          <Icon name="zoomIn" />
        </IconButton>
        <span className="app-doc-sep" />
        <IconButton aria-label="Rotate 90°" onClick={() => setRot((r) => (r + 90) % 360)}>
          <Icon name="rotate" />
        </IconButton>
        <IconButton aria-label="Fit to screen" onClick={reset}>
          <Icon name="recenter" />
        </IconButton>
      </div>
    </div>
  );
}

/**
 * MediaUpload — the full-screen "Upload media" screen: a zoom/pan document
 * viewer on the left and the metadata form on the right, so a curator reads the
 * scan while entering what it says. Mirrors the archive's media fields and posts
 * through the same `uploadMedia` pipeline the rest of the app uses.
 */
export function MediaUpload({
  onNavigate,
  onToast,
  preselectPersonId,
}: {
  onNavigate: (screen: Screen) => void;
  onToast: (msg: string) => void;
  /** When opened from a person record, pre-attach (and lock) that person. */
  preselectPersonId?: string;
}) {
  const { people } = useDataset();
  const fileInput = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<(typeof MEDIA_TYPES)[number]>("photo");
  const [year, setYear] = useState("");
  const [prov, setProv] = useState<(typeof provStatuses)[number]>("unverified");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState<LocationValue | null>(null);
  const [graveDates, setGraveDates] = useState<Record<string, PartialDate | null>>({});
  const [selectedPeople, setSelectedPeople] = useState<string[]>(preselectPersonId ? [preselectPersonId] : []);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  // The preview object URL is owned here; revoke the prior one whenever it
  // changes and on unmount so we never leak blobs.
  useEffect(() => {
    if (!fileUrl) return;
    return () => URL.revokeObjectURL(fileUrl);
  }, [fileUrl]);

  const chooseFile = (f: File | null) => {
    if (!f) return;
    if (f.type && !ALLOWED.has(f.type)) {
      setErrors((e) => ({ ...e, file: "Unsupported file type. Upload a JPEG, PNG, WebP, GIF, or PDF." }));
      return;
    }
    if (f.size > MAX_UPLOAD_BYTES) {
      setErrors((e) => ({ ...e, file: `File is too large (max ${Math.floor(MAX_UPLOAD_BYTES / (1024 * 1024))} MB).` }));
      return;
    }
    setErrors((e) => ({ ...e, file: "" }));
    setFile(f);
    setFileUrl(URL.createObjectURL(f));
    if (!title) setTitle(titleFromFilename(f.name));
  };

  const clearFile = () => {
    setFile(null);
    setFileUrl(null);
  };

  const submit = async () => {
    if (!file) {
      setErrors((e) => ({ ...e, file: "Choose a file to upload." }));
      return;
    }
    setBusy(true);
    const form = new FormData();
    form.set("file", file);
    form.set("title", title);
    form.set("type", type);
    form.set("year", year);
    form.set("prov", prov);
    form.set("description", description);
    form.set("personIds", JSON.stringify(selectedPeople));
    if (location) form.set("location", JSON.stringify(location));
    if (type === "grave") {
      const dates: Record<string, string> = {};
      for (const pid of selectedPeople) {
        const s = serializePartialDate(graveDates[pid]);
        if (s) dates[pid] = s;
      }
      form.set("personDates", JSON.stringify(dates));
    }

    const result = await uploadMedia(form);
    setBusy(false);
    if (result.ok) {
      onToast("Media uploaded");
      onNavigate("gallery");
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

  const lockedName = preselectPersonId && people[preselectPersonId] ? fullName(people[preselectPersonId]) : null;
  const showPlace = type === "census" || type === "grave";

  return (
    <div className="app-upload">
      {/* Shared hidden picker for the file-chip "Replace" affordance; the empty
          state uses the design-system FileDropzone's own picker. */}
      <input
        ref={fileInput}
        type="file"
        accept={ACCEPT}
        hidden
        onChange={(e) => {
          chooseFile(e.target.files?.[0] ?? null);
          e.target.value = "";
        }}
      />

      {/* ---- left: document viewer / dropzone ---- */}
      <div className="app-upload-left">
        {file && fileUrl ? (
          isImageFile(file) ? (
            <DocViewer url={fileUrl} name={file.name} />
          ) : (
            <div className="app-doc-stage">
              <MediaPreview
                src={fileUrl}
                mimeType={file.type}
                alt={file.name}
                variant="detail"
                className="app-doc-native"
                placeholder={<span style={{ color: "var(--color-muted)" }}>Preview not available</span>}
              />
            </div>
          )
        ) : (
          <div className="app-doc-stage app-doc-empty">
            <FileDropzone className="app-upload-drop" accept={ACCEPT} onFile={chooseFile} aria-label="Upload a file">
              <span className="app-upload-drop-ic">
                <Icon name="upload" size={28} />
              </span>
              <div style={{ fontFamily: "var(--font-serif)", fontSize: "var(--text-title)", color: "var(--color-ink)" }}>
                Drop a document here
              </div>
              <div style={{ fontSize: "var(--text-body-sm)" }}>
                or <span style={{ color: "var(--color-primary)" }}>click to browse</span> · JPEG, PNG, WebP, GIF, PDF · up to 25&nbsp;MB
              </div>
            </FileDropzone>
            {errors.file && (
              <div role="alert" style={{ color: "var(--color-danger)", fontSize: "var(--text-body-sm)", marginTop: "var(--space-sm)" }}>
                {errors.file}
              </div>
            )}
          </div>
        )}

        {file && (
          <div className="app-doc-filechip">
            <span style={{ color: "var(--color-muted)", display: "inline-flex" }}>
              <Icon name={isImageFile(file) ? "gallery" : "file"} size={16} />
            </span>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: "var(--text-body-sm)",
                  color: "var(--color-ink)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: 220,
                }}
              >
                {file.name}
              </div>
              <div className="app-muted" style={{ fontSize: "var(--text-label)" }}>
                {prettySize(file.size)}
              </div>
            </div>
            <IconButton aria-label="Replace file" title="Replace" onClick={() => fileInput.current?.click()}>
              <Icon name="upload" size={15} />
            </IconButton>
            <IconButton aria-label="Remove file" title="Remove" onClick={clearFile}>
              <Icon name="trash" size={15} />
            </IconButton>
          </div>
        )}
      </div>

      {/* ---- right: metadata form ---- */}
      <aside className="app-upload-form">
        <div className="app-upload-formbody app-scroll">
          <Breadcrumb
            items={[{ label: "Media archive", onClick: () => onNavigate("gallery") }, { label: "Upload" }]}
          />
          <div className="app-display" style={{ fontSize: "var(--text-headline)", margin: "var(--space-sm) 0 4px" }}>
            Upload media
          </div>
          <div className="app-muted" style={{ fontSize: "var(--text-body-sm)", marginBottom: "var(--space-xl)" }}>
            Add a photo, certificate, article, or other document. Enter what you see in the scan on the left.
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
                <Select label="Type" value={type} onChange={(e) => setType(e.target.value as (typeof MEDIA_TYPES)[number])}>
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

            <div>
              <Select label="Confidence" value={prov} onChange={(e) => setProv(e.target.value as (typeof provStatuses)[number])}>
                {provStatuses.map((s) => (
                  <option key={s} value={s}>
                    {PROV_LABEL[s]}
                  </option>
                ))}
              </Select>
              <div
                className="app-muted"
                style={{ fontSize: "var(--text-label)", marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}
              >
                <span style={{ color: "var(--color-success)", display: "inline-flex" }}>
                  <Icon name="check" size={13} />
                </span>
                Marking a record verified cites it as a source for the facts it proves.
              </div>
            </div>

            {type === "census" && (
              <LocationField
                label="Where they lived (optional)"
                hint="We’ll add a census event for everyone below. Add a place and we’ll also record a residence there."
                value={location}
                onChange={setLocation}
                onSearch={searchPlaces}
                error={errors.location}
              />
            )}

            {type === "grave" && (
              <LocationField
                label="Burial location (optional)"
                hint="Where they’re buried — shown on their death event."
                value={location}
                onChange={setLocation}
                onSearch={searchPlaces}
                error={errors.location}
              />
            )}

            <div>
              <div className="app-label" style={{ marginBottom: "var(--space-sm)" }}>
                People in this record
              </div>
              {lockedName ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-sm)",
                    fontSize: "var(--text-body-sm)",
                    color: "var(--color-muted)",
                  }}
                >
                  <Avatar name={lockedName} size="sm" /> {lockedName}
                </div>
              ) : (
                <MultiCombobox
                  aria-label="People in this record"
                  placeholder="Search people…"
                  value={selectedPeople}
                  onChange={setSelectedPeople}
                  options={personOptions}
                />
              )}
            </div>

            {type === "grave" && selectedPeople.length > 0 && (
              <div style={{ display: "grid", gap: "var(--space-md)" }}>
                <div className="app-label">Date on the headstone (optional, per person)</div>
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
        </div>

        <div className="app-upload-actions">
          <Button variant="ghost" onClick={() => onNavigate("gallery")} disabled={busy}>
            Cancel
          </Button>
          <div style={{ flex: 1 }} />
          <Button variant="primary" iconStart={<Icon name="upload" size={16} />} onClick={submit} loading={busy}>
            Upload
          </Button>
        </div>
      </aside>
    </div>
  );
}
