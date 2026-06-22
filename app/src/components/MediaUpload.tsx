"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar, Button, Dialog, Input, MultiSelect, Select, Textarea } from "@family-archive/ui";
import { fullName, lifeDates } from "@/lib/family-data";
import { useDataset } from "@/lib/dataset";
import { uploadMedia } from "@/lib/media-client";
import { MAX_UPLOAD_BYTES, MEDIA_TYPES } from "@/lib/media-validation";
import { Icon } from "./Icon";

const ACCEPT = "image/jpeg,image/png,image/webp,image/gif,application/pdf";
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"]);

const TYPE_LABELS: [(typeof MEDIA_TYPES)[number], string][] = [
  ["photo", "Photo"],
  ["certificate", "Certificate"],
  ["article", "Article"],
  ["obituary", "Obituary"],
  ["other", "Other"],
];

function prettySize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Strip the extension off a filename to seed the title field. */
function titleFromFilename(name: string): string {
  return name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
}

export function MediaUpload({
  open,
  onClose,
  onToast,
  preselectPersonId,
}: {
  open: boolean;
  onClose: () => void;
  onToast: (msg: string) => void;
  /** When opened from a person record, pre-attach (and lock) that person. */
  preselectPersonId?: string;
}) {
  const router = useRouter();
  const { people } = useDataset();
  const fileInput = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<(typeof MEDIA_TYPES)[number]>("photo");
  const [year, setYear] = useState("");
  const [description, setDescription] = useState("");
  const [selectedPeople, setSelectedPeople] = useState<string[]>(
    preselectPersonId ? [preselectPersonId] : [],
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setFile(null);
    setTitle("");
    setType("photo");
    setYear("");
    setDescription("");
    setSelectedPeople(preselectPersonId ? [preselectPersonId] : []);
    setErrors({});
  };

  const close = () => {
    if (busy) return;
    reset();
    onClose();
  };

  const chooseFile = (f: File | null) => {
    if (!f) return;
    if (f.type && !ALLOWED.has(f.type)) {
      setErrors({ file: "Unsupported file type. Upload a JPEG, PNG, WebP, GIF, or PDF." });
      return;
    }
    if (f.size > MAX_UPLOAD_BYTES) {
      setErrors({ file: `File is too large (max ${Math.floor(MAX_UPLOAD_BYTES / (1024 * 1024))} MB).` });
      return;
    }
    setErrors((e) => ({ ...e, file: "" }));
    setFile(f);
    if (!title) setTitle(titleFromFilename(f.name));
  };

  const submit = async () => {
    if (!file) {
      setErrors({ file: "Choose a file to upload." });
      return;
    }
    setBusy(true);
    const form = new FormData();
    form.set("file", file);
    form.set("title", title);
    form.set("type", type);
    form.set("year", year);
    form.set("description", description);
    form.set("personIds", JSON.stringify(selectedPeople));

    const result = await uploadMedia(form);
    setBusy(false);
    if (result.ok) {
      onToast("Media uploaded");
      reset();
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

  const lockedName = preselectPersonId && people[preselectPersonId] ? fullName(people[preselectPersonId]) : null;

  return (
    <Dialog
      open={open}
      onClose={close}
      title="Upload media"
      description="Add a photo, certificate, article, or other document to the archive."
      footer={
        <>
          <Button variant="ghost" onClick={close} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} loading={busy}>
            Upload
          </Button>
        </>
      }
    >
      <div style={{ display: "grid", gap: "var(--space-lg)" }}>
        <div>
          <input
            ref={fileInput}
            type="file"
            accept={ACCEPT}
            hidden
            onChange={(e) => chooseFile(e.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            className="app-dropzone"
            style={{ minHeight: 110, padding: "var(--space-lg)" }}
            onClick={() => fileInput.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              chooseFile(e.dataTransfer.files?.[0] ?? null);
            }}
          >
            <Icon name="upload" />
            {file ? (
              <span style={{ fontSize: "var(--text-body-sm)", color: "var(--color-ink)" }}>
                {file.name} · {prettySize(file.size)}
              </span>
            ) : (
              <span style={{ fontSize: "var(--text-body-sm)" }}>
                Drop a file or click to browse · JPEG, PNG, WebP, GIF, PDF
              </span>
            )}
          </button>
          {errors.file && (
            <div role="alert" style={{ color: "var(--color-danger)", fontSize: "var(--text-body-sm)", marginTop: 6 }}>
              {errors.file}
            </div>
          )}
        </div>

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

        <div>
          <div className="app-label" style={{ marginBottom: "var(--space-sm)" }}>
            People in this record
          </div>
          {lockedName ? (
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", fontSize: "var(--text-body-sm)", color: "var(--color-muted)" }}>
              <Avatar name={lockedName} size="sm" /> {lockedName}
            </div>
          ) : (
            <MultiSelect
              label="People"
              placeholder="Link people…"
              selected={selectedPeople}
              onChange={setSelectedPeople}
              options={personOptions}
              summary={(n) => `${n} linked`}
            />
          )}
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
