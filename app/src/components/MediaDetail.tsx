"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar, Button, DetailRow, Dialog, DocChip, MediaPreview, ProvenanceMark } from "@family-archive/ui";
import {
  fullName,
  lifeDates,
  mediaFileUrl,
  mediaDownloadUrl,
  type MediaItem,
} from "@/lib/family-data";
import { useDataset } from "@/lib/dataset";
import { deleteMedia } from "@/lib/media-client";
import { PROV_LABEL } from "@/lib/prov";
import { Icon } from "./Icon";

/**
 * The file preview area — a real image, an embedded PDF, or a placeholder. A
 * thin adapter over the design-system MediaPreview (which owns the render
 * branching); this just maps the MediaItem to URLs and a placeholder label.
 */
function Preview({ media }: { media: MediaItem }) {
  return (
    <MediaPreview
      variant="detail"
      src={media.hasFile ? mediaFileUrl(media.id) : null}
      mimeType={media.mimeType}
      alt={media.title}
      placeholder={media.type === "photo" ? "photo" : "scanned " + media.type}
    />
  );
}

export function MediaDetail({
  media,
  onClose,
  onOpen,
  onToast,
  onEdit,
}: {
  media: MediaItem | null;
  onClose: () => void;
  onOpen: (personId: string) => void;
  onToast: (msg: string) => void;
  /** Open the full-screen edit screen for this record. */
  onEdit: (mediaId: string) => void;
}) {
  const router = useRouter();
  const { people } = useDataset();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!media) return null;

  const close = () => {
    if (busy) return;
    setConfirming(false);
    setError(null);
    onClose();
  };

  const startConfirm = (on: boolean) => {
    setConfirming(on);
    setError(null);
  };

  const remove = async () => {
    setBusy(true);
    setError(null);
    const result = await deleteMedia(media.id);
    setBusy(false);
    if (result.ok) {
      onToast("Media deleted");
      setConfirming(false);
      onClose();
      router.refresh();
    } else {
      // Keep the dialog open on the confirm step so the user can retry; the
      // app's toast is success-only, so the failure is surfaced inline here.
      setError(result.errors.form ?? "Couldn’t delete this record. Check your connection and try again.");
    }
  };

  return (
    <Dialog
      open={!!media}
      onClose={close}
      title={media.title}
      description={
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <DocChip type={media.type} /> · <span className="tnum">{media.year}</span>
        </span>
      }
      footer={
        confirming ? (
          <>
            <span
              role={error ? "alert" : undefined}
              style={{
                marginRight: "auto",
                fontSize: "var(--text-body-sm)",
                color: error ? "var(--color-danger)" : "var(--color-muted)",
              }}
            >
              {error ?? "Delete permanently? This can’t be undone."}
            </span>
            <Button variant="ghost" onClick={() => startConfirm(false)} disabled={busy}>
              {error ? "Cancel" : "Keep"}
            </Button>
            <Button variant="danger" onClick={remove} loading={busy} iconStart={<Icon name="trash" size={16} />}>
              {error ? "Try again" : "Delete"}
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={() => startConfirm(true)} iconStart={<Icon name="trash" size={16} />}>
              Delete
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                onClose();
                onEdit(media.id);
              }}
              iconStart={<Icon name="edit" size={16} />}
            >
              Edit
            </Button>
            <Button variant="ghost" onClick={close}>
              Close
            </Button>
            {media.hasFile && (
              <Button
                variant="primary"
                iconStart={<Icon name="download" size={16} />}
                onClick={() => {
                  // The serve route sets Content-Disposition: attachment for
                  // ?download=1, so the browser downloads without navigating away.
                  window.location.href = mediaDownloadUrl(media.id);
                }}
              >
                Download
              </Button>
            )}
          </>
        )
      }
    >
      <div style={{ marginBottom: "var(--space-lg)" }}>
        <Preview media={media} />
      </div>

      <div style={{ display: "grid", gap: "var(--space-sm)", marginBottom: "var(--space-lg)" }}>
        <DetailRow label="Record ID">
          <span className="text-mono">{media.id}</span>
        </DetailRow>
        <DetailRow label="Type">
          <span style={{ textTransform: "capitalize" }}>{media.type}</span>
        </DetailRow>
        <DetailRow label="Date">
          <span className="tnum">{media.year}</span>
        </DetailRow>
        <DetailRow label="Confidence">
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <ProvenanceMark status={media.prov} />
            {PROV_LABEL[media.prov]}
          </span>
        </DetailRow>
      </div>

      {media.people.length > 0 && (
        <>
          <div className="app-label" style={{ marginBottom: "var(--space-sm)" }}>
            People in this record
          </div>
          <div style={{ display: "grid", gap: "var(--space-xs)" }}>
            {media.people.map((pid) => {
              const p = people[pid];
              if (!p) return null;
              return (
                <button
                  key={pid}
                  className="app-mediaperson"
                  onClick={() => {
                    close();
                    onOpen(pid);
                  }}
                >
                  <Avatar name={fullName(p)} size="sm" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "var(--font-serif)", fontSize: "var(--text-body)", color: "var(--color-ink)" }}>
                      {fullName(p)}
                    </div>
                    <div className="app-muted tnum" style={{ fontSize: "var(--text-label)" }}>
                      {lifeDates(p)}
                    </div>
                  </div>
                  <span style={{ color: "var(--color-muted)", display: "inline-flex" }}>
                    <Icon name="chevron" />
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </Dialog>
  );
}
