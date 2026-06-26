import type { HTMLAttributes, ReactNode } from "react";
import { Icon } from "./Icon";
import type { GlyphName } from "./Icon";

export type CalloutTone = "neutral" | "info" | "success" | "warning" | "danger";

export interface CalloutProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  /** Semantic tone — sets the border, tint, and (for the louder tones) a default icon. @default "info" */
  tone?: CalloutTone;
  /** Optional bold heading row above the body. */
  title?: ReactNode;
  /**
   * Leading icon. Defaults by tone — a check for `success`, a warning mark for
   * `warning`/`danger`, and none for the quiet `info`/`neutral` tones (their tint
   * and border already carry the signal). Pass a node to override, or `null` to
   * force-omit the icon on a louder tone.
   */
  icon?: ReactNode;
  /** The message. */
  children: ReactNode;
}

// Icon presence escalates with urgency: the quiet tones carry no mark (a warning
// triangle on an info note would misread as a warning), success gets a check,
// and only warning/danger get the alert triangle.
const DEFAULT_GLYPH: Record<CalloutTone, GlyphName | null> = {
  neutral: null,
  info: null,
  success: "check",
  warning: "alert",
  danger: "alert",
};

/**
 * Callout — a persistent inline message block.
 *
 * The quiet counterpart to a Toast: it stays in the layout to explain, confirm,
 * or warn in place. A full-bordered, tinted box (never a side stripe) with a
 * tone-coloured icon and ink body text for legibility. Use `title` for a bold
 * lead line; nest a checkbox, list, or actions as children for an
 * acknowledgement block. For a live validation error, pass `role="alert"`.
 *
 * @example
 * <Callout tone="success">Every change is recorded as <strong>Verified</strong>.</Callout>
 * <Callout tone="warning" title="2 changes need confirmation" role="alert">…</Callout>
 */
export function Callout({
  tone = "info",
  title,
  icon,
  children,
  className,
  ...rest
}: CalloutProps) {
  const glyph = DEFAULT_GLYPH[tone];
  const resolvedIcon =
    icon !== undefined ? icon : glyph ? <Icon name={glyph} size={16} /> : null;

  const classes = ["fa-callout", `fa-callout--${tone}`, className]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} {...rest}>
      {resolvedIcon && (
        <span className="fa-callout__icon" aria-hidden="true">
          {resolvedIcon}
        </span>
      )}
      <div className="fa-callout__body">
        {title && <div className="fa-callout__title">{title}</div>}
        <div className="fa-callout__text">{children}</div>
      </div>
    </div>
  );
}
