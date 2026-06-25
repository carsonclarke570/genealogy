---
category: Data Display
---

IconBadge — a glyph in a softly tinted, ringed disc.

The colour drives both the icon and a `color-mix` tint behind it, so a single
hue (a document-type or event-type token) reads as one calm unit. Pairs
naturally with Timeline rows, list rows, and empty states. Purely decorative
by default; pass `title` to give it an accessible name.

@example
<IconBadge icon={<HeartIcon />} color="var(--doc-certificate)" />
<IconBadge icon={<ShipIcon />} color="var(--color-accent)" size={40} title="Immigration" />

## Props

```ts
interface IconBadgeProps {
  /** The glyph — any SVG/icon node. It is auto-sized to the disc. */
  icon: React.ReactNode;
  /** Hue for the glyph and its tinted disc — any CSS colour, usually a token. */
  color?: string;
  /** Diameter in px. */
  size?: number;
  /** Accessible label. When omitted the badge is decorative (`aria-hidden`). */
  title?: string;
  className?: string;
  style?: CSSProperties;
}
```
