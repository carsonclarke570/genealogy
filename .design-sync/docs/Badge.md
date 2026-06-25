---
category: Data Display
---

Badge — a small status pill for record metadata.

Uses the semantic tint/ink token pairs (info = teal, success, warning = amber,
danger). Tones sit close on the colour wheel by design, so pair a badge with
text and, when it stands alone, the `dot` — never rely on colour alone.

@example
<Badge tone="success" dot>Verified</Badge>
<Badge tone="warning">No source</Badge>
<Badge tone="info">3 documents</Badge>

## Props

```ts
interface BadgeProps {
  /** Semantic tone. */
  tone?: "neutral" | "info" | "success" | "warning" | "danger";
  /** Show a small leading status dot in the tone's colour. */
  dot?: boolean;
  children?: React.ReactNode;
  className?: string;
  id?: string;
  style?: CSSProperties;
}
```
