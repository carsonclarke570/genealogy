---
category: Forms
---

Checkbox — a single boolean control (native input, accent-colored).

Uses the platform checkbox tinted with `--color-primary` (`accent-color`), so
it themes and stays fully accessible. The whole label row is the hit target.

@example
<Checkbox label="Living person" description="Hides sensitive details from shared views" />
<Checkbox label="Include in exports" defaultChecked />

## Props

```ts
interface CheckboxProps {
  /** The control's label. */
  label: React.ReactNode;
  /** Optional secondary line beneath the label. */
  description?: React.ReactNode;
  className?: string;
  id?: string;
  style?: CSSProperties;
  children?: React.ReactNode;
}
```
