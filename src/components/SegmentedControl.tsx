import { useId, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent, ReactNode } from "react";

export interface SegmentItem {
  /** Stable identifier for this segment. */
  value: string;
  /** Segment label. */
  label: ReactNode;
  /** Optional leading icon. */
  icon?: ReactNode;
  disabled?: boolean;
}

export interface SegmentedControlProps {
  /** The segments, left to right. */
  items: SegmentItem[];
  /** Controlled active value. */
  value?: string;
  /** Initial active value when uncontrolled. Defaults to the first segment. */
  defaultValue?: string;
  /** Called with the new value when a segment is chosen. */
  onValueChange?: (value: string) => void;
  /** Compact height for dense toolbars. @default "md" */
  size?: "sm" | "md";
  /**
   * Visible field label rendered above the control. When set, the group is
   * associated to it via `aria-labelledby` and the bare `aria-label` is dropped —
   * matching the Input/Combobox label/hint/error contract for use inside forms.
   */
  label?: ReactNode;
  /** Helper text shown beneath the control when there is no error. */
  hint?: ReactNode;
  /** Error message. Sets `aria-invalid` and replaces the hint. */
  error?: ReactNode;
  /** Marks the field required and shows a danger asterisk on the label. */
  required?: boolean;
  /** Root id; the label/hint/error ids derive from it. */
  id?: string;
  /** Accessible name for the group when there is no visible `label` (e.g. "Tree layout"). */
  "aria-label"?: string;
  /** Extra class names merged onto the control, for positioning/floating chrome. */
  className?: string;
  /** Inline style on the root (e.g. a shadow when floating over a canvas). */
  style?: CSSProperties;
}

/**
 * SegmentedControl — a single-choice toggle of 2–4 inline options.
 *
 * The picked segment fills sienna; the rest are quiet. Use it for view switches
 * (tree layout, timeline mode) where the options are mutually exclusive and all
 * worth showing at once — not for navigation (that's Tabs) or on/off (Switch).
 * Works controlled (`value` + `onValueChange`) or uncontrolled (`defaultValue`).
 * Wired as a `radiogroup` with arrow-key roving for assistive tech.
 *
 * @example
 * <SegmentedControl
 *   aria-label="Tree layout"
 *   defaultValue="vertical"
 *   items={[
 *     { value: "vertical", label: "Vertical" },
 *     { value: "horizontal", label: "Horizontal" },
 *     { value: "radial", label: "Radial" },
 *   ]}
 * />
 */
export function SegmentedControl({
  items,
  value,
  defaultValue,
  onValueChange,
  size = "md",
  label,
  hint,
  error,
  required,
  id,
  "aria-label": ariaLabel,
  className,
  style,
}: SegmentedControlProps) {
  const [internal, setInternal] = useState(defaultValue ?? items[0]?.value);
  const active = value ?? internal;
  const btnRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const autoId = useId();
  const fieldId = id ?? autoId;
  const labelId = `${fieldId}-label`;
  const hintId = `${fieldId}-hint`;
  const errorId = `${fieldId}-error`;
  const invalid = Boolean(error);
  const hasField = Boolean(label || hint || error);

  const select = (v: string) => {
    if (value === undefined) setInternal(v);
    onValueChange?.(v);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const keys = ["ArrowRight", "ArrowLeft", "Home", "End"];
    if (!keys.includes(e.key)) return;
    const enabled = items.filter((it) => !it.disabled);
    if (enabled.length === 0) return;
    e.preventDefault();
    const idx = enabled.findIndex((it) => it.value === active);
    const next =
      e.key === "Home"
        ? enabled[0]
        : e.key === "End"
          ? enabled[enabled.length - 1]
          : e.key === "ArrowRight"
            ? enabled[(idx + 1) % enabled.length]
            : enabled[(idx - 1 + enabled.length) % enabled.length];
    if (next) {
      select(next.value);
      btnRefs.current[next.value]?.focus();
    }
  };

  const classes = ["fa-seg", size === "sm" && "fa-seg--sm", className]
    .filter(Boolean)
    .join(" ");

  const group = (
    <div
      className={classes}
      style={hasField ? undefined : style}
      role="radiogroup"
      aria-label={label ? undefined : ariaLabel}
      aria-labelledby={label ? labelId : undefined}
      aria-describedby={invalid ? errorId : hint ? hintId : undefined}
      onKeyDown={onKeyDown}
    >
      {items.map((it) => {
        const on = it.value === active;
        return (
          <button
            key={it.value}
            ref={(el) => {
              btnRefs.current[it.value] = el;
            }}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            disabled={it.disabled}
            className={`fa-seg__item${on ? " fa-seg__item--on" : ""}`}
            onClick={() => select(it.value)}
          >
            {it.icon && <span className="fa-seg__icon">{it.icon}</span>}
            {it.label}
          </button>
        );
      })}
    </div>
  );

  // Bare control (floating toolbars): unchanged. Otherwise wrap it in the shared
  // field scaffold so a labelled segmented control reads exactly like an Input.
  if (!hasField) return group;

  return (
    <div className="fa-field" style={style}>
      {label && (
        <span className="fa-field__label" id={labelId}>
          {label}
          {required && (
            <span className="fa-field__required" aria-hidden="true">
              *
            </span>
          )}
        </span>
      )}
      {group}
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
