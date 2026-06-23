import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Visual emphasis.
   * - `primary` — the single sienna call-to-action; use at most once per view.
   * - `secondary` — the default for most actions (panel surface + hairline).
   * - `ghost` — low-emphasis, for toolbars and inline actions.
   * - `danger` — destructive confirmation only.
   * @default "primary"
   */
  variant?: ButtonVariant;
  /** Control height/padding. @default "md" */
  size?: ButtonSize;
  /** Stretch to fill the container width. */
  fullWidth?: boolean;
  /**
   * Square, label-less button for a lone glyph (e.g. an overflow `⋯` trigger).
   * Drops the label-side padding and locks the box to a 1:1 ratio so the icon
   * sits centred at the same height as a normal button. Always pair with an
   * `aria-label`.
   */
  iconOnly?: boolean;
  /** Show a spinner and disable interaction while an action is in flight. */
  loading?: boolean;
  /** Optional icon rendered before the label. */
  iconStart?: ReactNode;
  children?: ReactNode;
}

/**
 * Button — the primary action control.
 *
 * The `primary` variant is the one warm "voice" on a screen (The One Voice Rule):
 * reserve it for the single most important action and let everything else be
 * `secondary` or `ghost`. Carries every interactive state — hover, focus-visible
 * ring, active press, disabled, and a `loading` spinner that also blocks input.
 *
 * @example
 * <Button variant="primary">Add person</Button>
 * <Button variant="secondary" iconStart={<UploadIcon />}>Upload media</Button>
 * <Button variant="danger">Delete record</Button>
 */
export function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  iconOnly = false,
  loading = false,
  iconStart,
  className,
  children,
  disabled,
  type = "button",
  ...rest
}: ButtonProps) {
  const classes = [
    "fa-btn",
    `fa-btn--${variant}`,
    size === "sm" && "fa-btn--sm",
    fullWidth && "fa-btn--block",
    iconOnly && "fa-btn--icon",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <span className="fa-btn__spinner" aria-hidden="true" />}
      {!loading && iconStart && (
        <span className="fa-btn__icon" aria-hidden="true">
          {iconStart}
        </span>
      )}
      {children}
    </button>
  );
}
