import { useId } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  /** Field label rendered above the control. */
  label?: ReactNode;
  /** Helper text shown beneath the control when there is no error. */
  hint?: ReactNode;
  /** Error message. Sets the invalid styling, `aria-invalid`, and replaces the hint. */
  error?: ReactNode;
  /** Marks the field required and shows a sienna asterisk on the label. */
  required?: boolean;
}

/**
 * Input — a single-line text field with optional label, hint, and error.
 *
 * Wires up accessible labelling and description automatically (`htmlFor`,
 * `aria-describedby`, `aria-invalid`). The focus state is a 2px sienna ring; the
 * error state switches the border and ring to danger and surfaces the message
 * below — never a bare red border alone.
 *
 * @example
 * <Input label="Full name" placeholder="Eleanor Margaret Whitfield" required />
 * <Input label="Birth year" hint="Approximate is fine" defaultValue="1888" />
 * <Input label="Email" error="That doesn’t look like an email address" />
 */
export function Input({
  label,
  hint,
  error,
  required,
  id,
  className,
  ...rest
}: InputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;
  const invalid = Boolean(error);

  const inputClasses = ["fa-input", invalid && "fa-input--invalid", className]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="fa-field">
      {label && (
        <label className="fa-field__label" htmlFor={inputId}>
          {label}
          {required && (
            <span className="fa-field__required" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}
      <input
        id={inputId}
        className={inputClasses}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? errorId : hint ? hintId : undefined}
        required={required}
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
        hint && (
          <span id={hintId} className="fa-field__hint">
            {hint}
          </span>
        )
      )}
    </div>
  );
}
