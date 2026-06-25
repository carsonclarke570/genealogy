---
category: Feedback & Overlays
---

AnchoredPopover — renders a panel into a body-level portal and positions it as
`position: fixed` against an anchor element. Escaping the trigger's stacking
context is what keeps dropdowns from being clipped by `overflow: auto/hidden`
scroll containers (the app shell scrolls its content; the explorer canvas
clips) — the failure mode this exists to prevent.

It owns positioning only: flips above the trigger when there's no room below,
clamps into the viewport, and re-places on scroll/resize. Open/close, focus,
keyboard, and outside-click stay with the calling component (which passes
`popRef` so its outside-click check can include this panel).

## Props

```ts
interface AnchoredPopoverProps {
  /** The element the panel is positioned against (the trigger / control). */
  anchorRef: RefObject<HTMLElement>;
  /** Whether the panel is shown. */
  open: boolean;
  /** Anchor to the start (default) or end edge of the trigger. */
  align?: "start" | "end";
  /** Gap in px between trigger and panel. */
  gap?: number;
  /** Match the trigger's width unless `width` is set. */
  matchWidth?: boolean;
  /** Fixed panel width in px (overrides `matchWidth`). */
  width?: number;
  className?: string;
  style?: CSSProperties;
  role?: string;
  id?: string;
  /** Forwarded ref to the rendered panel node. Callers use it so their own outside-click handlers can treat clicks inside the */
  popRef?: MutableRefObject<HTMLDivElement>;
  children: React.ReactNode;
}
```
