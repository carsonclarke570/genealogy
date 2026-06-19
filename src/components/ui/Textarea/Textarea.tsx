import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "../../../lib/cn";

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Render the error state (red border + ring). */
  invalid?: boolean;
}

const base =
  "w-full rounded-md border bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-subtle outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-1 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:opacity-60";

/**
 * A multi-line text field for biographical notes, obituaries, and
 * free-form record details. Grows with `rows`; pair with `Field` for labels.
 */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ invalid = false, rows = 4, className, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        rows={rows}
        aria-invalid={invalid || undefined}
        className={cn(
          base,
          "resize-y leading-relaxed",
          invalid
            ? "border-danger focus-visible:ring-danger/40"
            : "border-line-strong",
          className,
        )}
        {...props}
      />
    );
  },
);
