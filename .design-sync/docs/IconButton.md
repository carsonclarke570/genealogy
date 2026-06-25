---
category: Actions
---

IconButton — a quiet, label-less control for a single glyph.

The toolbar workhorse: transparent until hovered, then it fills with the
sunken surface and the glyph warms from muted to ink. Use it for canvas and
panel chrome (zoom, recenter, close, theme toggle) where a row of icons needs
to stay dense and unobtrusive — not for a primary action (that's `Button`).
Always pass an `aria-label`; on touch pointers the hit area grows to 44px.

@example
<IconButton aria-label="Zoom in" onClick={zoomIn}><PlusIcon /></IconButton>

## Props

```ts
interface IconButtonProps {
  /** The lone glyph to render (an icon node). */
  children: React.ReactNode;
  /** Accessible name — required, because the button carries no visible label. Pair it with the action ("Zoom in", "Close", "R */
  "aria-label": string;
  className?: string;
  id?: string;
  style?: CSSProperties;
}
```
