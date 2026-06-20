# Genealogy Archive — design system conventions

A private family-genealogy archive. Warm, archival "family heirloom" feel:
parchment surfaces, ink-dark text, a heritage-green primary, an archival
burgundy accent for documents, serif titles over a clean sans body.

## Setup — no provider needed

There is **no React context or theme provider**. Components render correctly as
soon as the shipped stylesheet is loaded — it carries the design tokens, the
serif web font (Spectral), and every component style. Just compose the
components and load the CSS; nothing else is required.

```jsx
import { Card, CardBody, Heading, Text, Badge, Button } from "<bundle>";
// the design system's styles.css must be loaded once (it @imports the tokens,
// fonts, and component CSS — designs receive that whole closure automatically).
```

## Styling idiom — tokens first, then the semantic utilities

Style with the **design tokens** — CSS custom properties defined on `:root`,
always available to your own layout glue via `var(--*)`. This is the reliable
vocabulary; prefer it over inventing colors.

| Role | Tokens (`var(--…)`) |
|------|---------------------|
| Surfaces | `--color-canvas` (page), `--color-surface` (cards), `--color-surface-sunken` (wells) |
| Text | `--color-ink`, `--color-ink-muted`, `--color-ink-subtle`, `--color-ink-on-primary` |
| Lines | `--color-line`, `--color-line-strong` |
| Brand (heritage green) | `--color-primary`, `--color-primary-hover`, `--color-primary-soft` |
| Accent (archival burgundy) | `--color-accent`, `--color-accent-soft` |
| Status | `--color-success`/`-soft`, `--color-warning`/`-soft`, `--color-danger`/`-soft` |
| Type | `--font-serif` (Spectral — titles), `--font-sans` (body) |
| Radius | `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-xl`, `--radius-full` |
| Shadow | `--shadow-sm`, `--shadow-md`, `--shadow-lg` |

The components are authored in Tailwind against **semantic** classes that map to
those tokens — these classes are in the shipped CSS, so you may reuse them on
your own elements: `bg-surface` `bg-surface-sunken` `text-ink` `text-ink-muted`
`text-ink-subtle` `text-ink-on-primary` `border-line` `border-line-strong`
`bg-primary` `text-primary` `bg-primary-soft` `bg-accent` `text-accent`
`bg-accent-soft` `bg-success` `bg-warning` `bg-danger` (+ `text-*` variants)
`font-serif` `font-sans` `focus-visible:ring-focus`. **Never** use raw palette
values (`bg-[#3f5d4e]`) or invent token names — re-theming flows through the
tokens above. Set titles/headings in `font-serif`; body copy in `font-sans`.

## Where the truth lives

Read these before styling: the design system's `styles.css` and its `@import`s
(`tokens.css` — every token value; `fonts.css` — the Spectral `@font-face`;
`_ds_bundle.css` — the compiled component styles). Per-component API and usage
are in each component's `.d.ts` (`<Name>Props`) and `.prompt.md`.

## Idiomatic example — a person summary

```jsx
<Card interactive>
  <CardHeader>
    <CardTitle>Eleanor Whitfield</CardTitle>
    <CardDescription>1842–1919 · Yorkshire, England</CardDescription>
  </CardHeader>
  <CardBody className="flex flex-col gap-3">
    <Text size="sm" tone="muted">
      Eldest of seven children; kept the family farm through two wars.
    </Text>
    <div className="flex gap-2">
      <Badge variant="accent">Certificate</Badge>
      <Badge variant="primary">Living</Badge>
    </div>
  </CardBody>
  <CardFooter>
    <Button size="sm">Open record</Button>
    <Button size="sm" variant="ghost">View in tree</Button>
  </CardFooter>
</Card>
```

Components: Avatar, Badge, Button, Card (+ CardHeader/CardTitle/
CardDescription/CardBody/CardFooter), Field, Heading, Input, Spinner, Text,
Textarea.
