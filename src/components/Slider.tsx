import type { CSSProperties } from "react";

export interface SliderProps {
  /** Current value (controlled). */
  value: number;
  min?: number;
  max?: number;
  step?: number;
  /** Called with the next value as the thumb moves. */
  onChange?: (value: number) => void;
  disabled?: boolean;
  /** Accessible name (there is usually no visible label beside it). */
  "aria-label"?: string;
  className?: string;
  style?: CSSProperties;
}

/**
 * Slider — a styled single-value range input.
 *
 * A thin wrapper over `<input type="range">` carrying the design-system voice
 * (sienna track fill, soft thumb), used for continuous controls such as the
 * Family Map's time scrubber. Controlled only — pass `value` + `onChange`. The
 * filled portion is driven by a `--fa-slider-fill` percentage so the track shows
 * progress without any JavaScript on the paint path.
 *
 * @example
 * <Slider aria-label="Year" min={1880} max={2025} value={year} onChange={setYear} />
 */
export function Slider({
  value,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  disabled,
  "aria-label": ariaLabel,
  className,
  style,
}: SliderProps) {
  const span = max - min || 1;
  const pct = Math.max(0, Math.min(100, ((value - min) / span) * 100));
  return (
    <input
      type="range"
      className={"fa-slider" + (className ? ` ${className}` : "")}
      min={min}
      max={max}
      step={step}
      value={value}
      disabled={disabled}
      aria-label={ariaLabel}
      onChange={(e) => onChange?.(Number(e.target.value))}
      style={{ ["--fa-slider-fill" as string]: `${pct}%`, ...style }}
    />
  );
}
