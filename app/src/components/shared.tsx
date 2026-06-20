"use client";

import { Avatar } from "@family-archive/ui";
import type { DocType } from "@family-archive/ui";
import { shortName, lifeDates } from "@/lib/family-data";
import { useDataset } from "@/lib/dataset";

/** Small colour-coded dot for a document type (matches --doc-* tokens). */
export function DocDot({ type }: { type: DocType }) {
  return <span className={`app-docdot ${type}`} />;
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
