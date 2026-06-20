import { useId } from "react";
import type { ReactNode } from "react";

export interface TooltipProps {
  /** The tooltip text. */
  label: ReactNode;
  /** Force the tooltip visible (e.g. static previews / controlled use). */
  open?: boolean;
  /** The trigger element the tooltip describes. */
  children: ReactNode;
}

/**
 * Tooltip — a small label revealed on hover or keyboard focus of its trigger.
 *
 * Wrap a focusable trigger (button, icon button). The bubble appears above the
 * trigger on `:hover` / `:focus-within`; pass `open` to force it. Keep tooltips
 * to terse, non-essential hints — never the only place critical information lives.
 *
 * @example
 * <Tooltip label="Has attached documents">
 *   <Button variant="ghost" aria-label="Documents">3</Button>
 * </Tooltip>
 */
export function Tooltip({ label, open, children }: TooltipProps) {
  const id = useId();
  const classes = ["fa-tooltip", open && "fa-tooltip--open"]
    .filter(Boolean)
    .join(" ");
  return (
    <span className="fa-tooltip-wrap">
      {children}
      <span role="tooltip" id={id} className={classes}>
        {label}
      </span>
    </span>
  );
}
