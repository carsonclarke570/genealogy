import type { CSSProperties, ReactNode } from "react";

export interface DetailRowProps {
  /** The quiet label on the left. */
  label: ReactNode;
  /** The value on the right. */
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/**
 * DetailRow — one "label · value" line in a description list.
 *
 * A muted, fixed-width label paired with an ink value, sized for a metadata
 * panel (a media detail, a record sidebar). Stack several and they align on the
 * label column. Rendered as a `dl`/`dt`/`dd` pair so assistive tech reads the
 * term and its value as associated. For form fields use `Input`; this is
 * read-only presentation.
 *
 * @example
 * <DetailRow label="Uploaded">12 May 2024</DetailRow>
 * <DetailRow label="Type">Certificate</DetailRow>
 */
export function DetailRow({ label, children, className, style }: DetailRowProps) {
  return (
    <dl className={["fa-detailrow", className].filter(Boolean).join(" ")} style={style}>
      <dt className="fa-detailrow__label">{label}</dt>
      <dd className="fa-detailrow__value">{children}</dd>
    </dl>
  );
}
