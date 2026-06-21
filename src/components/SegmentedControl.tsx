import { useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";

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
  /** Accessible name for the group (e.g. "Tree layout"). */
  "aria-label"?: string;
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
  "aria-label": ariaLabel,
}: SegmentedControlProps) {
  const [internal, setInternal] = useState(defaultValue ?? items[0]?.value);
  const active = value ?? internal;

  const select = (v: string) => {
    if (value === undefined) setInternal(v);
    onValueChange?.(v);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const enabled = items.filter((it) => !it.disabled);
    const idx = enabled.findIndex((it) => it.value === active);
    if (idx < 0) return;
    const next =
      e.key === "ArrowRight"
        ? enabled[(idx + 1) % enabled.length]
        : enabled[(idx - 1 + enabled.length) % enabled.length];
    if (next) select(next.value);
  };

  const classes = ["fa-seg", size === "sm" && "fa-seg--sm"]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} role="radiogroup" aria-label={ariaLabel} onKeyDown={onKeyDown}>
      {items.map((it) => {
        const on = it.value === active;
        return (
          <button
            key={it.value}
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
}
