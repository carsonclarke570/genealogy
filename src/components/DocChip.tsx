import type { HTMLAttributes, ReactNode } from "react";
import type { DocType } from "./Provenance";

const DOC_LABEL: Record<DocType, string> = {
  photo: "Photo",
  certificate: "Certificate",
  article: "Article",
  obituary: "Obituary",
  other: "Document",
};

export interface DocChipProps extends HTMLAttributes<HTMLSpanElement> {
  /** Which document type — sets the dot colour and the default label. */
  type: DocType;
  /** Override the label (e.g. a document title). Defaults to the type name. */
  children?: ReactNode;
}

/**
 * DocChip — a document-type dot beside its label.
 *
 * The quiet inline marker for "this is a photo / certificate / article…",
 * shared by the media grid, search results, the record, and timeline events.
 * The dot carries the per-type hue; the label always spells the meaning out, so
 * it never relies on colour alone. Lighter than `Chip` (no pill) — for labelling,
 * not filtering. For a tappable filter, use `<Chip dot=… onClick=…>`.
 *
 * @example
 * <DocChip type="certificate" />
 * <DocChip type="photo">Wedding, 1947</DocChip>
 */
export function DocChip({ type, children, className, ...rest }: DocChipProps) {
  const classes = ["fa-docchip", className].filter(Boolean).join(" ");
  return (
    <span className={classes} {...rest}>
      <span
        className="fa-docchip__dot"
        style={{ ["--dot" as string]: `var(--doc-${type})` }}
        aria-hidden="true"
      />
      <span className="fa-docchip__label">{children ?? DOC_LABEL[type]}</span>
    </span>
  );
}
