---
category: Data Display
---

DocChip — a document-type dot beside its label.

The quiet inline marker for "this is a photo / certificate / article…",
shared by the media grid, search results, the record, and timeline events.
The dot carries the per-type hue; the label always spells the meaning out, so
it never relies on colour alone. Lighter than `Chip` (no pill) — for labelling,
not filtering. For a tappable filter, use `<Chip dot=… onClick=…>`.

@example
<DocChip type="certificate" />
<DocChip type="photo">Wedding, 1947</DocChip>

## Props

```ts
interface DocChipProps {
  /** Which document type — sets the dot colour and the default label. */
  type: "photo" | "certificate" | "article" | "obituary" | "census" | "grave" | "other";
  /** Override the label (e.g. a document title). Defaults to the type name. */
  children?: React.ReactNode;
  className?: string;
  id?: string;
  style?: CSSProperties;
}
```
