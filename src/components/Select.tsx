import { useId } from "react";
import type { SelectHTMLAttributes, ReactNode } from "react";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  /** Field label rendered above the control. */
  label?: ReactNode;
  /** Helper text shown beneath the control when there is no error. */
  hint?: ReactNode;
  /** Error message. Sets the invalid styling, `aria-invalid`, and replaces the hint. */
  error?: ReactNode;
  /** Marks the field required and shows a sienna asterisk on the label. */
  required?: boolean;
  /** `<option>` elements. */
  children?: ReactNode;
}

/**
 * Select — a native `<select>` styled to match Input, with a chevron.
 *
 * Uses the platform control on purpose — full keyboard and screen-reader
 * behaviour for free, no reinvented dropdown. Same label/hint/error contract as
 * Input. Pass `<option>`s as children.
 *
 * @example
 * <Select label="Document type" defaultValue="certificate">
 *   <option value="photo">Photo</option>
 *   <option value="certificate">Certificate</option>
 *   <option value="obituary">Obituary</option>
 * </Select>
 */
export function Select({
  label,
  hint,
  error,
  required,
  id,
  className,
  children,
  ...rest
}: SelectProps) {
  const autoId = useId();
  const selId = id ?? autoId;
  const hintId = `${selId}-hint`;
  const errorId = `${selId}-error`;
  const invalid = Boolean(error);

  const classes = ["fa-select", invalid && "fa-select--invalid", className]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="fa-field">
      {label && (
        <label className="fa-field__label" htmlFor={selId}>
          {label}
          {required && (
            <span className="fa-field__required" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}
      <div className="fa-select-wrap">
        <select
          id={selId}
          className={classes}
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? errorId : hint ? hintId : undefined}
          aria-required={required || undefined}
          {...rest}
        >
          {children}
        </select>
        <svg
          className="fa-select__chevron"
          width="12"
          height="12"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
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
