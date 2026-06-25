---
category: Forms
---

MultiSelect — a popover combobox for picking several options at once.

The panel stays open while you tick names (each click toggles, none dismiss),
with a "Clear" affordance once anything is chosen — the shape behind a
"filter by person / tag / place" control. Closes on outside-click or Escape.
Controlled: pass `selected` and update it in `onChange`. For a single choice
use `Select`; for a short static set in a form use `Checkbox`es.

@example
<MultiSelect
  label="Filter by person"
  placeholder="Everyone"
  selected={people}
  onChange={setPeople}
  options={relatives.map((p) => ({
    value: p.id,
    label: p.name,
    description: p.lifeDates,
    leading: <Avatar name={p.name} size="sm" />,
  }))}
/>

## Props

```ts
interface MultiSelectProps {
  /** The options to choose from. */
  options: MultiSelectOption[];
  /** Currently selected values (controlled). */
  selected: string[];
  /** Called with the next selection when an option is toggled. */
  onChange: (next: string[]) => void;
  /** Heading inside the popover. */
  label?: React.ReactNode;
  /** Trigger text when nothing is selected. */
  placeholder?: string;
  /** Leading icon on the trigger button. */
  icon?: React.ReactNode;
  /** Build the trigger summary from the number selected. */
  summary?: (count: number) => string;
  /** Popover panel width in px. */
  panelWidth?: number;
  /** Force the panel open (for previews / controlled use). */
  open?: boolean;
}
```
