---
category: Genealogy
---

PersonNode — the atom of the family tree.

A compact, clickable card: portrait (or monogram), the person's name in the
Spectral serif, and life-dates with genealogy glyphs (✳ born, † died) in
tabular figures. Living people instead show a quiet "Living" tag. At rest it is
flat; on hover it lifts, `focused` draws the sienna ring (and sets
`aria-current`), `inPath` tints the highlighted lineage, and `hasDocuments`
shows the teal dot. A real `<button>` — keyboard-focusable and clickable.

@example
<PersonNode name="Eleanor Whitfield" birth="1888" death="1971" focused hasDocuments />
<PersonNode name="Aoife Reardon" birth="1992" onClick={() => openRecord(id)} />

## Props

```ts
interface PersonNodeProps {
  /** Full name — shown in the serif display face. */
  name: string;
  /** Birth year or date string (e.g. "1888"). */
  birth?: string;
  /** Death year or date string. Omit for a living person. */
  death?: string;
  /** Portrait image URL; falls back to a monogram. */
  photoUrl?: string;
  /** Current focus in the tree — draws the sienna ring. */
  focused?: boolean;
  /** On the highlighted ancestor/descendant lineage — sienna tint. */
  inPath?: boolean;
  /** Show the teal indicator that this person has attached documents. */
  hasDocuments?: boolean;
  /** Whether the person is living. When omitted, it's inferred as living if no `death` date is given. Living people show a "L */
  living?: boolean;
  className?: string;
  id?: string;
  style?: CSSProperties;
  children?: React.ReactNode;
}
```
