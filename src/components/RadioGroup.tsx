import { useId } from "react";
import type { ReactNode } from "react";

export interface RadioOption {
  value: string;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
}

export interface RadioGroupProps {
  /** Group label (the fieldset legend). */
  legend: ReactNode;
  /** Shared input name; auto-generated if omitted. */
  name?: string;
  options: RadioOption[];
  /** Controlled selected value. */
  value?: string;
  /** Uncontrolled initial value. */
  defaultValue?: string;
  onChange?: (value: string) => void;
}

/**
 * RadioGroup — a single choice from a small set (native radios, accent-colored).
 *
 * A `<fieldset>` + `<legend>` for correct grouping semantics. Works controlled
 * (`value` + `onChange`) or uncontrolled (`defaultValue`). Use for mutually
 * exclusive choices like relationship type or visibility level.
 *
 * @example
 * <RadioGroup legend="Relationship" defaultValue="parent" options={[
 *   { value: "parent", label: "Parent" },
 *   { value: "spouse", label: "Spouse / partner" },
 * ]} />
 */
export function RadioGroup({
  legend,
  name,
  options,
  value,
  defaultValue,
  onChange,
}: RadioGroupProps) {
  const auto = useId();
  const groupName = name ?? auto;
  const controlled = value !== undefined;

  return (
    <fieldset className="fa-radio-group">
      <legend className="fa-radio-group__legend">{legend}</legend>
      {options.map((o) => (
        <label key={o.value} className="fa-choice">
          <input
            type="radio"
            className="fa-choice__input"
            name={groupName}
            value={o.value}
            disabled={o.disabled}
            {...(controlled
              ? { checked: value === o.value, onChange: () => onChange?.(o.value) }
              : { defaultChecked: defaultValue === o.value, onChange: onChange ? () => onChange(o.value) : undefined })}
          />
          <span className="fa-choice__label">
            <span>{o.label}</span>
            {o.description && <span className="fa-choice__desc">{o.description}</span>}
          </span>
        </label>
      ))}
    </fieldset>
  );
}
