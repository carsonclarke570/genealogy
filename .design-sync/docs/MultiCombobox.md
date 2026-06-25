---
category: Forms
---

MultiCombobox — a searchable multi-select. Type to filter, arrow keys to move,
Enter to toggle; the panel stays open while you add several, and chosen items
appear as removable chips beneath the field.

It's the multi-value sibling of `Combobox`: same look, same portaled popover,
same label/hint/error contract — for the case where a field holds *several*
picks out of a long, searchable list (the people linked to a record, the
residents of a home). Unlike `MultiSelect` (a count-summary filter popover with
no search), this filters as you type. Controlled: pass `value` and update it in
`onChange`. Closes on outside-click or Escape; toggling never closes it.

@example
<MultiCombobox
  label="People"
  placeholder="Search people…"
  value={ids}
  onChange={setIds}
  options={people.map((p) => ({
    value: p.id,
    label: p.name,
    description: p.lifeDates,
    leading: <Avatar name={p.name} size="sm" />,
  }))}
/>

## Props

```ts
interface MultiComboboxProps {
  /** The options to search and choose from. */
  options: ComboboxOption[];
  /** Currently selected values (controlled). */
  value: string[];
  /** Called with the next selection when an option is toggled or a chip removed. */
  onChange: (next: string[]) => void;
  /** Field label rendered above the control. */
  label?: React.ReactNode;
  /** Helper text shown beneath the control when there is no error. */
  hint?: React.ReactNode;
  /** Error message. Sets the invalid styling, `aria-invalid`, and replaces the hint. */
  error?: React.ReactNode;
  /** Marks the field required and shows a danger asterisk on the label. */
  required?: boolean;
  /** Input placeholder. */
  placeholder?: string;
  /** Message shown when the query matches no options. */
  emptyMessage?: React.ReactNode;
  /** Disable the control. */
  disabled?: boolean;
  /** When set, a hidden input of this `name` carries the JSON-encoded ids for native form submit. */
  name?: string;
  /** Accessible name for the input when there is no visible `label`. */
  "aria-label"?: string;
  /** Force the panel open (for previews / controlled use). */
  open?: boolean;
  /** Popover panel width in px; defaults to matching the control. */
  panelWidth?: number;
}
```
