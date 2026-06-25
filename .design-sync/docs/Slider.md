---
category: Forms
---

Slider — a styled single-value range input.

A thin wrapper over `<input type="range">` carrying the design-system voice
(sienna track fill, soft thumb), used for continuous controls such as the
Family Map's time scrubber. Controlled only — pass `value` + `onChange`. The
filled portion is driven by a `--fa-slider-fill` percentage so the track shows
progress without any JavaScript on the paint path.

@example
<Slider aria-label="Year" min={1880} max={2025} value={year} onChange={setYear} />

## Props

```ts
interface SliderProps {
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
```
