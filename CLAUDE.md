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

## Data model

Schema in `app/src/db/schema.ts`; refined from the initial sketch:

- **person** — id, names, sex, birth/death year + place, living, notes, timestamps.
  Two sparse JSON columns ride along: `docs` (recorded document tally per type)
  and `prov` (per-fact confidence). They are Zod-validated on read; `docs` will
  migrate to a count derived from `person_media` once real upload lands.
- **relationship** — one table, two kinds of edge: `spouse` (the two partners,
  with married/divorced status) and `parent` (parent → child). By convention a
  spouse row's `personId` is the blood-line ("anchor") side, so the couple-unit
  tree the Explorer draws can be reconstructed deterministically.
- **media** — id, type (photo | certificate | article | obituary | other), title,
  year, plus file fields (path, mime, original filename, description) left null
  until upload exists.
- **person_media** — links media to one or more people.

The read model in `app/src/lib/queries.ts` assembles an in-memory `Dataset`
({ people, units, media }) — deriving couple-units from `relationship` rows via
`app/src/lib/units.ts` — which the server hands to the client through a context
(`app/src/lib/dataset.tsx`). The Whitfield seed lives in
`app/src/db/seed-data.ts`. On boot the client (`app/src/db/client.ts`)
auto-applies migrations and seeds an empty database (both idempotent).

## Commands

The design-system library is the **root** package; the Next.js app is in `app/`
and depends on the library via `file:..`. Build the library before the app
(`dist/` is gitignored) — see the Dockerfile.

```bash
# Root (design system)
npm install          # install library deps
npm run build        # build dist/ (needed before the app compiles)

# App (cd app/)
npm install          # install app deps
npm run dev          # start the dev server
npm run build        # production build
npm run start        # run the production build
npm run db:generate  # generate a Drizzle migration after editing schema.ts
npm run db:migrate   # apply migrations to the DB (DATA_DIR)
npm run db:seed      # seed an empty DB with the Whitfield family (idempotent)
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

Design system + Next.js app scaffolded; the UI now runs off a real **SQLite +
Drizzle** data layer (schema, migrations, seed, server read model wired into the
app) instead of static fixtures. Still stubbed: writes (Add person persists
nothing yet), real media upload + protected serving, and Auth.js (a shared
password gate stands in). Next up: make Add person persist, then media upload.
