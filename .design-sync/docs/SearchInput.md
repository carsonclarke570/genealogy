---
category: Forms
---

SearchInput — a self-contained search field.

A sunken pill with a leading magnifier, a borderless input, and a trailing
affordance that flips between a `loading` spinner and a clear button once
there's text. Distinct from the plain `Input`: this is the one-line query box
for a search screen or filter bar, with its own glyphs baked in.

@example
<SearchInput value={q} onChange={setQ} loading={busy}
  placeholder="Search people, documents, places…" />

## Props

```ts
interface SearchInputProps {
  /** Controlled query text. */
  value: string;
  /** Fired with the new query on each keystroke. */
  onChange: (value: string) => void;
  placeholder?: string;
  /** Swap the clear button for a spinner while a query is in flight. */
  loading?: boolean;
  "aria-label"?: string;
  className?: string;
  style?: CSSProperties;
}
```
