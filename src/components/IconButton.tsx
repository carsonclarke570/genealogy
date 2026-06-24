import type { ButtonHTMLAttributes, ReactNode } from "react";

export type IconButtonSize = "sm" | "md";

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** The lone glyph to render (an icon node). */
  children: ReactNode;
  /**
   * Accessible name — required, because the button carries no visible label.
   * Pair it with the action ("Zoom in", "Close", "Recenter").
   */
  "aria-label": string;
  /** Compact box for dense toolbars. @default "md" */
  size?: IconButtonSize;
}

/**
 * IconButton — a quiet, label-less control for a single glyph.
 *
 * The toolbar workhorse: transparent until hovered, then it fills with the
 * sunken surface and the glyph warms from muted to ink. Use it for canvas and
 * panel chrome (zoom, recenter, close, theme toggle) where a row of icons needs
 * to stay dense and unobtrusive — not for a primary action (that's `Button`).
 * Always pass an `aria-label`; on touch pointers the hit area grows to 44px.
 *
 * @example
 * <IconButton aria-label="Zoom in" onClick={zoomIn}><PlusIcon /></IconButton>
 */
export function IconButton({
  children,
  size = "md",
  className,
  type = "button",
  ...rest
}: IconButtonProps) {
  const classes = ["fa-iconbtn", size === "sm" && "fa-iconbtn--sm", className]
    .filter(Boolean)
    .join(" ");

  return (
    <button type={type} className={classes} {...rest}>
      {children}
    </button>
  );
}
