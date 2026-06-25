---
category: Forms
---

Textarea — a multi-line field for prose (notes, biographies).

The long-form counterpart to Input, with the same label/hint/error contract.
Resizes vertically. For readable prose, cap the rendered width near `--measure`
(65–75ch) at the layout level.

@example
<Textarea label="Notes" rows={5} placeholder="What do you know about this person?" />
<Textarea label="Biography" hint="Plain text; saved with the record" />

## Props

```ts
interface TextareaProps {
  /** Field label rendered above the control. */
  label?: React.ReactNode;
  /** Helper text shown beneath the control when there is no error. */
  hint?: React.ReactNode;
  /** Error message. Sets invalid styling, `aria-invalid`, and replaces the hint. */
  error?: React.ReactNode;
  /** Marks the field required and shows a sienna asterisk on the label. */
  required?: boolean;
  className?: string;
  id?: string;
  style?: CSSProperties;
  children?: React.ReactNode;
}
```
