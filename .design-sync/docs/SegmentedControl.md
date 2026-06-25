---
category: Navigation
---

SegmentedControl — a single-choice toggle of 2–4 inline options.

The picked segment fills sienna; the rest are quiet. Use it for view switches
(tree layout, timeline mode) where the options are mutually exclusive and all
worth showing at once — not for navigation (that's Tabs) or on/off (Switch).
Works controlled (`value` + `onValueChange`) or uncontrolled (`defaultValue`).
Wired as a `radiogroup` with arrow-key roving for assistive tech.

@example
<SegmentedControl
  aria-label="Tree layout"
  defaultValue="vertical"
  items={[
    { value: "vertical", label: "Vertical" },
    { value: "horizontal", label: "Horizontal" },
    { value: "radial", label: "Radial" },
  ]}
/>

## Props

```ts
interface SegmentedControlProps {
  /** The segments, left to right. */
  items: SegmentItem[];
  /** Controlled active value. */
  value?: string;
  /** Initial active value when uncontrolled. Defaults to the first segment. */
  defaultValue?: string;
  /** Called with the new value when a segment is chosen. */
  onValueChange?: (value: string) => void;
  /** Compact height for dense toolbars. */
  size?: "sm" | "md";
  /** Visible field label rendered above the control. When set, the group is associated to it via `aria-labelledby` and the ba */
  label?: React.ReactNode;
  /** Helper text shown beneath the control when there is no error. */
  hint?: React.ReactNode;
  /** Error message. Sets `aria-invalid` and replaces the hint. */
  error?: React.ReactNode;
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
```
