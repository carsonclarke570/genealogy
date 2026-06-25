---
category: Feedback & Overlays
---

Spinner — a standalone indeterminate loader.

For async work without a known duration (the tree resolving, a media fetch).
Prefer Skeleton when you can hint at the shape of incoming content; use the
Spinner inside buttons or other compact spots. `role="status"` + a label.

@example
<Spinner />
<Spinner size="lg" label="Loading family tree" />

## Props

```ts
interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  /** Accessible label announced to screen readers. */
  label?: string;
  className?: string;
  id?: string;
  style?: CSSProperties;
  children?: React.ReactNode;
}
```
