# CLAUDE.md

Guidance for Claude Code (and humans) working in this repository.

## Project

A private web application for recording and exploring a family genealogy tree.

Core features:
- **Family tree graph** — an interactive, explorable, searchable visualization of
  people and their relationships.
- **People records** — biographical details for each person (names, dates, places,
  notes, relationships).
- **Media archive** — upload and attach images and PDFs to people: family photos,
  birth/death certificates, news articles, obituaries, etc.

This is a personal/family tool. It is **private** — all access requires
authentication. Sensitive documents (certificates, records of living people) must
never be served without an authenticated session.

## Tech stack

| Concern        | Choice                                                        |
| -------------- | ------------------------------------------------------------- |
| Framework      | Next.js (App Router) + React + TypeScript                     |
| Styling        | Tailwind CSS + a project design system (tokens + components)  |
| Database       | SQLite via Drizzle ORM (`better-sqlite3` driver)              |
| File storage   | Local disk (uploads dir), served only through protected routes |
| Auth           | Auth.js (NextAuth) — session required for all app routes      |
| Graph viz      | React Flow (`@xyflow/react`) for the explorable tree          |
| Validation     | Zod for all input/boundary validation                         |
| Hosting        | Railway (with a persistent volume — see Deployment)           |

> Decisions were made deliberately for a private, low-maintenance, self-contained
> family archive. Prefer simple, boring, well-supported tools over novelty.

## Architecture & conventions

Planned directory layout (App Router):

```
src/
  app/                 # routes, layouts, server actions, API/route handlers
  components/          # reusable React components
  components/ui/       # design-system primitives (buttons, inputs, cards, ...)
  lib/                 # db client, auth, storage helpers, shared utils
  db/
    schema.ts          # Drizzle schema (people, relationships, media)
    migrations/        # generated SQL migrations
  styles/              # global css + design tokens
data/                  # SQLite db file + uploads (gitignored; volume in prod)
```

Conventions:
- **TypeScript everywhere**, `strict` mode. No `any` without a clear reason.
- Validate all external input (forms, route handlers, uploads) with **Zod**.
- Keep data access in `src/lib`/`src/db` — components don't talk to the DB directly.
- Server Components / Server Actions by default; client components only when
  interactivity requires it (`"use client"`).
- Never serve uploaded files via a public static path. Stream them through an
  authenticated route handler that checks the session first.
- Match the surrounding code's style. Run lint/format before committing.

## Data model (initial sketch)

- **person** — id, names, sex, birth/death date + place, notes, timestamps.
- **relationship** — connects two people (parent/child, spouse/partner). Model
  parentage and partnerships explicitly so the tree can be reconstructed.
- **media** — id, file path, mime type, original filename, title/description,
  document type (photo | certificate | article | obituary | other), upload time.
- **person_media** — links media to one or more people.

(Confirm/refine schema when building the data layer.)

## Design system

Direction: **clean & modern** — cool-gray neutrals, white surfaces, **indigo**
(`#4F46E5`) accent. **Serif headings** (Source Serif 4), **sans body/UI** (Geist
Sans). Supports **light + dark** modes.

- **Tokens** live in `src/app/globals.css` as semantic CSS variables (`:root` for
  light, `.dark` for dark), exposed to Tailwind v4 via `@theme inline`. Always
  style with semantic utilities (`bg-background`, `text-muted-foreground`,
  `bg-primary`, `border-border`, `rounded-lg`, `font-serif`) — never raw hex.
  Changing a token re-skins the whole app.
- **Dark mode** is class-based (`.dark` on `<html>`), driven by `next-themes`
  (`ThemeProvider` in the root layout, `ThemeToggle` component). The custom
  `dark` variant is declared in `globals.css`.
- **Primitives** live in `src/components/ui/` (`button`, `input`, `textarea`,
  `label`, `card`, `badge`, `separator`, `avatar`). Variants use
  `class-variance-authority`; compose classes with `cn()` from `src/lib/utils.ts`
  (clsx + tailwind-merge). Keep these dependency-light (no Radix yet — add it when
  building genuinely interactive primitives like dialogs/menus).
- **Living style guide**: the home page (`src/app/page.tsx`) renders every token
  and component. Run `npm run dev` and open `/` to preview; keep it updated as the
  system grows.
- Tailwind v4 is **CSS-first** — there is no `tailwind.config.js`. Configure via
  `globals.css` (`@theme`, `@custom-variant`, `@layer`).

## Commands

```bash
npm install          # install dependencies
npm run dev          # start the dev server (http://localhost:3000)
npm run build        # production build
npm run start        # run the production build
npm run lint         # eslint
# Added with the data layer:
# npm run db:generate  # generate Drizzle migrations from schema
# npm run db:migrate   # apply migrations
```

## Deployment (Railway)

**Critical:** Railway's container filesystem is ephemeral. The SQLite database
file **and** the uploads directory must live on a **mounted persistent volume**
(e.g. mounted at `/data`), or all data is lost on every deploy/restart.

- Point the SQLite connection and the uploads path at the volume mount (configure
  via env var, e.g. `DATA_DIR=/data`).
- Keep the local dev `data/` directory gitignored.
- Back up the volume periodically — it is the single source of truth.

## Working agreement

- Keep changes focused; this is a personal project — favor clarity over cleverness.
- Update this file when the stack, structure, or commands change.
- Commit with clear messages. Don't push to branches other than the one assigned.

## Status

Scaffolded (Next.js 16 + React 19 + Tailwind v4) with the **design system
foundation** in place: tokens, light/dark theming, base UI primitives, and a
living style guide at `/`. Next up: data layer (Drizzle schema + SQLite) and auth.
