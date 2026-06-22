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
| Search         | Hybrid: pgvector (dense) + Postgres full-text, fused by RRF    |
| Embeddings     | Self-hosted Hugging Face TEI (open-source model) — no 3rd party |
| Validation     | Zod for all input/boundary validation                         |
| Hosting        | Railway (managed Postgres + a TEI service — see Deployment)    |

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
  with married/divorced status, plus `marriedDate`/`divorcedDate` partial dates)
  and `parent` (parent → child). Both edges are treated symmetrically — a spouse
  edge is undirected, and a child carries one `parent` row per recorded parent —
  so the family graph below reconstructs deterministically regardless of how an
  edge was entered.
- **media** — id, type (photo | certificate | article | obituary | other), title,
  year, plus file fields (path, mime, original filename, description) left null
  until upload exists.
- **person_media** — links media to one or more people.
- **event** + **event_person** — stored *custom* life events (immigration,
  military, education, career, residence, religious, other), each linkable to one
  or more people and an optional source document. Births, deaths, marriages and
  divorces are **never stored** — they're derived on read (see below), so editing
  a date updates the timeline with no sync.

The read model in `app/src/lib/queries.ts` assembles an in-memory `Dataset`
({ people, graph, relationships, media }) — deriving a **family-graph DAG** from
`relationship` rows via `app/src/lib/buildFamilyGraph` (`app/src/lib/family-graph.ts`)
— which the server hands to the client through a context (`app/src/lib/dataset.tsx`).
The graph models **unions** (couples / co-parent groups); every partner keeps
their own link upward to their own parents, so the Explorer draws **both**
ancestral lines of a couple (not just one "blood-line" side). The layered layout
that positions it lives in `app/src/lib/tree-layout.ts` (generation layering →
crossing-reduced ordering → coordinate assignment), and `relationsOf` /
`lineageOf` read straight off the raw edges so the side panels don't depend on
the layout. Both are pure + unit-tested (`*.test.ts`, run with `npm test`). The
demo seed lives in `app/src/db/seed-data.ts`.

The **timeline** is another pure derivation off the same `Dataset`:
`app/src/lib/timeline.ts` (`buildTimeline`, unit-tested in `timeline.test.ts`)
merges *derived* events (birth/death from `person`, marriage/divorce from spouse
`relationship` dates, a `document` per dated `media`) with *stored* `event` rows
into one chronologically-sorted `events: TimelineEvent[]` on the `Dataset`.
Birth-certificate / obituary / cited media are attached as an event's *source*
and deduped out of the standalone document events. The Timeline screen
(`app/src/components/Timeline.tsx`) draws it three ways (River / Lanes / Decades)
with type/person/period filters; the person record gets a Timeline tab + event
strip, and `AddEventDialog` persists new events via the `createEvent` /
`updateEvent` / `deleteEvent` server actions.

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

# Local services (repo root) — dev needs a database (and, for semantic search,
# an embedding server) to talk to. docker-compose starts both:
docker compose up -d # Postgres (pgvector/pgvector:pg16) at :5432 + TEI at :8080

# App (cd app/)
npm install          # install app deps
npm run dev          # dev server (auto-migrates + seeds the demo family + reindexes search)
npm run build        # production build
npm run start        # run the production build
npm run db:generate  # generate a Drizzle migration after editing schema.ts
npm run db:migrate   # apply migrations to the DB (uses DATABASE_URL)
npm run db:seed      # seed an empty DB with the demo family (idempotent)
npm run db:reindex   # rebuild the search index from the tables (idempotent)
npm test             # vitest — unit tests for the pure family-graph + layout code
```

The app reads `DATABASE_URL` (and `AUTH_SECRET` / `SITE_PASSWORD`) from
`app/.env.local` in dev; it defaults to the local Postgres above. For semantic
search set `EMBEDDINGS_URL=http://localhost:8080` (the docker-compose TEI
service); leave it unset to run search in lexical-only (keyword) mode.

### Search / embeddings

Search is **hybrid**: a dense pgvector cosine arm (HNSW index) and a Postgres
full-text arm (`tsv` GIN index) are fused with Reciprocal Rank Fusion in one SQL
query (`app/src/lib/search/query.ts`), behind `POST /api/search`. The searchable
corpus lives in a decoupled `search_doc` table, kept in sync by
`app/src/lib/search/index-doc.ts` (on person create, on boot for missing rows,
and via `db:reindex`).

Embeddings come from a **self-hosted, open-source** model — Hugging Face Text
Embeddings Inference (TEI, Apache-2.0) running `BAAI/bge-small-en-v1.5` — reached
over HTTP at `EMBEDDINGS_URL`. **No family data is sent to any third party.** When
`EMBEDDINGS_URL` is unset/unreachable the dense arm is skipped and search degrades
to lexical-only, so the repo runs keyless/serviceless.

- Env vars: `EMBEDDINGS_URL` (empty ⇒ lexical-only), `EMBEDDING_DIM` (default 384,
  **must equal** the migration's `vector(N)`), `EMBEDDINGS_MODEL` (informational).
- **Ordering is load-bearing**: the migration runs `CREATE EXTENSION vector`
  before the HNSW index; reindex must run before semantic queries return results.
  `getDb()` enforces migrate → seed → reindex on boot.
- **Dimension lock-in**: changing to a model with a different dimension needs a new
  migration (drop/recreate the `embedding` column + HNSW index) and a full
  `db:reindex`.

## Deployment (Railway)

Data lives in a **managed Railway Postgres service** in the same project, so the
app container stays stateless (Railway's container filesystem is ephemeral — never
rely on it for data).

- The Postgres service exposes `DATABASE_URL`; the app service gets it as a Railway
  reference variable: `DATABASE_URL = ${{ Postgres.DATABASE_URL }}` (prefer the
  private-network URL). Migrations apply automatically on first boot (`getDb()`).
- Back up the Postgres database periodically — it is the single source of truth.
- **Embeddings service**: add a service from the public image
  `ghcr.io/huggingface/text-embeddings-inference:cpu-1.5` with args
  `--model-id BAAI/bge-small-en-v1.5`, give it a volume for the model cache, and
  point the app at it via a private-network reference variable
  `EMBEDDINGS_URL = http://${{ embeddings.RAILWAY_PRIVATE_DOMAIN }}:80`. The model
  runs on infra you own — no data leaves the project. Omit the service (and the
  var) to run search lexical-only. The managed Postgres supports pgvector; the
  migration enables the extension on first boot.
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
path wired into the app). Add/edit person persists, including **adding and
removing relationships** from the edit form. The Explorer draws a **family-graph
DAG** — both ancestral lines of every couple, laid out in generation layers
(`lib/family-graph.ts` + `lib/tree-layout.ts`, unit-tested). **Hybrid semantic search** is live
(pgvector + full-text, RRF) over a `search_doc` index, powered by a self-hosted
open-source embedding server, with a lexical-only fallback. A **first-class
Family Timeline** is live: birth/death/marriage/divorce and dated media derive
into events automatically (editing a person/relationship updates the timeline
with no sync), custom life events are stored + add/edit/deletable and linkable to
people, drawn as River / Lanes / Decades with filters. Production runs on a
managed Railway Postgres and boots empty; local dev uses Docker Postgres seeded
with the demo family. Still stubbed: real media upload + protected serving (needs
object storage), and Auth.js (a shared password gate stands in). Not yet wired:
indexing events into hybrid search. Next up: media upload.
