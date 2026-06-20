import { useId } from "react";
import type { TextareaHTMLAttributes, ReactNode } from "react";

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Field label rendered above the control. */
  label?: ReactNode;
  /** Helper text shown beneath the control when there is no error. */
  hint?: ReactNode;
  /** Error message. Sets invalid styling, `aria-invalid`, and replaces the hint. */
  error?: ReactNode;
  /** Marks the field required and shows a sienna asterisk on the label. */
  required?: boolean;
}

/**
 * Textarea — a multi-line field for prose (notes, biographies).
 *
 * The long-form counterpart to Input, with the same label/hint/error contract.
 * Resizes vertically. For readable prose, cap the rendered width near `--measure`
 * (65–75ch) at the layout level.
 *
 * @example
 * <Textarea label="Notes" rows={5} placeholder="What do you know about this person?" />
 * <Textarea label="Biography" hint="Plain text; saved with the record" />
 */
export function Textarea({
  label,
  hint,
  error,
  required,
  id,
  rows = 4,
  className,
  ...rest
}: TextareaProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const hintId = `${fieldId}-hint`;
  const errorId = `${fieldId}-error`;
  const invalid = Boolean(error);

  const classes = ["fa-textarea", invalid && "fa-textarea--invalid", className]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="fa-field">
      {label && (
        <label className="fa-field__label" htmlFor={fieldId}>
          {label}
          {required && (
            <span className="fa-field__required" aria-hidden="true">*</span>
          )}
        </label>
      )}
      <textarea
        id={fieldId}
        rows={rows}
        className={classes}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? errorId : hint ? hintId : undefined}
        aria-required={required || undefined}
        {...rest}
      />
      {invalid ? (
        <span id={errorId} className="fa-field__error" role="alert">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
            <path d="M8 4.5v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="8" cy="11" r="0.9" fill="currentColor" />
          </svg>
          {error}
        </span>
      ) : (
        hint && <span id={hintId} className="fa-field__hint">{hint}</span>
      )}
    </div>
  );
}
