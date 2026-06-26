import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";
import { Avatar } from "./Avatar";

export interface PersonRowProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Full name — shown in the serif face. */
  name: string;
  /** Life-dates string (e.g. "1888–1971"). */
  dates?: ReactNode;
  /** Optional relationship label shown before the dates (e.g. "Spouse"). */
  relation?: ReactNode;
  /** Portrait image URL; falls back to a monogram. */
  photoUrl?: string;
  /** Avatar + name scale. `sm` for dense lists, `md` for search-style results. @default "sm" */
  size?: "sm" | "md";
  /** A lineage / category colour shown as a leading dot (e.g. the family-line hue). */
  accentColor?: string;
  /** Trailing slot — a chevron, badge, or count, aligned to the end. */
  trailing?: ReactNode;
}

/**
 * PersonRow — the compact avatar + name + dates list-row.
 *
 * The shared row for showing a person in a list: relationship panels, search
 * results, a document's people, a map's place focus. A portrait (or monogram),
 * the name in the Spectral serif, and life-dates in muted tabular figures, with
 * an optional leading relationship label, a lineage dot, and a trailing slot for
 * a chevron or badge. A real `<button>` — keyboard-focusable and clickable.
 * Distinct from {@link PersonNode}, the heavier tree atom.
 *
 * @example
 * <PersonRow name="James Whitfield" relation="Father" dates="1888–1971" onClick={open} />
 * <PersonRow name="Eleanor Whitfield" dates="1915–1998" size="md"
 *   trailing={<Badge tone="info">3 docs</Badge>} />
 */
export function PersonRow({
  name,
  dates,
  relation,
  photoUrl,
  size = "sm",
  accentColor,
  trailing,
  className,
  type = "button",
  ...rest
}: PersonRowProps) {
  const classes = ["fa-person-row", `fa-person-row--${size}`, className]
    .filter(Boolean)
    .join(" ");

  return (
    <button type={type} className={classes} {...rest}>
      {accentColor && (
        <span
          className="fa-person-row__dot"
          style={{ ["--row-accent" as string]: accentColor } as CSSProperties}
          aria-hidden="true"
        />
      )}
      <span className="fa-person-row__avatar">
        <Avatar name={name} src={photoUrl} size={size} />
      </span>
      <span className="fa-person-row__body">
        <span className="fa-person-row__name">{name}</span>
        {(relation || dates) && (
          <span className="fa-person-row__dates">
            {relation && <span className="fa-person-row__relation">{relation}</span>}
            {relation && dates && " · "}
            {dates}
          </span>
        )}
      </span>
      {trailing && <span className="fa-person-row__trailing">{trailing}</span>}
    </button>
  );
}
