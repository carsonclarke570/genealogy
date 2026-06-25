---
category: Navigation
---

Tabs — switch between related panels of a record (Overview / Documents / Notes).

Works uncontrolled (`defaultValue`) or controlled (`value` + `onValueChange`).
The active tab carries a sienna underline; tablist/tab/tabpanel roles and
`aria-selected`/`aria-controls` are wired for assistive tech.

@example
<Tabs
  defaultValue="overview"
  items={[
    { value: "overview", label: "Overview", content: <Overview /> },
    { value: "documents", label: "Documents", content: <Docs /> },
  ]}
/>

## Props

```ts
interface TabsProps {
  /** The tabs and their panels. */
  items: TabItem[];
  /** Initially active tab when uncontrolled. Defaults to the first tab. */
  defaultValue?: string;
  /** Controlled active tab. */
  value?: string;
  /** Called with the new value when a tab is selected. */
  onValueChange?: (value: string) => void;
}
```
