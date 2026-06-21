import type { HTMLAttributes } from "react";

export type SpinnerSize = "sm" | "md" | "lg";

export interface SpinnerProps extends HTMLAttributes<HTMLSpanElement> {
  size?: SpinnerSize;
  /** Accessible label announced to screen readers. @default "Loading" */
  label?: string;
}

/**
 * Spinner — a standalone indeterminate loader.
 *
 * For async work without a known duration (the tree resolving, a media fetch).
 * Prefer Skeleton when you can hint at the shape of incoming content; use the
 * Spinner inside buttons or other compact spots. `role="status"` + a label.
 *
 * @example
 * <Spinner />
 * <Spinner size="lg" label="Loading family tree" />
 */
export function Spinner({ size = "md", label = "Loading", className, ...rest }: SpinnerProps) {
  const classes = ["fa-spinner", `fa-spinner--${size}`, className]
    .filter(Boolean)
    .join(" ");
  return <span className={classes} role="status" aria-label={label} {...rest} />;
}
