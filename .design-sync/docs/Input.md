---
category: Forms
---

Input — a single-line text field with optional label, hint, and error.

Wires up accessible labelling and description automatically (`htmlFor`,
`aria-describedby`, `aria-invalid`). The focus state is a 2px sienna ring; the
error state switches the border and ring to danger and surfaces the message
below — never a bare red border alone.

@example
<Input label="Full name" placeholder="Eleanor Margaret Whitfield" required />
<Input label="Birth year" hint="Approximate is fine" defaultValue="1888" />
<Input label="Email" error="That doesn’t look like an email address" />

## Props

```ts
interface InputProps {
  /** Field label rendered above the control. */
  label?: React.ReactNode;
  /** Helper text shown beneath the control when there is no error. */
  hint?: React.ReactNode;
  /** Error message. Sets the invalid styling, `aria-invalid`, and replaces the hint. */
  error?: React.ReactNode;
  /** Marks the field required and shows a sienna asterisk on the label. */
  required?: boolean;
  className?: string;
  id?: string;
  style?: CSSProperties;
  children?: React.ReactNode;
}
```
