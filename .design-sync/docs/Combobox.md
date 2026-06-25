---
category: Forms
---

Combobox — a searchable single-select. Type to filter, arrow keys to move,
Enter to pick.

Unlike `Select` (native, whole list) and `MultiSelect` (popover, many values),
this is the control for choosing ONE item out of a long, searchable list —
picking a person to relate, a place, a source. Filters on each option's
`label`/`description` text plus any `keywords`. Controlled: pass `value` and
update it in `onChange` (`null` clears). Closes on select, outside-click, or
Escape. Shares the label/hint/error contract with `Input` and `Select`.

@example
<Combobox
  label="Relative"
  placeholder="Search people…"
  value={personId}
  onChange={setPersonId}
  options={people.map((p) => ({
    value: p.id,
    label: p.name,
    description: p.lifeDates,
    leading: <Avatar name={p.name} size="sm" />,
  }))}
/>

## Props

```ts
interface ComboboxProps {
  /** The options to search and choose from. */
  options: ComboboxOption[];
  /** Currently selected value (controlled), or `null` when nothing is chosen. */
  value: string;
  /** Called with the next value when an option is picked, or `null` when cleared. */
  onChange: (value: string | null) => void;
  /** Field label rendered above the control. */
  label?: React.ReactNode;
  /** Helper text shown beneath the control when there is no error. */
  hint?: React.ReactNode;
  /** Error message. Sets the invalid styling, `aria-invalid`, and replaces the hint. */
  error?: React.ReactNode;
  /** Marks the field required and shows a danger asterisk on the label. */
  required?: boolean;
  /** Input placeholder shown when nothing is selected. */
  placeholder?: string;
  /** Message shown when the query matches no options. */
  emptyMessage?: React.ReactNode;
  /** Disable the control. */
  disabled?: boolean;
  /** When set, a hidden input of this `name` carries the value for native form submit. */
  name?: string;
  /** Accessible name for the input when there is no visible `label`. */
  "aria-label"?: string;
  /** Force the panel open (for previews / controlled use). */
  open?: boolean;
  /** Popover panel width in px; defaults to matching the control. */
  panelWidth?: number;
}
```
