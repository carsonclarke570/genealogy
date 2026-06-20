<!--
  Tokens here are committed (palette + type are real, not placeholders): the brief
  was strong enough to lock the visual system before code. Components are reference
  implementations synthesized from the tokens. Re-run `/impeccable document` once the
  app is scaffolded to capture the real component CSS and regenerate the sidecar.
-->
---
name: Family Archive
description: A private, quiet tool for recording and exploring a family genealogy.
colors:
  primary: "oklch(0.51 0.145 38)"
  primary-deep: "oklch(0.44 0.135 36)"
  primary-tint: "oklch(0.955 0.030 42)"
  paper-white: "oklch(1 0 0)"
  surface: "oklch(0.975 0.005 60)"
  surface-sunken: "oklch(0.960 0.006 60)"
  ink: "oklch(0.24 0.012 45)"
  muted: "oklch(0.47 0.016 45)"
  faint: "oklch(0.62 0.012 45)"
  border: "oklch(0.90 0.006 60)"
  border-strong: "oklch(0.83 0.008 55)"
  accent: "oklch(0.42 0.10 232)"
  accent-deep: "oklch(0.36 0.09 232)"
  accent-tint: "oklch(0.95 0.025 230)"
  success: "oklch(0.52 0.10 150)"
  success-tint: "oklch(0.95 0.03 150)"
  warning: "oklch(0.62 0.13 68)"
  warning-tint: "oklch(0.95 0.04 75)"
  danger: "oklch(0.50 0.185 25)"
  danger-tint: "oklch(0.95 0.040 25)"
  backdrop: "oklch(0.24 0.012 45 / 0.4)"
  doc-photo: "oklch(0.42 0.100 232)"
  doc-certificate: "oklch(0.52 0.100 150)"
  doc-article: "oklch(0.62 0.130 68)"
  doc-obituary: "oklch(0.47 0.016 45)"
  doc-other: "oklch(0.62 0.012 45)"
  edge: "oklch(0.78 0.012 55)"
  edge-active: "oklch(0.51 0.145 38)"
  dark-bg: "oklch(0.205 0.010 50)"
  dark-surface: "oklch(0.245 0.010 50)"
  dark-surface-sunken: "oklch(0.165 0.008 50)"
  dark-ink: "oklch(0.93 0.008 65)"
  dark-muted: "oklch(0.72 0.012 55)"
  dark-faint: "oklch(0.55 0.010 55)"
  dark-border: "oklch(0.32 0.010 50)"
  dark-border-strong: "oklch(0.42 0.012 50)"
  dark-primary: "oklch(0.53 0.145 40)"
  dark-primary-deep: "oklch(0.46 0.135 38)"
  dark-primary-tint: "oklch(0.32 0.050 40)"
  dark-accent: "oklch(0.72 0.100 228)"
  dark-accent-deep: "oklch(0.80 0.090 228)"
  dark-accent-tint: "oklch(0.30 0.050 230)"
  dark-success: "oklch(0.72 0.120 152)"
  dark-success-tint: "oklch(0.28 0.050 150)"
  dark-warning: "oklch(0.80 0.120 78)"
  dark-warning-tint: "oklch(0.30 0.050 72)"
  dark-danger: "oklch(0.66 0.170 28)"
  dark-danger-tint: "oklch(0.30 0.070 26)"
typography:
  display:
    fontFamily: "Spectral, Georgia, 'Times New Roman', serif"
    fontSize: "2rem"
    fontWeight: 500
    lineHeight: 1.1
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Spectral, Georgia, 'Times New Roman', serif"
    fontSize: "1.5rem"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "-0.005em"
  title:
    fontFamily: "Hanken Grotesk, -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: "normal"
  body:
    fontFamily: "Hanken Grotesk, -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "normal"
  body-sm:
    fontFamily: "Hanken Grotesk, -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: "normal"
  label:
    fontFamily: "Hanken Grotesk, -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "0.005em"
  data:
    fontFamily: "Hanken Grotesk, -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "normal"
    fontFeature: "'tnum' 1, 'cv05' 1"
rounded:
  sm: "4px"
  md: "6px"
  lg: "10px"
  xl: "16px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  "2xl": "32px"
  "3xl": "48px"
  "4xl": "64px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.paper-white}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "0.625rem 1rem"
  button-primary-hover:
    backgroundColor: "{colors.primary-deep}"
    textColor: "{colors.paper-white}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "0.625rem 1rem"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "0.625rem 0.75rem"
  input:
    backgroundColor: "{colors.paper-white}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "0.5rem 0.75rem"
  chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.muted}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "0.1875rem 0.625rem"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "1.5rem"
  person-node:
    backgroundColor: "{colors.paper-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0.75rem 1rem"
---

# Design System: Family Archive

## 1. Overview

**Creative North Star: "The Quiet Archive Room at Midday"**

White walls, even daylight, and a single warm leather-bound spine on the shelf. The
warmth lives in the object, never in the light. This system is a calm, precise tool
that gets out of the way so the family — the faces, the handwriting, the dates that
actually mean something — does the talking. Every chrome surface is neutral and
near-silent; all the warmth is carried by one burnt-sienna brand color, by a literary
serif reserved for names, and by the photographs and documents themselves. The feel
is closer to Linear or Notion than to any genealogy product: software that disappears
into the task.

Density is moderate and humane. This is a reference tool used intermittently by a
small, trusted circle, so it must be legible on the first glance every time, with
generous targets and zero jargon. We commit to **Restrained** color: tinted neutrals
plus a single accent that appears on a small fraction of any screen. Depth is conveyed
by tone and hairline borders, not by shadow theater — surfaces are flat at rest and
lift only in response to state.

The system ships **light and dark as equal peers** — this is a tool people sit with
for long stretches, and a comfortable low-glare reading mode is a first-class concern,
not a toggle bolted on at the end. Dark mode is not an inversion: the brand identity
(the sienna voice, the teal accent, the serif-for-names) is constant across both; only
the surfaces and text are re-lit for a dim room. Default to the reader's
`prefers-color-scheme`, expose a manual toggle, and remember their choice.

This system explicitly rejects four things. It is **not** Ancestry-style corporate
genealogy: no ad clutter, no upsell dashboards, no stock imagery. It is **not** cheesy
skeuomorphic "heritage": no faux parchment, sepia wash, scrollwork, or ornate script.
It is **not** a generic AI-SaaS template: no cream/sand body background, no
tracked-uppercase eyebrows, no identical icon-card grids, no gradient text. And it is
**not** a social network: no likes, feeds, notifications, or engagement bait.

**Key Characteristics:**
- Pure-white surface; warmth carried only by the brand color, the serif, and the content.
- One humanist sans for the entire UI; one literary serif reserved for human names and dates.
- Restrained palette — burnt sienna as the single voice, used on ≤10% of any screen.
- Flat by default; tone and hairlines for structure, shadows only on overlays and hover.
- Responsive motion that conveys state (especially in the tree), never choreography.

## 2. Colors

A near-monochrome warm-neutral architecture, lit by a single burnt-sienna voice and answered by one cool archive-teal accent.

### Primary
- **Burnt Sienna** (`oklch(0.51 0.145 38)`): The brand's one warm voice. Primary buttons, the current selection in the tree, the active navigation item, focused person, and key links. Carries **white** text on its fill — never dark. Reserved for action and "you are here"; never decoration.
- **Sienna Deep** (`oklch(0.44 0.135 36)`): Hover and active state for primary surfaces. The press-down of the same voice.
- **Sienna Tint** (`oklch(0.955 0.030 42)`): The faintest warm wash for selected rows, hovered list items, and the highlighted ancestor path in the tree. A functional state fill — never the page background.

### Secondary
- **Archive Teal** (`oklch(0.42 0.10 232)`): The cool counterpoint. Hyperlinks in prose, informational callouts, and the "verified source / has document" indicator on records. Distinct from primary in both hue and lightness so the two never read as variants of each other. Holds white text on a filled pill.
- **Teal Deep** (`oklch(0.36 0.09 232)`): Hover/active for teal elements.
- **Teal Tint** (`oklch(0.95 0.025 230)`): Background for informational banners and link-hover washes.

### Neutral
- **Paper White** (`oklch(1 0 0)`): The app background. Literal pure white — no hidden warmth. The warmth is the brand's job, not the canvas's.
- **Quiet Panel** (`oklch(0.975 0.005 60)`): The second neutral layer — sidebars, toolbars, cards, panels. A barely-there warm-neutral that separates structure from content without becoming a color.
- **Sunken** (`oklch(0.960 0.006 60)`): Wells and insets — search fields at rest, inactive tab tracks, code/ID chips.
- **Ink** (`oklch(0.24 0.012 45)`): Body text and headings. A warm near-black, ~14:1 on Paper White.
- **Muted Ink** (`oklch(0.47 0.016 45)`): Secondary text — metadata, captions, dates-as-detail, helper copy. ~5:1 on Paper White; usable for real reading, not just decoration.
- **Faint Ink** (`oklch(0.62 0.012 45)`): Disabled labels and lowest-emphasis text only. Never for content a user must read.
- **Hairline** (`oklch(0.90 0.006 60)`): Dividers, input borders, card outlines, table rules.
- **Hairline Strong** (`oklch(0.83 0.008 55)`): Hover borders and section separators that need to assert themselves.

### Semantic
- **Success** (`oklch(0.52 0.10 150)`) on **Success Tint** (`oklch(0.95 0.03 150)`): Save confirmations, valid fields.
- **Warning** (`oklch(0.62 0.13 68)`) on **Warning Tint** (`oklch(0.95 0.04 75)`): Unverified data, missing-source notices. Hue pushed to amber so it never collides with the sienna primary.
- **Danger** (`oklch(0.50 0.185 25)`) on **Danger Tint** (`oklch(0.95 0.040 25)`): Destructive actions, errors. Deeper and more chromatic than the primary; always paired with an icon and text, never color alone.

### Document Types & Tree Graph
These alias the flipping role tokens above, so they theme automatically. They exist as named tokens so the same colour is used wherever a thing appears.

- **Document types** — the per-type dot on chips, the media grid, and filters: **Photo** (`--doc-photo` → teal), **Certificate** (`--doc-certificate` → success green), **Article** (`--doc-article` → amber), **Obituary** (`--doc-obituary` → muted), **Other** (`--doc-other` → faint). The colour is always paired with the type spelled out — never colour alone.
- **Tree graph (React Flow + `relatives-tree`)** — layout scales off the node cell size: **`--tree-node-w`** (240px) × **`--tree-node-h`** (84px). Edges default to **Edge** (`--edge`, a visible warm hairline) at `--edge-width` (1.5px); the highlighted lineage warms to **Edge Active** (`--edge-active` → Burnt Sienna) at `--edge-width-active` (2px). `--tree-node-gap` (48px) is breathing room between branches.
  - **Relationship → edge style** (the layout returns *untyped* connectors, so the renderer applies this): `blood` / `married` = solid `--edge`; `divorced` / `half` / `adopted` (step) = dashed (`--edge-dash`, `4 3`); the active ancestor/descendant lineage = `--edge-active` at `--edge-width-active`. Never rely on the line style alone — pair with labels where it matters.
- **Modal scrim** — **Backdrop** (`--color-backdrop`, a translucent ink wash) sits behind dialogs.

### Dark Mode (Night)
The same room after dark. Re-light, do not invert. Surfaces step from a warm charcoal up to lighter panels; in dark mode, **lighter means raised** and the Sunken well goes darker than the page. The brand colors keep their luminance so text on them stays legible; the neutrals and accents brighten so they read against charcoal.

- **Night** (`oklch(0.205 0.010 50)`): The app background. A warm charcoal carrying the brand hue at near-zero chroma — never pure black, which makes bright photos halate and text smear.
- **Night Panel** (`oklch(0.245 0.010 50)`): The raised neutral layer — sidebars, toolbars, cards, panels (one step *lighter* than Night).
- **Night Sunken** (`oklch(0.165 0.008 50)`): Recessed wells — search fields, inactive tracks (one step *darker* than Night).
- **Night Ink** (`oklch(0.93 0.008 65)`): Body text. A warm off-white, ~13:1 on Night — deliberately not pure white, which is harsh in a dark room.
- **Night Muted** (`oklch(0.72 0.012 55)`): Secondary text (~6:1 on Night). **Night Faint** (`oklch(0.55 0.010 55)`): disabled only.
- **Night Hairline** (`oklch(0.32 0.010 50)`) / **Strong** (`oklch(0.42 0.012 50)`): Borders are *lighter* than the surface in dark mode.
- **Sienna on Night** (`oklch(0.53 0.145 40)`, hover `oklch(0.46 0.135 38)`): The primary holds its light-mode luminance so white label text still clears 4.5:1. Selection wash **Sienna Wash** (`oklch(0.32 0.050 40)`) replaces the light tint for selected rows and the highlighted lineage.
- **Teal on Night** (`oklch(0.72 0.100 228)`, hover `oklch(0.80 0.090 228)`): Brightened so links and the has-documents marker read against charcoal. Info background **Teal Wash** (`oklch(0.30 0.050 230)`).
- **Semantic on Night:** Success `oklch(0.72 0.120 152)`, Warning `oklch(0.80 0.120 78)`, Danger `oklch(0.66 0.170 28)`, each over its matching dark tint (`dark-*-tint`). Lifted for legibility on charcoal.

### Named Rules
**The One Voice Rule.** Burnt Sienna appears on no more than ~10% of any screen. Its rarity is what makes "primary action" and "current selection" instantly legible. If two sienna elements compete on a screen, one is wrong.

**The Warmth-Is-Earned Rule.** Warmth comes from the primary color, the serif, and the photographs — never from the background. In light mode the body is pure white; in dark mode it is warm charcoal. A warm-tinted near-white background is forbidden; that is the cream/sand AI cliché this system rejects by name.

**The Re-Light, Don't-Invert Rule.** Dark mode is a new lighting of the same room, not a flipped negative. The brand hues are constant across themes; only neutrals and accents re-light. Never machine-invert the light palette — `filter: invert()` and naive token-swaps wreck the brand color and photo fidelity.

## 3. Typography

**Display Font:** Spectral (with Georgia, 'Times New Roman', serif)
**Body / UI Font:** Hanken Grotesk (with system-ui sans stack)
**Data Font:** Hanken Grotesk with tabular figures (`font-feature-settings: 'tnum'`)

**Character:** A warm humanist grotesque (Hanken Grotesk) does all the work of the tool — labels, buttons, fields, tables, prose — so the interface reads as calm, modern software with a little human warmth. Deliberately *not* Inter or another saturated AI-default sans. A warm literary serif (Spectral) is reserved exclusively for human names, dates of life, and page titles. That single reservation is what makes a person feel like a person and not a database row, without a trace of parchment kitsch. The pairing works because it contrasts on the serif/sans axis, not on two similar sans.

### Hierarchy
- **Display** (Spectral, 500, 2rem/32px, line-height 1.1): A person's name at the top of their record; the family name on the home view. The serif's one big moment.
- **Headline** (Spectral, 500, 1.5rem/24px, line-height 1.2): Section titles and secondary page headings, and prominent life-dates ("1888 – 1971").
- **Title** (Hanken Grotesk, 600, 1.125rem/18px, line-height 1.35): Card titles, panel headers, dialog titles — back to sans, back to tool.
- **Body** (Hanken Grotesk, 400, 1rem/16px, line-height 1.55): Default reading text — notes, biographies. Capped at **65–75ch** for prose.
- **Body Small** (Hanken Grotesk, 400, 0.875rem/14px, line-height 1.45): Metadata, captions, secondary detail.
- **Label** (Hanken Grotesk, 500, 0.8125rem/13px, letter-spacing 0.005em, **sentence case**): Form labels, chips, nav, buttons. Quietly emphasized by weight, not by uppercase tracking.
- **Data** (Hanken Grotesk, 400, 0.875rem/14px, tabular figures): Dates and IDs in tables and lists, so columns of years align.

### Named Rules
**The Serif-For-People Rule.** The serif is reserved for human names, life-dates, and top-level page titles. It never appears on a button, label, table header, or field. If a serif shows up on a control, delete it.

**The No-Eyebrow Rule.** Labels are sentence case, distinguished by weight. Tiny uppercase letter-tracked eyebrows above sections are forbidden — that is AI scaffolding, not hierarchy.

## 4. Elevation

Flat by default. Depth comes from tone (the Paper White / Quiet Panel / Sunken triad) and hairline borders, not from shadow. Resting surfaces cast no shadow at all. Shadows are a response to two things only: an element that genuinely floats above the page (dropdowns, popovers, dialogs, drag), and a tree node lifting on hover/focus to signal interactivity. Shadows are warm-tinted and soft — never the hard gray drop-shadow of a 2014 app.

### Shadow Vocabulary
- **Overlay Low** (`box-shadow: 0 1px 2px oklch(0.24 0.012 45 / 0.06), 0 4px 12px oklch(0.24 0.012 45 / 0.08)`): Dropdowns, popovers, comboboxes, tooltips.
- **Overlay High** (`box-shadow: 0 8px 28px oklch(0.24 0.012 45 / 0.14)`): Dialogs and modals over the backdrop.
- **Node Lift** (`box-shadow: 0 2px 8px oklch(0.24 0.012 45 / 0.10)`): A person node on hover/focus in the tree — the only shadow that appears inside content.

**In dark mode,** shadows barely register against charcoal, so elevation shifts to the tonal step (Night → Night Panel) plus a slightly stronger Night Hairline. Overlays still carry a shadow — deepened and widened, low-opacity black — but the primary cue that a panel is raised is that it is *lighter* than the page, and a hovered tree node lifts by warming its border rather than by casting a shadow.

### Named Rules
**The Flat-By-Default Rule.** If a surface is at rest and not floating above the page, it has no shadow. Test: if it looks like a 2014 app, the shadow is too dark and the blur is too tight. Depth at rest is the job of tone and the hairline (and in dark mode, of the lighter-means-raised tonal step).

## 5. Components

### Buttons
- **Shape:** Gently squared (6px radius / `{rounded.md}`). Precise, not pill-soft.
- **Primary:** Burnt Sienna fill, white label, `0.625rem 1rem` padding. The page's one call to action.
- **Hover / Focus:** Hover deepens to Sienna Deep over 150ms. Focus shows a 2px Burnt Sienna ring offset 2px from the edge — visible, never removed.
- **Secondary:** Quiet Panel fill, Ink label, Hairline border. The default for most actions.
- **Ghost:** Transparent, Ink label; background fills to Quiet Panel on hover. For toolbar and low-emphasis actions.
- **Danger:** Used only for destructive confirmation; Danger fill or Danger text on a ghost, always with an icon.

### Chips / Tags
- **Style:** Quiet Panel background, Muted Ink text, fully rounded (`{rounded.full}`), `0.1875rem 0.625rem` padding. Used for document types (photo / certificate / article / obituary) and relationship labels.
- **State:** A selected filter chip switches to Sienna Tint background with Ink text and a Burnt Sienna 1px border. Document-type chips may carry a small leading dot in a per-type hue — but the type is always spelled out in text, never color alone.

### Cards / Containers
- **Corner Style:** 10px radius (`{rounded.lg}`).
- **Background:** Quiet Panel on Paper White; never a card-on-card. **Nested cards are forbidden.**
- **Shadow Strategy:** None at rest (see Elevation). Structure comes from the tone step and a Hairline border.
- **Border:** 1px Hairline.
- **Internal Padding:** 24px (`{spacing.xl}`).

### Inputs / Fields
- **Style:** Paper White background, 1px Hairline border, 4px radius (`{rounded.sm}`), `0.5rem 0.75rem` padding. Search fields rest on Sunken.
- **Focus:** Border shifts to Burnt Sienna and a 2px Sienna ring appears; 150ms. No glow.
- **Error:** Border and helper text in Danger, with an inline icon and message — never a red border alone.
- **Disabled:** Sunken background, Faint Ink text, no border emphasis.

### Navigation
- **Style:** A left sidebar on Quiet Panel, sans Label type. Items are Muted Ink at rest, Ink on hover with a Quiet Panel/Sunken hover fill.
- **Active:** The current section reads Ink with a Burnt Sienna leading indicator (a short bar or dot) and Sienna Tint fill — the One Voice marking "you are here."
- **Mobile:** Sidebar collapses to a top bar with a drawer; the tree gets full width.

### Person Node (Signature Component)
The atom of the family tree. A compact card (Paper White, 6px radius, 1px Hairline, `0.75rem 1rem` padding) holding a small round portrait (or a monogram on Quiet Panel when no photo exists), the person's **name in Spectral**, and life-dates in Muted Ink tabular figures. At rest it is flat. On hover/focus it lifts with Node Lift shadow and the border warms toward Hairline Strong. The **focused** person is bordered in Burnt Sienna; the highlighted ancestor/descendant path tints nodes with Sienna Tint. A small Archive Teal dot marks a person who has attached documents. Edges between nodes are 1.5px Hairline Strong, thickening and warming to Burnt Sienna along the active lineage. Pan, zoom, and re-center are smooth 200ms state transitions — with an instant, non-animated path under `prefers-reduced-motion`.

### Dialog
- **Use sparingly.** Exhaust inline / progressive UI first; a modal is for tasks that must interrupt (confirm delete, upload).
- **Scrim:** `--color-backdrop` over the page. **Panel:** `--color-bg`, 10px radius, `shadow-overlay-high`, 24px padding, max-width ~30rem.
- **Title** is sans (not the serif). Closes on Escape, backdrop click, and the close button. `role="dialog"`, `aria-modal`, labelled by its title.

### Select
- A **native `<select>`** styled to match Input (4px radius, hairline, sienna focus ring) with a muted chevron. Same label / hint / error contract as Input. Platform control for full keyboard + AT support — never a reinvented custom dropdown.

### Tooltip
- A terse hint revealed on hover / keyboard focus, above the trigger; ink bubble, `--color-bg` text, `shadow-overlay-low`, `z-tooltip`. Non-essential text only — never the sole home of critical information.

### Tabs
- Switch between panels of a record. Tablist with a bottom hairline; the active tab is Ink with a 2px Burnt Sienna underline, others Muted. Full `tablist` / `tab` / `tabpanel` roles and roving `tabindex`.

### Empty State
- Teaches the interface, never "nothing here": a calm icon on a quiet disc, a plain sans title, one guiding sentence (Muted, ≤38ch), and the action that fills the void. Centered, generous spacing.

## 6. Do's and Don'ts

### Do:
- **Do** keep the body background pure white (`oklch(1 0 0)`). Let the Burnt Sienna primary, the Spectral serif, and the photographs carry all the warmth.
- **Do** reserve the serif (Spectral) for human names, life-dates, and page titles only.
- **Do** hold Burnt Sienna to ≤10% of any screen — primary action and current selection, nothing decorative (The One Voice Rule).
- **Do** convey depth with tone and 1px hairlines; add shadow only to floating overlays and hovered tree nodes.
- **Do** pair every state color with an icon and text. Never rely on color alone (warm primary, amber warning, and red danger sit close on the wheel by design).
- **Do** give every interactive element a visible focus ring (the shared `--focus-ring-*` tokens: 2px sienna, 2px offset) and a `prefers-reduced-motion` alternative for all motion, including the tree.
- **Do** use white text on the Burnt Sienna, Archive Teal, and Danger fills — never dark text on a saturated fill.
- **Do** treat dark mode as a peer: default to `prefers-color-scheme`, offer a manual toggle, and persist the choice. Re-light the room, don't invert it.
- **Do** keep dark mode a warm charcoal (`oklch(0.205 0.010 50)`) with warm off-white text (`oklch(0.93 ...)`) — comfortable for long reading sessions.

### Don't:
- **Don't** use a cream / sand / parchment / warm-tinted near-white background. That warm-neutral band is the saturated AI default and this system rejects it by name.
- **Don't** build dark mode with pure black (`#000`) or pure white text — the glare and halation are exactly the discomfort dark mode exists to solve.
- **Don't** machine-invert the light theme (`filter: invert()`, naive token negation). It destroys the sienna brand color and ruins photo and document fidelity.
- **Don't** brighten the sienna primary into the muddy zone (L≈0.58–0.66) for dark mode — text on it stops being readable in both directions. Hold its luminance and let the surroundings change.
- **Don't** dress the UI in faux-heritage costume: no parchment textures, sepia wash, scrollwork, fake leather/wood, or ornate script fonts. Heritage is carried by the records, not the chrome.
- **Don't** build it like corporate genealogy SaaS (Ancestry-style): no ad clutter, upsell dashboards, hero-metric templates, or stock imagery.
- **Don't** add social-network patterns: no likes, activity feeds, notification bells, infinite scroll, or engagement bait.
- **Don't** use tiny uppercase letter-tracked eyebrows above sections, gradient text, glassmorphism, or colored side-stripe borders (`border-left` > 1px as an accent).
- **Don't** nest cards, or stack a card on another card. One tonal step is the maximum.
- **Don't** put the serif on a button, label, table header, or form field.
- **Don't** ship a control with only some of its states. Every interactive element needs default, hover, focus, active, disabled, and (where relevant) loading and error.
