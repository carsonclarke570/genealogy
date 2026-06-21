import type { HTMLAttributes, ReactNode } from "react";

export type BadgeTone = "neutral" | "info" | "success" | "warning" | "danger";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /** Semantic tone. @default "neutral" */
  tone?: BadgeTone;
  /** Show a small leading status dot in the tone's colour. */
  dot?: boolean;
  children?: ReactNode;
}

/**
 * Badge — a small status pill for record metadata.
 *
 * Uses the semantic tint/ink token pairs (info = teal, success, warning = amber,
 * danger). Tones sit close on the colour wheel by design, so pair a badge with
 * text and, when it stands alone, the `dot` — never rely on colour alone.
 *
 * @example
 * <Badge tone="success" dot>Verified</Badge>
 * <Badge tone="warning">No source</Badge>
 * <Badge tone="info">3 documents</Badge>
 */
export function Badge({
  tone = "neutral",
  dot = false,
  className,
  children,
  ...rest
}: BadgeProps) {
  const classes = ["fa-badge", `fa-badge--${tone}`, className]
    .filter(Boolean)
    .join(" ");
  return (
    <span className={classes} {...rest}>
      {dot && (
        <span
          className="fa-badge__dot"
          style={{ ["--dot" as string]: "currentColor" }}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}
