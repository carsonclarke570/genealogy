---
category: Actions
---

Button — the primary action control.

The `primary` variant is the one warm "voice" on a screen (The One Voice Rule):
reserve it for the single most important action and let everything else be
`secondary` or `ghost`. Carries every interactive state — hover, focus-visible
ring, active press, disabled, and a `loading` spinner that also blocks input.

@example
<Button variant="primary">Add person</Button>
<Button variant="secondary" iconStart={<UploadIcon />}>Upload media</Button>
<Button variant="danger">Delete record</Button>

## Props

```ts
interface ButtonProps {
  /** Visual emphasis. - `primary` — the single sienna call-to-action; use at most once per view. - `secondary` — the default  */
  variant?: "danger" | "primary" | "secondary" | "ghost";
  /** Control height/padding. */
  size?: "sm" | "md";
  /** Stretch to fill the container width. */
  fullWidth?: boolean;
  /** Square, label-less button for a lone glyph (e.g. an overflow `⋯` trigger). Drops the label-side padding and locks the bo */
  iconOnly?: boolean;
  /** Show a spinner and disable interaction while an action is in flight. */
  loading?: boolean;
  /** Optional icon rendered before the label. */
  iconStart?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  id?: string;
  style?: CSSProperties;
}
```
