import { type ReactNode } from "react";
import { cn } from "../../../lib/cn";

export interface FieldProps {
  /** Field label text. */
  label: string;
  /** The `id` of the control this field labels (matches the control's `id`). */
  htmlFor?: string;
  /** Helper text shown beneath the control when there is no error. */
  hint?: ReactNode;
  /** Error message; when present it replaces the hint and is styled in red. */
  error?: ReactNode;
  /** Mark the field as required with a subtle indicator. */
  required?: boolean;
  /** The control (Input, Textarea, …). */
  children: ReactNode;
  className?: string;
}

/**
 * Labels a form control with an accessible label, optional hint, and an
 * error slot. Use it to wrap `Input` / `Textarea` on person and media forms.
 * Pass the same `id` to both the control and this field's `htmlFor`.
 */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  required = false,
  children,
  className,
}: FieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label
        htmlFor={htmlFor}
        className="font-sans text-sm font-medium text-ink"
      >
        {label}
        {required && (
          <span className="ml-0.5 text-accent" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {children}
      {error ? (
        <p className="text-sm text-danger">{error}</p>
      ) : hint ? (
        <p className="text-sm text-ink-muted">{hint}</p>
      ) : null}
    </div>
  );
}
