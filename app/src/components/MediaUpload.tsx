"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Breadcrumb, Button, FileDropzone, IconButton, MediaPreview, Stepper } from "@family-archive/ui";
import { fullName } from "@/lib/family-data";
import { useDataset } from "@/lib/dataset";
import { uploadMedia } from "@/lib/media-client";
import { MAX_UPLOAD_BYTES } from "@/lib/media-validation";
import { buildSubjectPayload } from "@/lib/staged-upload/diff";
import { subjectChanges } from "@/lib/staged-upload/diff";
import type { BatchUpdates, SubjectRef } from "@/lib/staged-upload/payload";
import { DocViewer } from "./DocViewer";
import { Icon } from "./Icon";
import type { Screen } from "./AppShell";
import { DocStage, type DocFields } from "./upload/DocStage";
import { PeopleStage } from "./upload/PeopleStage";
import { UpdateStage } from "./upload/UpdateStage";
import { ReviewStage } from "./upload/ReviewStage";
import { buildCtx, makeExistingSubject, type Subject } from "./upload/shared";

const ACCEPT = "image/jpeg,image/png,image/webp,image/gif,application/pdf";
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"]);

function prettySize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function titleFromFilename(name: string): string {
  return name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
}

const isImageFile = (f: File) => f.type.startsWith("image/");

/**
 * MediaUpload — the staged "Upload media" wizard. A zoom/pan document viewer stays
 * on the left across every stage; the right column is a stepper:
 *   1. Document — title, type, year, description
 *   2. People   — who the document mentions (existing + newly added)
 *   3…. Updates — one schema-driven stage per person (granular record edits)
 *   N. Review   — change summary + danger acknowledgment, then upload
 * Everything the curator records is applied to the real records (citing this
 * document as a verified source) in one transactional request — see
 * lib/staged-upload and POST /api/media.
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
  const router = useRouter();
  const dataset = useDataset();
  const fileInput = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [doc, setDocRaw] = useState<DocFields>({ title: "", type: "certificate", year: "", description: "" });
  const setDoc = (patch: Partial<DocFields>) => setDocRaw((d) => ({ ...d, ...patch }));
  const [subjects, setSubjects] = useState<Subject[]>(() =>
    preselectPersonId && dataset.people[preselectPersonId] ? [makeExistingSubject(dataset, dataset.people[preselectPersonId])] : [],
  );
  const [stepIdx, setStepIdx] = useState(0);
  const [furthest, setFurthest] = useState(0);
  const [ack, setAck] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  // Own the preview object URL; revoke the prior one whenever it changes / unmounts.
  useEffect(() => {
    if (!fileUrl) return;
    return () => URL.revokeObjectURL(fileUrl);
  }, [fileUrl]);

  const ctx = useMemo(() => buildCtx(dataset, subjects), [dataset, subjects]);

  // Stage list: document → people → one per subject → review.
  const steps = useMemo(() => {
    const list = [
      { key: "doc", label: "Document" },
      { key: "people", label: "People" },
    ];
    subjects.forEach((s) => list.push({ key: `subj:${s.uid}`, label: s.person.given.split(" ")[0] || "Person" }));
    list.push({ key: "review", label: "Review" });
    return list;
  }, [subjects]);

  // Keep the active step valid as the subject count changes.
  useEffect(() => {
    if (stepIdx > steps.length - 1) {
      setStepIdx(steps.length - 1);
      setFurthest((f) => Math.min(f, steps.length - 1));
    }
  }, [steps.length, stepIdx]);

  const cur = steps[Math.min(stepIdx, steps.length - 1)];
  const onReview = cur.key === "review";

  const dangerCount = useMemo(
    () => subjects.reduce((a, s) => a + subjectChanges(s.person, s.draft, ctx).filter((c) => c.danger).length, 0),
    [subjects, ctx],
  );

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
    if (!doc.title) setDoc({ title: titleFromFilename(f.name) });
  };

  const clearFile = () => {
    setFile(null);
    setFileUrl(null);
  };

  const goTo = (i: number) => setStepIdx(i);
  const canAdvance = () => {
    if (cur.key === "doc") {
      const e: Record<string, string> = {};
      if (!file) e.file = "Choose a file to upload.";
      if (!doc.title.trim()) e.title = "Give this record a title.";
      setErrors(e);
      return Object.keys(e).length === 0;
    }
    if (cur.key === "people") return subjects.length > 0;
    return true;
  };
  const next = () => {
    if (!canAdvance()) return;
    const i = Math.min(stepIdx + 1, steps.length - 1);
    setStepIdx(i);
    setFurthest((f) => Math.max(f, i));
  };
  const back = () => setStepIdx((i) => Math.max(0, i - 1));

  const updateSubjectDraft = (uid: string, draft: Subject["draft"]) =>
    setSubjects((ss) => ss.map((s) => (s.uid === uid ? { ...s, draft } : s)));
  const activeSubject = cur.key.startsWith("subj:") ? subjects.find((s) => `subj:${s.uid}` === cur.key) ?? null : null;

  const submit = async () => {
    if (!file) {
      setErrors({ file: "Choose a file to upload." });
      return;
    }
    if (dangerCount > 0 && !ack) return;

    const batch: BatchUpdates = {
      subjects: subjects.map((s) => {
        const ref: SubjectRef = s.kind === "new" && s.spec ? { kind: "new", spec: s.spec } : { kind: "existing", personId: s.uid };
        return buildSubjectPayload(ref, s.person, s.draft, ctx);
      }),
    };
    const totalChanges = batch.subjects.reduce((a, sp) => a + sp.changes.length, 0);

    setBusy(true);
    const form = new FormData();
    form.set("file", file);
    form.set("title", doc.title);
    form.set("type", doc.type);
    form.set("year", doc.year);
    form.set("prov", "verified");
    form.set("description", doc.description);
    form.set("updates", JSON.stringify(batch));

    const result = await uploadMedia(form);
    setBusy(false);
    if (result.ok) {
      onToast(totalChanges > 0 ? `Uploaded — ${totalChanges} record ${totalChanges === 1 ? "change" : "changes"} applied` : "Media uploaded to the archive");
      router.refresh();
      onNavigate("gallery");
    } else {
      setErrors(result.errors);
      // Surface a doc-stage error (title/file) by jumping back to it.
      if (result.errors.title || result.errors.file) setStepIdx(0);
    }
  };

  const primaryLabel = (() => {
    if (cur.key === "doc") return "Continue";
    if (cur.key === "people") return "Author updates";
    if (steps[stepIdx + 1]?.key === "review") return "Review changes";
    return "Next person";
  })();

  return (
    <div className="app-upload">
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
            <FileDropzone className="app-upload-drop" accept={ACCEPT} onFile={chooseFile} aria-label="Upload a document">
              <span className="app-upload-drop-ic">
                <Icon name="upload" size={28} />
              </span>
              <div style={{ fontFamily: "var(--font-serif)", fontSize: "var(--text-title)", color: "var(--color-ink)" }}>Drop a document here</div>
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
              <div style={{ fontSize: "var(--text-body-sm)", color: "var(--color-ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 220 }}>
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

      {/* ---- right: staged form ---- */}
      <aside className="app-upload-form">
        <div className="app-upload-formtop">
          <Breadcrumb items={[{ label: "Media archive", onClick: () => onNavigate("gallery") }, { label: "Upload" }]} />
          <div className="app-display" style={{ fontSize: "var(--text-headline)", margin: "var(--space-sm) 0 var(--space-md)" }}>
            Upload media
          </div>
          <Stepper steps={steps} current={stepIdx} furthest={furthest} onSelect={goTo} />
        </div>

        <div className="app-upload-formbody app-scroll" key={cur.key}>
          {cur.key === "doc" && <DocStage doc={doc} set={setDoc} errors={errors} />}
          {cur.key === "people" && <PeopleStage dataset={dataset} subjects={subjects} onSubjects={setSubjects} lockedUid={preselectPersonId} />}
          {activeSubject && <UpdateStage subject={activeSubject} ctx={ctx} onDraft={(d) => updateSubjectDraft(activeSubject.uid, d)} />}
          {cur.key === "review" && <ReviewStage doc={doc} subjects={subjects} ctx={ctx} ack={ack} setAck={setAck} />}
          {errors.form && (
            <div role="alert" style={{ color: "var(--color-danger)", fontSize: "var(--text-body-sm)", marginTop: "var(--space-lg)" }}>
              {errors.form}
            </div>
          )}
        </div>

        <div className="app-upload-actions">
          {stepIdx === 0 ? (
            <Button variant="ghost" onClick={() => onNavigate("gallery")} disabled={busy}>
              Cancel
            </Button>
          ) : (
            <Button variant="ghost" iconStart={<Icon name="chevron" size={16} style={{ transform: "rotate(180deg)" }} />} onClick={back} disabled={busy}>
              Back
            </Button>
          )}
          <div style={{ flex: 1 }} />
          {!onReview ? (
            <Button
              variant="primary"
              iconStart={<Icon name="chevron" size={16} />}
              onClick={next}
              disabled={cur.key === "people" && subjects.length === 0}
            >
              {primaryLabel}
            </Button>
          ) : (
            <Button variant="primary" iconStart={<Icon name="upload" size={16} />} onClick={submit} loading={busy} disabled={dangerCount > 0 && !ack}>
              {dangerCount > 0 && !ack ? "Confirm changes to upload" : "Upload to archive"}
            </Button>
          )}
        </div>
      </aside>
    </div>
  );
}
