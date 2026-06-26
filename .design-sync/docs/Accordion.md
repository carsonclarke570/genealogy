---
category: Navigation
---

Accordion — a collapsible disclosure section.

A header button toggles a body region: a leading icon, the title, an optional
count pill, and a warning mark when the section needs attention. The chevron
rotates on open. Works controlled (`open` + `onToggle`) or uncontrolled
(`defaultOpen`). The header is `aria-expanded` and owns the body via
`aria-controls`, so assistive tech announces the relationship. Stack several
with a `display: grid; gap` wrapper for a settings-style list.

@example
<Accordion title="Relationships" icon={<Icon name="link" />} count={2} danger>
  …editable rows…
</Accordion>

## Props

```ts
interface AccordionProps {
  /** Header label. */
  title: React.ReactNode;
  /** Optional leading icon node (sits before the title). */
  icon?: React.ReactNode;
  /** A count shown as a pill on the right. Hidden when 0. */
  count?: number;
  /** Flag that the section contains something needing attention — shows a warning mark. */
  danger?: boolean;
  /** Accessible label for the danger mark. @default "Needs review" */
  dangerLabel?: string;
  /** Section content, revealed when open. */
  children: React.ReactNode;
  /** Controlled open state. Pair with `onToggle`. */
  open?: boolean;
  /** Called when the header is activated (controlled usage). */
  onToggle?: (open: boolean) => void;
  /** Initial open state when uncontrolled. @default false */
  defaultOpen?: boolean;
  className?: string;
}
```
