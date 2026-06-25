---
category: Actions
---

Menu — an overflow / actions dropdown for per-record commands.

Edit, delete, share, merge — the actions that don't deserve a permanent
button. Opens on trigger click (uncontrolled) or via `open`. Items render as
`role="menuitem"`; mark destructive ones `danger`. Panel layers at
`--z-dropdown`. (For deep `overflow:hidden` containers, render via a portal.)

@example
<Menu trigger={<Button variant="ghost" aria-label="Actions">⋯</Button>} items={[
  { label: "Edit", onSelect: edit },
  "separator",
  { label: "Delete", danger: true, onSelect: del },
]} />

## Props

```ts
interface MenuProps {
  /** The element that opens the menu (e.g. an icon Button). */
  trigger: React.ReactNode;
  items: MenuEntry[];
  /** Force-open (for previews / controlled use). */
  open?: boolean;
  /** Anchor the panel to the start (default) or end of the trigger. */
  align?: "start" | "end";
}
```
