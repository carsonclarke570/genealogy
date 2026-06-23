import { cloneElement, isValidElement, useEffect, useId, useRef, useState } from "react";
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
  const wrapRef = useRef<HTMLSpanElement>(null);
  // Touch has no hover, so a tap toggles the bubble. Pointer/keyboard still use
  // the CSS :hover / :focus-within paths and never set this.
  const [tapOpen, setTapOpen] = useState(false);
  const shown = open || tapOpen;
  const classes = ["fa-tooltip", shown && "fa-tooltip--open"]
    .filter(Boolean)
    .join(" ");

  useEffect(() => {
    if (!tapOpen) return;
    const dismiss = (e: Event) => {
      if (e.type === "scroll" || !wrapRef.current?.contains(e.target as Node)) {
        setTapOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setTapOpen(false);
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", dismiss, true);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", dismiss, true);
    };
  }, [tapOpen]);

  // Associate the bubble with its trigger so assistive tech announces it.
  const trigger = isValidElement(children)
    ? cloneElement(children as ReactElement<{ "aria-describedby"?: string }>, {
        "aria-describedby": [children.props["aria-describedby"], id]
          .filter(Boolean)
          .join(" "),
      })
    : children;

  return (
    <span
      ref={wrapRef}
      className="fa-tooltip-wrap"
      onPointerDown={(e) => {
        if (e.pointerType === "touch") setTapOpen((v) => !v);
      }}
    >
      {trigger}
      <span role="tooltip" id={id} className={classes}>
        {label}
      </span>
    </span>
  );
}
