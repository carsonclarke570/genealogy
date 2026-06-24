import type { HTMLAttributes, MouseEventHandler, ReactNode } from "react";

/** Document-type (or relationship) accent applied to the chip's leading dot. */
export type ChipDot =
  | "photo"
  | "certificate"
  | "article"
  | "obituary"
  | "census"
  | "grave"
  | "other"
  | "accent";

const DOT_COLOR: Record<ChipDot, string> = {
  photo: "var(--doc-photo)",
  certificate: "var(--doc-certificate)",
  article: "var(--doc-article)",
  obituary: "var(--doc-obituary)",
  census: "var(--doc-census)",
  grave: "var(--doc-grave)",
  other: "var(--doc-other)",
  accent: "var(--color-primary)",
};

export interface ChipProps extends HTMLAttributes<HTMLElement> {
  /** Selected (active filter) state — sienna tint + border. */
  selected?: boolean;
  /** Show a small leading dot in a per-type hue. The type is always also spelled out. */
  dot?: ChipDot;
  /** When provided, the chip renders as a real `<button>` for filtering. */
  onClick?: MouseEventHandler<HTMLElement>;
  children?: ReactNode;
}

/**
 * Chip — a compact tag for document types, relationship labels, and filters.
 *
 * Renders as a `<span>` for display, or a real `<button>` when `onClick` is set
 * (so keyboard and screen-reader users get a proper control). The `selected`
 * state is a sienna tint; `dot` adds a per-type colour cue — but the label text
 * always carries the meaning too, never colour alone.
 *
 * @example
 * <Chip dot="certificate">Certificate</Chip>
 * <Chip selected onClick={() => {}}>Photos</Chip>
 */
export function Chip({
  selected = false,
  dot,
  className,
  children,
  onClick,
  ...rest
}: ChipProps) {
  const classes = ["fa-chip", selected && "fa-chip--selected", className]
    .filter(Boolean)
    .join(" ");

  const content = (
    <>
      {dot && (
        <span
          className="fa-chip__dot"
          style={{ ["--dot" as string]: DOT_COLOR[dot] }}
          aria-hidden="true"
        />
      )}
      {children}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        className={classes}
        aria-pressed={selected}
        onClick={onClick}
        {...rest}
      >
        {content}
      </button>
    );
  }

  return (
    <span className={classes} {...rest}>
      {content}
    </span>
  );
}
