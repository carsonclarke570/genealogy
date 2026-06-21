import { cloneElement, isValidElement, useId } from "react";
import type { ReactElement, ReactNode } from "react";

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

  // Associate the bubble with its trigger so assistive tech announces it.
  const trigger = isValidElement(children)
    ? cloneElement(children as ReactElement<{ "aria-describedby"?: string }>, {
        "aria-describedby": [children.props["aria-describedby"], id]
          .filter(Boolean)
          .join(" "),
      })
    : children;

  return (
    <span className="fa-tooltip-wrap">
      {trigger}
      <span role="tooltip" id={id} className={classes}>
        {label}
      </span>
    </span>
  );
}
