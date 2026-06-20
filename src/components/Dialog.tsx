import { useEffect, useId } from "react";
import type { ReactNode } from "react";

export interface DialogProps {
  /** Whether the dialog is shown. */
  open: boolean;
  /** Called on backdrop click, the close button, or Escape. */
  onClose: () => void;
  /** Dialog title (sans, not the serif). */
  title: ReactNode;
  /** Optional supporting line beneath the title. */
  description?: ReactNode;
  /** Footer actions, right-aligned (e.g. a Cancel ghost + a primary Button). */
  footer?: ReactNode;
  children?: ReactNode;
}

/**
 * Dialog — a modal for focused, interrupting tasks (confirm delete, upload).
 *
 * Reach for inline/progressive UI first; use a modal only when the task must
 * interrupt. Renders a scrim (`--color-backdrop`) over the page with a centered
 * panel. Closes on Escape, backdrop click, or the close button. Labelled via
 * `aria-labelledby`/`aria-describedby`; `role="dialog"` + `aria-modal`.
 *
 * @example
 * <Dialog
 *   open={open}
 *   onClose={() => setOpen(false)}
 *   title="Delete this record?"
 *   description="This removes Eleanor Whitfield and detaches her 3 documents."
 *   footer={<>
 *     <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
 *     <Button variant="danger" onClick={confirm}>Delete</Button>
 *   </>}
 * />
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  footer,
  children,
}: DialogProps) {
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fa-dialog-backdrop" onClick={onClose}>
      <div
        className="fa-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={description ? `${id}-desc` : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="fa-dialog__close"
          aria-label="Close"
          onClick={onClose}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
        <h2 id={`${id}-title`} className="fa-dialog__title">
          {title}
        </h2>
        {description && (
          <p id={`${id}-desc`} className="fa-dialog__desc">
            {description}
          </p>
        )}
        {children && <div className="fa-dialog__body">{children}</div>}
        {footer && <div className="fa-dialog__footer">{footer}</div>}
      </div>
    </div>
  );
}
