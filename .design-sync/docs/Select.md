---
category: Forms
---

Select — a native `<select>` styled to match Input, with a chevron.

Uses the platform control on purpose — full keyboard and screen-reader
behaviour for free, no reinvented dropdown. Same label/hint/error contract as
Input. Pass `<option>`s as children.

@example
<Select label="Document type" defaultValue="certificate">
  <option value="photo">Photo</option>
  <option value="certificate">Certificate</option>
  <option value="obituary">Obituary</option>
</Select>

## Props

```ts
interface SelectProps {
  /** Field label rendered above the control. */
  label?: React.ReactNode;
  /** Helper text shown beneath the control when there is no error. */
  hint?: React.ReactNode;
  /** Error message. Sets the invalid styling, `aria-invalid`, and replaces the hint. */
  error?: React.ReactNode;
  /** Marks the field required and shows a sienna asterisk on the label. */
  required?: boolean;
  /** `<option>` elements. */
  children?: React.ReactNode;
  className?: string;
  id?: string;
  style?: CSSProperties;
}
```
