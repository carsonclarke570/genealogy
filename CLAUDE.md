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
| Database       | Postgres via Drizzle ORM (`pg` / node-postgres driver)        |
| File storage   | Object storage (Railway bucket / S3), served via protected routes |
| Auth           | Auth.js (NextAuth) — session required for all app routes      |
| Graph viz      | React Flow (`@xyflow/react`) for the explorable tree          |
| Validation     | Zod for all input/boundary validation                         |
| Hosting        | Railway (managed Postgres service — see Deployment)           |

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
(`app/src/lib/dataset.tsx`). The demo seed lives in `app/src/db/seed-data.ts`.

DB access goes through `getDb()` (`app/src/db/client.ts`) — a memoized
`Promise<DB>` over a `pg` pool (Postgres queries are async). On first use it
applies pending migrations; **outside production** it then seeds an empty
database with the demo family (both idempotent). Production boots empty so the
real family is entered by hand.

## Commands

The design-system library is the **root** package; the Next.js app is in `app/`
and depends on the library via `file:..`. Build the library before the app
(`dist/` is gitignored) — see the Dockerfile.

```bash
# Root (design system)
npm install          # install library deps
npm run build        # build dist/ (needed before the app compiles)

# Local Postgres (repo root) — dev needs a database to talk to
docker compose up -d # start Postgres at localhost:5432 (see docker-compose.yml)

# App (cd app/)
npm install          # install app deps
npm run dev          # start the dev server (auto-migrates + seeds the demo family)
npm run build        # production build
npm run start        # run the production build
npm run db:generate  # generate a Drizzle migration after editing schema.ts
npm run db:migrate   # apply migrations to the DB (uses DATABASE_URL)
npm run db:seed      # seed an empty DB with the demo family (idempotent)
```

The app reads `DATABASE_URL` (and `AUTH_SECRET` / `SITE_PASSWORD`) from
`app/.env.local` in dev; it defaults to the local Postgres above.

## Deployment (Railway)

Data lives in a **managed Railway Postgres service** in the same project, so the
app container stays stateless (Railway's container filesystem is ephemeral — never
rely on it for data).

- The Postgres service exposes `DATABASE_URL`; the app service gets it as a Railway
  reference variable: `DATABASE_URL = ${{ Postgres.DATABASE_URL }}` (prefer the
  private-network URL). Migrations apply automatically on first boot (`getDb()`).
- Back up the Postgres database periodically — it is the single source of truth.
- **Media uploads** (not built yet) can't go on the ephemeral container disk either;
  they'll need object storage (a Railway bucket or S3), streamed through an
  authenticated route handler.

## Working agreement

- Keep changes focused; this is a personal project — favor clarity over cleverness.
- Update this file when the stack, structure, or commands change.
- Commit with clear messages. Don't push to branches other than the one assigned.

## Status

Design system + Next.js app scaffolded; the UI runs off a real **Postgres +
Drizzle** data layer (schema, migrations, seed, async server read model + write
path wired into the app). Add person persists. Production runs on a managed
Railway Postgres and boots empty; local dev uses Docker Postgres seeded with the
demo family. Still stubbed: real media upload + protected serving (needs object
storage), and Auth.js (a shared password gate stands in). Next up: media upload.
