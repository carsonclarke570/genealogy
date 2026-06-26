---
category: Genealogy
---

PersonRow — the compact avatar + name + dates list-row.

The shared row for showing a person in a list: relationship panels, search
results, a document's people, a map's place focus. A portrait (or monogram), the
name in the Spectral serif, and life-dates in muted tabular figures, with an
optional leading relationship label, a lineage dot, and a trailing slot for a
chevron or badge. A real `<button>` — keyboard-focusable and clickable. Distinct
from PersonNode, the heavier tree atom.

@example
<PersonRow name="James Whitfield" relation="Father" dates="1888–1971" onClick={open} />
<PersonRow name="Eleanor Whitfield" dates="1915–1998" size="md" trailing={<Badge tone="info">3 docs</Badge>} />

## Props

```ts
interface PersonRowProps {
  /** Full name — shown in the serif face. */
  name: string;
  /** Life-dates string (e.g. "1888–1971"). */
  dates?: React.ReactNode;
  /** Optional relationship label shown before the dates (e.g. "Spouse"). */
  relation?: React.ReactNode;
  /** Portrait image URL; falls back to a monogram. */
  photoUrl?: string;
  /** Avatar + name scale. `sm` for dense lists, `md` for search-style results. @default "sm" */
  size?: "sm" | "md";
  /** A lineage / category colour shown as a leading dot. */
  accentColor?: string;
  /** Trailing slot — a chevron, badge, or count, aligned to the end. */
  trailing?: React.ReactNode;
  className?: string;
}
```
