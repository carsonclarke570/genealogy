# Family Archive — building with this design system

A small, calm component set for a private family-genealogy app. Quiet, precise,
warmth from content not chrome. Light and dark are equal peers.

## Setup

- Import components from `@family-archive/ui`: `import { Button, PersonNode } from "@family-archive/ui"`.
- Import the stylesheet **once** at the app root: `import "@family-archive/ui/styles.css"`.
  It defines all design tokens, both themes, the base layer, and every component's
  styles. **No provider/wrapper component is needed** — theming is pure CSS.
- Components are class-based and pre-styled. Render them as-is; do not re-skin them.

## Theming (light + dark)

- The theme is applied via `data-theme` on `<html>`, which always reads
  `"light"` or `"dark"` (attribute strategy — no `prefers-color-scheme` block).
  The app sets it before paint, resolving the OS preference for new users. To
  preview dark, set `data-theme="dark"` on a container.
- **Every colour is a token that flips between themes.** Never hardcode a hex or
  `oklch()` value in app code — always use the `var(--*)` tokens below, so your
  own layout glue stays correct in both themes automatically.

## Styling idiom — use the tokens

Components carry their own look. For YOUR layout/spacing glue around them, style with
the design tokens as CSS custom properties (never invent values):

- **Colour**: `--color-bg`, `--color-surface`, `--color-surface-sunken`,
  `--color-ink` (body text), `--color-muted` (secondary text), `--color-border`,
  `--color-primary` (the one sienna accent), `--color-accent` (teal links/info),
  and semantic `--color-success` / `--color-warning` / `--color-danger` (each with
  a matching `--color-*-tint` background).
- **Spacing** (4px scale): `--space-xs` `--space-sm` `--space-md` `--space-lg`
  `--space-xl` `--space-2xl` `--space-3xl` `--space-4xl`.
- **Radius**: `--radius-sm` `--radius-md` `--radius-lg` `--radius-full`.
- **Type**: `--font-sans` (Hanken Grotesk — all UI) and `--font-serif` (Spectral).
  Sizes: `--text-display` `--text-headline` `--text-title` `--text-body`
  `--text-body-sm` `--text-label`.
- **Document types** (chips, the has-documents dot, the media grid):
  `--doc-photo` `--doc-certificate` `--doc-article` `--doc-obituary` `--doc-other`.
- **Family tree** (React Flow + relatives-tree): node cell `--tree-node-w` /
  `--tree-node-h`; edges `--edge` / `--edge-active` (sienna on the active lineage),
  `--edge-width` / `--edge-width-active`; `--edge-dash` for divorced/step/adoptive
  links; `--tree-node-gap`. The layout returns untyped connectors — apply the
  relationship→style mapping (solid for blood/married, dashed for divorced/half/
  adopted) in the renderer.
- **Focus ring** (reuse everywhere): `--focus-ring-width` `--focus-ring-color`
  `--focus-ring-offset`. **Modal scrim**: `--color-backdrop`.

The component classes are `fa-`-prefixed (`fa-btn`, `fa-card`, `fa-person`…), but
prefer the React components over hand-writing those classes.

## Rules that define the look

- **The serif is for people only.** `--font-serif` (Spectral) is reserved for human
  names, life-dates, and page titles. Everything else — labels, buttons, data,
  prose — is `--font-sans`. Never put the serif on a control.
- **One sienna voice.** Use `<Button variant="primary">` (and `--color-primary`) for
  the single most important action per view; everything else is `secondary` /
  `ghost`. Sienna should cover ≤10% of any screen.
- **Flat by default.** Surfaces use one tonal step + a 1px `--color-border`, not
  shadows. Don't nest cards.
- **No colour-only meaning.** Pair status colour with text/icon (warm primary,
  amber warning, and red danger sit close on the wheel by design).
- **The signature component is `PersonNode`** — the clickable atom of the family
  tree (avatar + serif name + life-dates, with `focused` / `inPath` /
  `hasDocuments` states). Build the tree from it.

## The component set

`Button`, `Input`, `Select`, `Card`, `Chip`, `Badge`, `Avatar`, `PersonNode`,
`Tabs`, `Tooltip`, `Dialog`, `EmptyState`. Prefer these over hand-built markup.
`Dialog` is for interrupting tasks only (confirm/upload) — exhaust inline UI first.
`EmptyState` teaches an empty surface (empty tree, no documents, no search results)
rather than showing "nothing here".

## Where the truth lives

Read the bound `styles.css` (and its imports) for the full token set, and each
component's `<Name>.d.ts` (props) and `<Name>.prompt.md` (usage) before composing.

## Idiomatic example

```tsx
import { Card, Button, Badge, Chip } from "@family-archive/ui";

<Card
  title="Eleanor Margaret Whitfield"
  actions={<Button size="sm" variant="ghost">Edit</Button>}
>
  <div style={{ display: "flex", gap: "var(--space-sm)", flexWrap: "wrap" }}>
    <Badge tone="success" dot>Verified</Badge>
    <Badge tone="info">3 documents</Badge>
    <Chip dot="certificate">Birth certificate</Chip>
  </div>
</Card>
```
