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
- **Fonts are loaded via a remote `@import`** (Google Fonts: Hanken Grotesk +
  Spectral) in `fonts.css`. Validate reports `[FONT_REMOTE]` — expected, not a
  miss. The production Next.js app loads them via `next/font` instead. `--font-mono`
  ("Cascadia Mono") is only a system fallback stack; no webfont needed.

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

## Re-sync risks

- `dist/family-archive.css` is a generated build artifact (gitignored via
  `dist/`). It must be regenerated by `npm run build` before each converter run —
  do not point `cssEntry` at a stale or hand-edited copy.
- Font families are served remotely; if Google Fonts is unreachable at render
  time, previews fall back to system fonts. For an offline-proof bundle, ship
  woff2 via `cfg.extraFonts` instead.
- Browser system deps are not captured in any lockfile; a fresh machine needs
  the `playwright install-deps` step above before the render check will run.
