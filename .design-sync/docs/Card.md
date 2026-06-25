---
category: Data Display
---

Card — a flat container for a related group of content.

One tonal step above the page (surface + a single hairline border), never a
shadow at rest. Do not nest cards — one tonal step is the maximum (The
Flat-By-Default Rule). The optional `title`/`actions` render a header row.

@example
<Card title="Documents" actions={<Button size="sm" variant="ghost">Add</Button>}>
  <p className="prose">Three records attached.</p>
</Card>

## Props

```ts
interface CardProps {
  /** Optional heading shown in the card header (sans title style). */
  title?: React.ReactNode;
  /** Optional actions aligned to the end of the header row (e.g. a Button). */
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  id?: string;
  style?: CSSProperties;
}
```
