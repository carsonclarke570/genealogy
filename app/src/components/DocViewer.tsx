"use client";

import { DocViewer as UIDocViewer } from "@family-archive/ui";

/**
 * DocViewer — the upload/edit screen's image inspector. A thin wrapper over the
 * design-system DocViewer (zoom / pan / rotate stage): it renders the scan as a
 * letterboxed sheet so a curator can read it while typing the metadata beside
 * it. PDFs keep their own embedded viewer at the call site (MediaPreview).
 */
export function DocViewer({ url, name }: { url: string; name: string }) {
  return (
    <UIDocViewer resetKey={url} aria-label={name}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={name} className="fa-docviewer__img" draggable={false} />
    </UIDocViewer>
  );
}
