---
category: Data Display
---

Chip — a compact tag for document types, relationship labels, and filters.

Renders as a `<span>` for display, or a real `<button>` when `onClick` is set
(so keyboard and screen-reader users get a proper control). The `selected`
state is a sienna tint; `dot` adds a per-type colour cue — but the label text
always carries the meaning too, never colour alone.

@example
<Chip dot="certificate">Certificate</Chip>
<Chip selected onClick={() => {}}>Photos</Chip>

## Props

```ts
interface ChipProps {
  /** Selected (active filter) state — sienna tint + border. */
  selected?: boolean;
  /** Show a small leading dot in a per-type hue. The type is always also spelled out. */
  dot?: "photo" | "certificate" | "article" | "obituary" | "census" | "grave" | "other" | "accent";
  /** When provided, the chip renders as a real `<button>` for filtering. */
  onClick?: MouseEventHandler<HTMLElement>;
  children?: React.ReactNode;
  className?: string;
  id?: string;
  style?: CSSProperties;
}
```
