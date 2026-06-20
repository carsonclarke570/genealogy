# design-sync NOTES — @genealogy/design-system

Storybook-shape sync. Repo IS the design system's own source (no published
`node_modules/<pkg>`), so the converter runs with `--entry ./dist/index.js`.

## Build / run recipe

- Build the package first: `npm run build` (tsup → `dist/index.js` + `.d.ts`;
  tailwindcss → `dist/styles.css`; also copies `src/styles/fonts/*.woff2` →
  `dist/fonts/`).
- Reference storybook: `npx storybook build -c .storybook -o "$(git rev-parse --show-toplevel)/.design-sync/sb-reference"`.
- Converter / driver `--node-modules ./node_modules --entry ./dist/index.js`.
- All 10 components are storied and graded `match`; previews are all generated
  (no owned `.tsx` in `.design-sync/previews/`).

## Environment gotchas (this matters on every machine)

- **Chromium could not be downloaded** by `playwright install` (CDN blocked in
  the web sandbox). A system chromium exists at
  `/opt/pw-browsers/chromium-1194/chrome-linux/chrome` — point the validate /
  compare / driver scripts at it with
  `DS_CHROMIUM_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome`.
- The staged `playwright` was pinned to **1.55.0** to match that browser
  revision (the default 1.61 expects a newer build). If the system browser
  revision changes, re-pin to match, or `DS_CHROMIUM_PATH` an installed one.

## Upload status — NOT YET UPLOADED

- The `DesignSync` tool (claude.ai/design) was **not available** in the web
  session that built this, so no project was created and no `projectId` is
  pinned in `config.json`. The bundle was fully built, validated (exit 0, no
  warnings), and every component graded `match`.
- To finish: run `/design-sync` in a session that has the `DesignSync` tool
  (e.g. desktop/CLI with a claude.ai login). It will create the project,
  upload `ds-bundle/`, and pin `projectId`. Everything it needs (config,
  conventions header, grades reproduce from the deterministic build) is here.

## Font decision (resolves [FONT_MISSING])

- Headings use **Spectral** (archival serif), self-hosted from
  `@fontsource/spectral` → `src/styles/fonts/spectral-{400,600,700}.woff2`,
  declared in `src/styles/fonts.css`, shipped to the bundle via
  `cfg.extraFonts`. `--font-serif` leads with `"Spectral"` then web-safe
  fallbacks (`Georgia, "Times New Roman", serif`) — the earlier
  Iowan/Palatino names were trimmed because they aren't web-safe and tripped
  `[FONT_MISSING]`. Body uses a system sans stack (no web font).

## Re-sync risks (watch-list for the next run)

- **Reference storybook + dist must be rebuilt together** whenever
  `src/**` or stories change (deterministic, so an extra rebuild is a no-op).
  `[REFERENCE_STALE?]` in the capture log means one was skipped.
- **Avatar "With Image"** uses an inline SVG data-URI portrait (no network) so
  it renders deterministically — keep it self-contained; a remote URL would
  re-introduce `[ASSETS_BLOCKED]` in network-sandboxed shells.
- **Story caps:** Badge (7) and Button (8) exceed the default 6-story cap;
  this run captured all with `--max-stories 8`. A bare re-sync uses the cap —
  pass `--max-stories 8` to re-verify the tail stories individually.
- **System-sans stack** ships no font; that is intentional (only the serif is
  bundled). Don't "fix" a sans `[FONT_MISSING]` by bundling a sans face
  without asking — the families used are web-safe/allowlisted.
- Grades carry on styling/css/font changes; a `.tsx` or story edit re-keys and
  re-grades just that component.
