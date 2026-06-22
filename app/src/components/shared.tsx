"use client";

import type { CSSProperties, ReactNode } from "react";
import { Avatar, Card } from "@family-archive/ui";
import type { DocType } from "@family-archive/ui";
import { shortName, lifeDates, mediaFileUrl, isImageMime, type MediaItem } from "@/lib/family-data";
import { useDataset } from "@/lib/dataset";

/** Small colour-coded dot for a document type (matches --doc-* tokens). */
export function DocDot({ type }: { type: DocType }) {
  return <span className={`app-docdot ${type}`} />;
}

/**
 * A Card whose whole surface is a single keyboard-operable control, via a
 * stretched transparent button (the "stretched link" pattern). This keeps the
 * primary action reachable by keyboard + screen reader without nesting one
 * interactive element inside another: secondary controls placed in `children`
 * (e.g. an avatar that opens a person) raise themselves above the overlay with
 * `.app-above-overlay` and stay independently clickable.
 */
export function ClickableCard({
  onOpen,
  ariaLabel,
  children,
  style,
}: {
  onOpen: () => void;
  ariaLabel: string;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <Card style={{ position: "relative", padding: 0, overflow: "hidden", ...style }}>
      {children}
      <button type="button" className="app-card-open" aria-label={ariaLabel} onClick={onOpen} />
    </Card>
  );
}

/**
 * A media card's preview tile: the real image for image files, a doc glyph for
 * PDFs, or the text placeholder for fileless (legacy) rows. Shared by the
 * Gallery grid and the person Documents tab so they stay in lockstep.
 */
export function MediaThumb({ media, style }: { media: MediaItem; style?: CSSProperties }) {
  if (media.hasFile && isImageMime(media.mimeType)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={mediaFileUrl(media.id)}
        alt={media.title}
        loading="lazy"
        style={{ display: "block", width: "100%", objectFit: "cover", ...style }}
      />
    );
  }
  const label =
    media.hasFile && media.mimeType === "application/pdf"
      ? "PDF document"
      : media.type === "photo"
        ? "photo"
        : "scanned " + media.type;
  return (
    <div className="app-ph" style={style}>
      {label}
    </div>
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
    <button type="button" className="app-mininode" onClick={() => onOpen?.(id)}>
      <Avatar name={`${p.given} ${p.surname}`} size="sm" />
      <span style={{ minWidth: 0 }}>
        <span className="nm" style={{ display: "block" }}>
          {shortName(p)}
        </span>
        <span className="dt" style={{ display: "block" }}>
          {rel ? `${rel} · ` : ""}
          {lifeDates(p)}
        </span>
      </span>
    </button>
  );
}
