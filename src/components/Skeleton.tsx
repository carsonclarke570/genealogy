import type { CSSProperties } from "react";

export type SkeletonVariant = "block" | "text" | "circle";

export interface SkeletonProps {
  /** Shape: a block, a text line, or a circle (avatar). @default "block" */
  variant?: SkeletonVariant;
  width?: number | string;
  height?: number | string;
  className?: string;
  style?: CSSProperties;
}

/**
 * Skeleton — a content-shaped loading placeholder.
 *
 * Preferred over a Spinner when you can mirror the shape of incoming content
 * (a person card, a media tile, lines of a bio) — it reduces layout shift and
 * perceived wait. Shimmers gently; the shimmer stops under
 * `prefers-reduced-motion`. Decorative (`aria-hidden`); mark the live region
 * `aria-busy` on the container.
 *
 * @example
 * <Skeleton variant="circle" width={40} height={40} />
 * <Skeleton variant="text" width="60%" />
 * <Skeleton width={240} height={84} />
 */
export function Skeleton({
  variant = "block",
  width,
  height,
  className,
  style,
}: SkeletonProps) {
  const classes = ["fa-skeleton", `fa-skeleton--${variant}`, className]
    .filter(Boolean)
    .join(" ");
  return <span className={classes} aria-hidden="true" style={{ width, height, ...style }} />;
}
