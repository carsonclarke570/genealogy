"use client";

import type { CSSProperties } from "react";
import { MediaPreview, PersonRow } from "@family-archive/ui";
import type { DocType } from "@family-archive/ui";
import { shortName, lifeDates, mediaFileUrl, type MediaItem } from "@/lib/family-data";
import { useDataset } from "@/lib/dataset";

// ClickableCard — the whole-surface stretched-button card — now lives in the
// design system; re-export it so existing import sites stay put.
export { ClickableCard } from "@family-archive/ui";

/** Small colour-coded dot for a document type (matches --doc-* tokens). */
export function DocDot({ type }: { type: DocType }) {
  return <span className={`app-docdot ${type}`} />;
}

/** The label shown when a media row has no displayable image. */
function placeholderLabel(media: MediaItem): string {
  if (media.hasFile && media.mimeType === "application/pdf") return "PDF document";
  return media.type === "photo" ? "photo" : "scanned " + media.type;
}

/**
 * A media card's preview tile: the real image for image files, or a text
 * placeholder for PDFs and fileless (legacy) rows. A thin adapter over the
 * design-system MediaPreview, shared by the Gallery grid and the person
 * Documents tab so they stay in lockstep.
 */
export function MediaThumb({ media, style }: { media: MediaItem; style?: CSSProperties }) {
  return (
    <MediaPreview
      variant="thumb"
      src={media.hasFile ? mediaFileUrl(media.id) : null}
      mimeType={media.mimeType}
      alt={media.title}
      placeholder={placeholderLabel(media)}
      style={style}
    />
  );
}

/** Compact related-person row used in the record + peek panels. */
export function MiniNode({
  id,
  rel,
  onOpen,
}: {
  id: string;
  rel?: string;
  onOpen?: (id: string) => void;
}) {
  const { people } = useDataset();
  const p = people[id];
  if (!p) return null;
  return (
    <PersonRow
      name={shortName(p)}
      relation={rel}
      dates={lifeDates(p)}
      onClick={() => onOpen?.(id)}
    />
  );
}
