import { useState } from "react";
import type { ReactNode } from "react";

export interface SwitchProps {
  /** Optional label shown after the track. */
  label?: ReactNode;
  /** Controlled on/off state. */
  checked?: boolean;
  /** Uncontrolled initial state. */
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
}

/**
 * Switch — an instant on/off toggle (`role="switch"`).
 *
 * For settings that apply immediately (e.g. a privacy/visibility toggle), as
 * opposed to a Checkbox in a form you submit. The track fills sienna when on.
 * Works controlled or uncontrolled.
 *
 * @example
 * <Switch label="Show living relatives" defaultChecked />
 * <Switch label="Public link" checked={isPublic} onChange={setPublic} />
 */
export function Switch({
  label,
  checked,
  defaultChecked,
  onChange,
  disabled,
  id,
}: SwitchProps) {
  const [internal, setInternal] = useState(defaultChecked ?? false);
  const on = checked ?? internal;

  const toggle = () => {
    if (disabled) return;
    if (checked === undefined) setInternal(!on);
    onChange?.(!on);
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      id={id}
      className="fa-switch"
      onClick={toggle}
    >
      <span className="fa-switch__track">
        <span className="fa-switch__thumb" />
      </span>
      {label && <span>{label}</span>}
    </button>
  );
}
