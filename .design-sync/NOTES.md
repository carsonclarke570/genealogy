# design-sync notes — @family-archive/ui

Repo-specific gotchas for future syncs. Read this first.

## Running resync.mjs (two things bite every fresh run)

- **Self-link must exist.** `package-build` resolves the library's `.d.ts` from
  `node_modules/@family-archive/ui/dist`, but the root package has no self-link
  by default, so the build dies with `ENOENT … @family-archive/ui/package.json`.
  Create it once (gitignored): `mkdir -p node_modules/@family-archive && ln -s
  ../.. node_modules/@family-archive/ui`. (The `app/` workspace already has its
  own link; this is the root one the converter needs.)
- **The `--remote` anchor must live OUTSIDE `ds-bundle/`.** Fetch the remote
  `_ds_sync.json` (DesignSync `get_file`) to a local file and pass it as
  `--remote`, but put it at the repo root, NOT inside `--out` — `package-build`
  wipes the OUT dir at the start, so an anchor placed in `ds-bundle/` is deleted
  before the diff stage reads it and the run falls back to `anchor: unreadable`
  (re-uploads all 30 components instead of just the changed ones).
- Full invocation that worked: `node .ds-sync/resync.mjs --config
  .design-sync/config.json --node-modules node_modules --out ./ds-bundle
  --remote .remote-anchor.json` (delete the temp `.remote-anchor.json` after).
- `_ds_manifest.json` / `_adherence.oxlintrc.json` are **app-generated** on
  claude.ai from the `@dsCard` markers — they are not in the local bundle; never
  add them to the upload plan. Upload set = changed component dirs + their
  `_preview/*.js` + `_ds_bundle.{js,css}` + `styles.css` + `README.md`, with
  `_ds_sync.json` written **last**.

## Build / CSS

- **Tokens live in the same package** (`src/styles/tokens.css`), not a separate
  tokens package. The converter's `copyTokens` only ships tokens from a
  `tokensPkg` in node_modules, so a same-package `tokensGlob` is silently
  dropped. Instead, `npm run build:css` concatenates
  `fonts.css + tokens.css + components.css` → `dist/family-archive.css`, and
  `cfg.cssEntry` points at that combined file. That single self-contained
  stylesheet is what ships as `_ds_bundle.css` (the styles.css closure).
  → If you ever split tokens into their own package, switch to `tokensPkg`.
- `cfg.buildCmd` is `npm run build` (runs `tsc` + `build:css`). Always rebuild
  before the converter so `dist/family-archive.css` is fresh.
- **Brand fonts ship with the design bundle** via `cfg.extraFonts`
  (`.design-sync/fonts/brand-fonts.css` + committed woff2): Hanken Grotesk
  (variable, one file) and Spectral (400/500/600), latin subsets from Google
  Fonts (OFL). `src/styles/fonts.css` itself ships NO `@font-face` — the
  production Next.js app loads the families via `next/font`; only the design pane
  needs the shipped woff2. `--font-mono` ("Cascadia Mono") is a system-fallback
  stack only (no webfont) — its `[FONT_MISSING]` warn is suppressed via
  `cfg.runtimeFontPrefixes: ["Cascadia"]`.

## Render check (WSL)

- Headless chromium crashed on launch with "Target page, context or browser has
  been closed". Root cause was **missing system libraries**, NOT the sandbox
  (`--no-sandbox` did not help). `ldd` on chrome-headless-shell showed
  `libnss3`, `libnspr4`, `libnssutil3`, `libasound2` missing.
- Fix (needs sudo, run once per machine):
  `sudo .ds-sync/node_modules/.bin/playwright install-deps chromium`
  or `sudo apt-get install -y libnss3 libnspr4 libasound2`.
- playwright + chromium are installed under `.ds-sync/node_modules` and
  `~/.cache/ms-playwright` (chromium-headless-shell build 1228).

## Overlay previews (Dialog)

- `Dialog`'s backdrop is `position: fixed` (correct for the app). In the preview
  card, the `cardMode: "single"` harness wraps the story in a `transform`ed
  `.ds-single` div, which becomes the containing block for the fixed backdrop —
  so `inset: 0` resolves against a 0-height box and the panel overflows above
  (title + close clipped). Fix is in the **preview only**: wrap the Dialog in a
  sized, relatively-positioned stage with its own `transform: translateZ(0)`
  (see `.design-sync/previews/Dialog.tsx`). Any future fixed-position overlay
  (Popover, Drawer, Toast) needs the same stage trick in its preview.
- `Dialog` uses `cfg.overrides.Dialog.cardMode: "single"`.

## Document-type & alias tokens

- `--doc-*`, `--edge*`, `--focus-ring-*` alias the flipping role tokens, so they
  theme for free (no separate dark values). Only `--color-backdrop` has an
  explicit dark override. If you add a doc type, add both the token (tokens.css)
  and the `ChipDot` union + `DOT_COLOR` map (Chip.tsx).

## Card layout overrides (GRID_OVERFLOW)

- Wide / form-shaped components crop in the product card grid unless set to
  `cardMode: "column"` in `cfg.overrides`. Currently column: Card, Checkbox,
  EmptyState, RadioGroup, Tabs, Textarea, Toast. Overlays use `cardMode:
  "single"`: Dialog, Menu. If a new wide component trips `[GRID_OVERFLOW]` on
  validate, add it to `cfg.overrides` as column and rebuild.
- `cardMode` lives in config, so changing it trips `[CONFIG_STALE]` on a
  targeted `preview-rebuild`; run a full `package-build.mjs` to re-stamp.

## Provenance component (two exports, one file)

- `ProvenanceMark` and `SourceCiteDialog` are BOTH exported from
  `src/components/Provenance.tsx`. The fuzzy src-find can't map either name to
  `Provenance.tsx`, so `cfg.componentSrcMap` pins both at that file — keep both
  entries if you rename the file.
- Previews are split per export: `.design-sync/previews/ProvenanceMark.tsx`
  (States + BesideFacts) and `.design-sync/previews/SourceCiteDialog.tsx`
  (LinkSource). There is **no** `Provenance.tsx` preview — the converter matches
  previews by component name, so a combined file would orphan and both would fall
  to the floor card.
- Card modes: `ProvenanceMark` → `column` (two short stories, full width);
  `SourceCiteDialog` → `single` + `primaryStory: "LinkSource"` (it's a Dialog
  overlay, so it needs the sized-stage trick like Dialog — see the Overlay
  previews note above).
- `conventions.md` documents both under "Records are sacred — show provenance"
  and in the component set; added 2026-06-20.

## Render check (WSL) — update

- As of 2026-06-20 the headless-shell libs are present on this machine; the
  render check ran clean (no `[RENDER_SKIPPED]`). The sudo `install-deps` step
  above is still the fix for a fresh machine.

## Combobox (added 2026-06-21)

- `Combobox` is a searchable single-select (`src/components/Combobox.tsx`); preview
  `.design-sync/previews/Combobox.tsx` (PickRelative/Selected/Empty/WithError).
  Card mode `column` + `primaryStory: "PickRelative"` (like MultiSelect) — the open
  panel is absolute, so the primary story reserves `paddingBottom` to capture it,
  and it uses the component's `open` prop to force the panel open for the static
  shot. Graded all-good 2026-06-21.

## Playwright / render check on a fresh `.ds-sync`

- A freshly-staged `.ds-sync/` only has `esbuild ts-morph @types/react` — playwright
  is NOT included, so the first validate fails `[RENDER_SKIPPED]`. The cached
  chromium build is `chromium-1228` (`~/.cache/ms-playwright/`); install the
  matching release: `(cd .ds-sync && npm i playwright@1.61.0)` — 1.61.0 pins build
  1228, so no browser download. Then validate runs the render check clean.

## Fonts: resolved by shipping woff2 (history: `[FONT_REMOTE]` → `[FONT_MISSING]` → fixed)

- **Resolved 2026-06-21.** The bundle now ships Hanken Grotesk + Spectral via
  `cfg.extraFonts` (see "Build / CSS" above), so validate is clean — no more
  `[FONT_MISSING]`. The design pane renders on-brand instead of in system fonts.
- History: `src/styles/fonts.css` once carried a Google-Fonts `@import` (this note
  used to expect `[FONT_REMOTE]`); it was removed because `next/font` fronts it in
  the app, so the bundle briefly shipped no fonts and validate reported
  `[FONT_MISSING]`. Now fixed by shipping the woff2 with the design bundle.
- Cascadia Mono stays a system-fallback only — not shipped, warn suppressed via
  `cfg.runtimeFontPrefixes`. The leftover `fonts/CascadiaMono-*.ttf` from an earlier
  sync were **deleted** from the project, so its `fonts/` now matches the build.

## Re-sync risks

- `dist/family-archive.css` is a generated build artifact (gitignored via
  `dist/`). It must be regenerated by `npm run build` before each converter run —
  do not point `cssEntry` at a stale or hand-edited copy.
- Brand-font woff2 are committed under `.design-sync/fonts/` and shipped via
  `cfg.extraFonts`, so previews are font-stable offline. They are latin subsets
  fetched from Google Fonts; if you change a weight/family in `tokens.css`, refresh
  `.design-sync/fonts/*.woff2` + `brand-fonts.css` to match (a different subset or
  font version changes the files).
- Browser system deps are not captured in any lockfile; a fresh machine needs
  the `playwright install-deps` step above before the render check will run.
