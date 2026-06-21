import type { CSSProperties, ReactNode } from "react";

export interface IconBadgeProps {
  /** The glyph — any SVG/icon node. It is auto-sized to the disc. */
  icon: ReactNode;
  /** Hue for the glyph and its tinted disc — any CSS colour, usually a token. @default var(--color-primary) */
  color?: string;
  /** Diameter in px. @default 34 */
  size?: number;
  /** Accessible label. When omitted the badge is decorative (`aria-hidden`). */
  title?: string;
  className?: string;
  style?: CSSProperties;
}

/**
 * IconBadge — a glyph in a softly tinted, ringed disc.
 *
 * The colour drives both the icon and a `color-mix` tint behind it, so a single
 * hue (a document-type or event-type token) reads as one calm unit. Pairs
 * naturally with Timeline rows, list rows, and empty states. Purely decorative
 * by default; pass `title` to give it an accessible name.
 *
 * @example
 * <IconBadge icon={<HeartIcon />} color="var(--doc-certificate)" />
 * <IconBadge icon={<ShipIcon />} color="var(--color-accent)" size={40} title="Immigration" />
 */
export function IconBadge({
  icon,
  color = "var(--color-primary)",
  size = 34,
  title,
  className,
  style,
}: IconBadgeProps) {
  const classes = ["fa-iconbadge", className].filter(Boolean).join(" ");
  return (
    <span
      className={classes}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      style={{ width: size, height: size, color, ...style }}
    >
      {icon}
    </span>
  );
}
