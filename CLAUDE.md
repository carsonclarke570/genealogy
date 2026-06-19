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

## Commands

> The app is not scaffolded yet. Fill these in once `package.json` exists.

```bash
npm install          # install dependencies
npm run dev          # start the dev server
npm run build        # production build
npm run start        # run the production build
npm run lint         # eslint
npm run db:generate  # generate Drizzle migrations from schema
npm run db:migrate   # apply migrations
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

Greenfield. Repository initialized with this CLAUDE.md. Next up: design system.
