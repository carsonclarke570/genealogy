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

## Running from a git worktree (`.claude/worktrees/…`)

- A worktree's own `node_modules` is empty; node resolves react/typescript from
  the MAIN repo's `node_modules` via parent traversal, so `npm run build` works.
  But the converter needs `--node-modules` to hold both react/react-dom AND an
  `@family-archive/ui` self-link pointing at **this worktree** (not main). Set it
  up once per worktree (all gitignored):
  ```sh
  MAIN=/home/carson/genealogy
  mkdir -p node_modules/@family-archive && ln -sfn ../.. node_modules/@family-archive/ui
  ln -sfn $MAIN/node_modules/react node_modules/react
  ln -sfn $MAIN/node_modules/react-dom node_modules/react-dom
  ln -sfn $MAIN/node_modules/@types node_modules/@types
  ln -sfn $MAIN/.ds-sync/node_modules .ds-sync/node_modules   # reuse esbuild/ts-morph/playwright
  ```
  Then run the driver with `--node-modules node_modules` from the worktree root.
- The main repo's self-link points at main's checkout; do NOT run the converter
  from main when the change lives only on a worktree branch — its dist is stale.

## DateField — open-calendar preview

- `DateField` (redesigned 2026-06-21 to a calendar popover) has no `open` prop;
  the `PickingADay` story in `.design-sync/previews/DateField.tsx` auto-opens the
  popover via a wrapper `ref` + `useEffect(() => …querySelector(".fa-datefield__trigger")?.click())`,
  with a `minHeight: 400` wrapper so the `position: absolute` popover sits inside
  the card instead of overlapping the next story. Keep `cardMode: "column"` so
  every story is full-width. (Unlike Dialog, the popover is absolute, not fixed —
  no transformed-stage trick needed; just reserve height.)
- Don't add a `hint` to `PickingADay`: the open popover overlays it and the hint's
  tail peeks out from the right edge. Closed-trigger stories keep their hints.

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

## 2026-06-25 sync (macOS) — 15 new components authored + playwright pin

- **Playwright pin is machine-specific.** This macOS box's ms-playwright cache holds
  **chromium-1134** (and 1129), NOT the WSL box's 1228. The release pinning build
  1134 is **playwright@1.47.0 / 1.47.2** — `(cd .ds-sync && npm i playwright@1.47.2)`
  so the render check launches the cached chromium with no download. Verify a
  candidate by reading `node_modules/playwright-core/browsers.json` (chromium
  revision) first. The "1228 → playwright@1.61.0" note above is the WSL box's pin.
- **The discovered surface grew 32 → 47.** A full converter run discovers every
  PascalCase export in `src/index.ts`; the prior sync had shipped 32. The 15 added
  (AnchoredPopover, AvatarStack, ClickableCard, DetailRow, FileDropzone, Icon,
  IconButton, LocationField, MediaPreview, MultiCombobox, ProvField, ProvLabel,
  ProvLocationField, SearchInput, Slider) now have authored previews under
  `.design-sync/previews/` and `cardMode` overrides in config (mostly `column`;
  `AnchoredPopover` is `single` + viewport `360x300`). All graded good 2026-06-25.
- **MediaPreview preview ships an offline data-URI SVG** as the photo `src` (a sepia
  portrait) so the card never hits the network; a real archive passes a resolved
  object-storage URL. **AnchoredPopover** portals to `document.body` (`position:
  fixed`); its preview pins it `open` against a `useRef` trigger — `single` cardMode
  captures it in-card. **ProvLocationField / LocationField** stub `onSearch` /
  pass `suggestions` with archive places (offline-stable). **Icon** sweeps real
  `GLYPHS` names.
- **conventions.md** got a purely-additive paragraph listing the 15 new components
  (existing prose untouched) — keeps the design-agent reference true.

## Known render warns (check new warns against this list)

- `[GRID_OVERFLOW]` on **Combobox, DateField, MultiSelect, MultiCombobox** — these
  open-panel selects render an absolute/portal panel the multi-column grid "can't
  present"; validate suggests `single`. They are intentionally `cardMode: "column"`
  (every state full-width, open panel reserved via paddingBottom) and grade good
  solo. Kept column for family consistency; the warn is **expected and non-blocking**.
  Switch to `single` only if an open panel ever visibly overlaps a neighbour in the
  live claude.ai/design grid.
- thin / `[RENDER_THIN]` on **Slider, DetailRow** (and **Icon** at small sizes) — a
  slider track and a single detail row legitimately are short; not a defect.

## Component grouping (purpose folders, not `general/`)

- Components are grouped into **6 purpose folders** via `cfg.docsDir =
  ".design-sync/docs"`: `forms` (17), `data-display` (11), `feedback-overlays` (8),
  `genealogy` (5), `actions` (3), `navigation` (3). The folder name is the slug of
  each doc's `category` frontmatter.
- **How it works:** the package shape defaults every component to `general`. The
  group only comes from a matched doc's `category:` frontmatter (no `cfg.groups`
  key exists). So `.design-sync/docs/<Name>.md` holds `---\ncategory: <Group>\n---`
  for each component; discovery matches by name (no `docsMap` enumeration needed).
- **The doc body IS the `prompt.md` body.** Each `docs/<Name>.md` was seeded from the
  component's then-current synthesized `prompt.md` (everything after line 1, which is
  the regenerated head) so no usage/Examples were lost. **Caveat:** because the doc now
  drives `prompt.md`, editing a preview `.tsx` no longer flows new Examples into
  `prompt.md` — only the rendered `.html` updates. If you substantially rework a
  preview, regenerate that component's `docs/<Name>.md` body from the fresh
  `prompt.md` (keep the `category` line). To move a component between groups, just
  edit its `category:` and re-sync.
- A regroup is a **path move** — the diff lists old `components/general/<Name>/*` in
  `upload.deletePaths` and the new group paths as writes. `styleChanged:false`,
  `renderChurned:0`, `unchanged:47` → renders identical, grades carry, **no
  re-grade**. finalize_plan needs `deletes: ["components/general/**"]`.

## Render-check timeout on a pure regroup (driver hung at 10 min)

- The driver re-runs the FULL render check (47 cards) even when nothing rendered
  differently; on this machine that exceeded a 10-min cap. For a **pure regroup or
  any change with `renderChurned:0`**, skip it: after the driver's build+diff write
  `.sync-diff.json`, run `node .ds-sync/package-validate.mjs ./ds-bundle
  --no-render-check` (fast structural check — CSS reachable, @dsCard markers, anchor
  matches disk), confirm the prior full validate was `bad:0`, then upload straight
  from `.sync-diff.json` (`upload.deletePaths` + the rebuilt grouped paths). Only a
  change that actually alters renders needs the full render check.
