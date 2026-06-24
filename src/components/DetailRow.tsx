import type { CSSProperties, ReactNode } from "react";

export interface DetailRowProps {
  /** The quiet label on the left. */
  label: ReactNode;
  /** The value on the right. */
  children: ReactNode;
  /** Fixed label-column width in px, so a stack of rows aligns. @default 76 */
  labelWidth?: number;
  className?: string;
  style?: CSSProperties;
}

/**
 * DetailRow — one "label · value" line in a description list.
 *
 * A muted, fixed-width label paired with an ink value, sized for a metadata
 * panel (a media detail, a record sidebar). Stack several and they align on the
 * label column. For form fields use `Input`; this is read-only presentation.
 *
 * @example
 * <DetailRow label="Uploaded">12 May 2024</DetailRow>
 * <DetailRow label="Type">Certificate</DetailRow>
 */
export function DetailRow({ label, children, labelWidth = 76, className, style }: DetailRowProps) {
  return (
    <div className={["fa-detailrow", className].filter(Boolean).join(" ")} style={style}>
      <span className="fa-detailrow__label" style={{ width: labelWidth }}>
        {label}
      </span>
      <span className="fa-detailrow__value">{children}</span>
    </div>
  );
}
