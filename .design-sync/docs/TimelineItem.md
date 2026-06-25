---
category: Genealogy
---

## Props

```ts
interface TimelineItemProps {
  /** Leading marker on the rail — typically an `<IconBadge>`. */
  icon?: React.ReactNode;
  /** Small monospaced/tabular date shown first in the head row. */
  date?: React.ReactNode;
  /** Short category label (sentence case), tinted with `categoryColor`. */
  category?: React.ReactNode;
  /** Colour for the category label (a token). */
  categoryColor?: string;
  /** The event title — the main line. */
  title?: React.ReactNode;
  /** Secondary row: place, people, a source chip… */
  meta?: React.ReactNode;
  /** Hide the trailing connector. Set automatically by `Timeline` for the last item. */
  last?: boolean;
  /** Extra content rendered under the meta row. */
  children?: React.ReactNode;
}
```
