---
category: Forms
---

LocationField — a searchable place picker spanning country → address.

Type to search a geocoder (`onSearch`) and/or places already in the archive
(`suggestions`); pick a result to capture its structured parts + coordinates,
or commit whatever you typed as a free-text place. Controlled like `Combobox`:
pass `value` and update it in `onChange` (`null` clears). Degrades gracefully —
with no `onSearch` it simply filters `suggestions` locally, so it works with no
geocoder at all. Shares the label/hint/error contract with `Input`/`Combobox`.

@example
<LocationField
  label="Place"
  value={place}
  onChange={setPlace}
  onSearch={(q) => fetch(`/api/geocode?q=${q}`).then((r) => r.json()).then((d) => d.suggestions)}
  suggestions={archivePlaces}
/>

## Props

```ts
interface LocationFieldProps {
  /** Currently chosen location, or `null`. */
  value: LocationValue;
  /** Called with the next location, or `null` when cleared. */
  onChange: (value: LocationValue | null) => void;
  /** Field label rendered above the control. */
  label?: React.ReactNode;
  /** Helper text shown beneath the control when there is no error. */
  hint?: React.ReactNode;
  /** Error message — sets invalid styling and replaces the hint. */
  error?: React.ReactNode;
  /** Marks the field required and shows a danger asterisk on the label. */
  required?: boolean;
  /** Input placeholder shown when nothing is selected. */
  placeholder?: string;
  /** Disable the control. */
  disabled?: boolean;
  /** Async suggestion source (a geocoder). Called with the typed query (debounced); returns ranked suggestions. When omitted, */
  onSearch?: (query: string) => Promise<LocationSuggestion[]>;
  /** Static suggestions (e.g. places already used in the archive). Shown when the query is empty, and filtered locally when t */
  suggestions?: LocationSuggestion[];
  /** Accessible name for the input when there is no visible `label`. */
  "aria-label"?: string;
}
```
