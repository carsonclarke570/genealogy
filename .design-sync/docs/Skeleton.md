---
category: Feedback & Overlays
---

Skeleton — a content-shaped loading placeholder.

Preferred over a Spinner when you can mirror the shape of incoming content
(a person card, a media tile, lines of a bio) — it reduces layout shift and
perceived wait. Shimmers gently; the shimmer stops under
`prefers-reduced-motion`. Decorative (`aria-hidden`); mark the live region
`aria-busy` on the container.

@example
<Skeleton variant="circle" width={40} height={40} />
<Skeleton variant="text" width="60%" />
<Skeleton width={240} height={84} />

## Props

```ts
interface SkeletonProps {
  /** Shape: a block, a text line, or a circle (avatar). */
  variant?: "block" | "text" | "circle";
  width?: string | number;
  height?: string | number;
  className?: string;
  style?: CSSProperties;
}
```
