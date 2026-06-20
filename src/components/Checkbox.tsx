import type { InputHTMLAttributes, ReactNode } from "react";

export interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  /** The control's label. */
  label: ReactNode;
  /** Optional secondary line beneath the label. */
  description?: ReactNode;
}

/**
 * Checkbox — a single boolean control (native input, accent-colored).
 *
 * Uses the platform checkbox tinted with `--color-primary` (`accent-color`), so
 * it themes and stays fully accessible. The whole label row is the hit target.
 *
 * @example
 * <Checkbox label="Living person" description="Hides sensitive details from shared views" />
 * <Checkbox label="Include in exports" defaultChecked />
 */
export function Checkbox({ label, description, className, ...rest }: CheckboxProps) {
  const classes = ["fa-choice", className].filter(Boolean).join(" ");
  return (
    <label className={classes}>
      <input type="checkbox" className="fa-choice__input" {...rest} />
      <span className="fa-choice__label">
        <span>{label}</span>
        {description && <span className="fa-choice__desc">{description}</span>}
      </span>
    </label>
  );
}
