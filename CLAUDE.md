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
| Geocoding      | Self-hosted Photon (Apache-2.0), env-gated — no 3rd party       |
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
- **media** — id, type (photo | certificate | article | obituary | **census** |
  other), title, year, plus file fields (path, mime, original filename,
  description). Real upload populates the file fields; legacy/seed rows leave them
  null (the read model exposes `hasFile`/`mimeType` so the UI shows a real preview
  or a placeholder). A **`census`** upload additionally captures a place and
  auto-generates a residence + a census event for its household (see below).
- **person_media** — links media to one or more people. The read model derives a
  real per-person `mediaCount` from these rows (which `docCount` now prefers over
  the legacy `docs` JSON tally).
- **event** + **event_person** — stored *custom* life events (immigration,
  military, education, career, religious, **census**, other), each linkable to one
  or more people and an optional source document. Births, deaths, marriages and
  divorces are **never stored** — they're derived on read (see below), so editing
  a date updates the timeline with no sync. (Residence is no longer an event type —
  it became the first-class span below.)
- **residence** + **residence_person** — a first-class location record: a
  structured location (country → region → locality → address, plus `placeLabel` +
  optional lat/lng/placeId from the geocoder), with **unified provenance** (status +
  optional linked source document + note). A home is shared by a household, so a
  residence is **many-to-many with people** through the `residence_person` join
  table (`0007` migration; the timeline derives one span per residence, linked to
  every resident). Its `dateKind` (`0006` migration) picks how the dates read: a
  **range** (the default — `start` = moved in, `end` = moved out, null end = lived
  there onward / "present") or a **point** (a single *known* date in `start` — "we
  know they lived here around then but not the span", rendered "c. YYYY", `end`
  unused). The distinction is stored explicitly because "a start with no end" can't
  otherwise be told apart from "still there". Residencies **derive into the
  timeline** on read — ranges as span events, points as point events (so editing a
  residence updates the timeline with no sync). The `0005` migration backfills old
  point-in-time `residence` *events* into residence spans; new installs seed
  residencies directly.
- **Census auto-derivation** (`app/src/lib/census.ts`). Uploading a `census` media
  item seeds first-class records linked to everyone on the media and citing it as
  their source: a **census event** is always generated, and a *point* **residence**
  only when a place is given (the location is optional on the upload — clearing it
  drops the residence and keeps the event). Both use *deterministic* ids
  (`R-census-${mediaId}` / `E-census-${mediaId}`, in `app/src/lib/census-ids.ts`) so
  generation is idempotent, and carry an **`autoManaged`** flag: while true the media
  route's `syncCensusDerived` keeps them in step as the census is edited; the moment
  a user edits one by hand (`updateResidence`/`updateEvent`) the flag flips to false
  and the sync leaves it alone. Deleting the census (or changing its type away)
  removes the rows it still owns. `buildCensusRows` (`app/src/lib/census-derive.ts`)
  is the pure, unit-tested builder. **Timeline dedup:** the census event and its twin
  residence are one fact, so `buildTimeline` draws it once — as the census event
  (it carries the place + cites the record) — and skips the deterministic-id twin
  residence (which still shows on the person's Residences tab).

**Unified provenance.** Every discrete fact — a person's birth/death dates and
places, a marriage/divorce date, a media item, a residence, a stored event —
carries a single consistent **`ProvenanceMark`**: a confidence `status`
(`verified` | `unverified` | `estimated` | `disputed`, the `provStatuses` tuple in
`app/src/lib/prov.ts`), an optional linked source **document** (`mediaId`, the
record that backs the fact), and an optional free-text `note`. Stored on the
relevant table (`person.prov` JSON map, `relationship.marriedProv`/`divorcedProv`
+ `*MediaId`, `media.prov`, `residence.prov` + `mediaId`, `event.prov` +
`mediaId`), validated by the read model and the write path against the same tuple,
and surfaced uniformly in the UI — so "how do we know this?" is answered the same
way everywhere.

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
the layout. Generation layering reconciles two relaxations to a fixpoint — a
**spouse pull-down** (a married-in, ancestor-less partner adopts their spouse's
row) and a **child push-down** (a child sits a row below every parent) — so a
parent who is *raised* by the pull-down never ends up level with their own
child (the remarriage case). Sibling sets stay contiguous: row ordering works at
child-union (block) granularity and pulls couples to a block boundary, so two
families never interleave at the same generation. Within a row, sibling sets are
contracted to **atoms** and same-row marriages become edges between atoms; each
connected run is walked as a **chain** that seats a person married more than once
*between* their spouses (spouses flank the sibling block from the outside), so a
remarried/divorced person's two unions both stay local and each union's children
hang from their own parents — never from a midpoint knot stretched across the
canvas (the bug that made cousins read as siblings). A same-row couple is emitted
as a **marriage junction** (`Layout.junctions`): a bracket joining the partners
to a shared knot that their children descend from (dashed + hollow when
divorced) — so a couple never reads as two siblings.

The Explorer draws a **fog-of-war** neighbourhood, not the whole graph at once
(`app/src/lib/family-scope.ts`, `scopeFamily`, unit-tested). A weighted BFS
(Dijkstra over kin edges: spouse/sibling = 1, parent/child = 2) admits the
closest relatives to the focus up to a node budget, keeps couples whole, and
prunes to what stays connected to the focus. Fogging is then **layout-aware**
(`detectLayoutConflicts` + `resolveByLayout`): the scope is trial-laid-out, and
while the result still holds a *geometric* ambiguity — a parent→child link
**crossing**, a **stranded knot** (partners ≥1.5 slots apart with children
hanging between them), or two unions sharing a **coincident knot** — it fogs the
farthest-from-focus person feeding the conflict and recomputes, never touching
the focus's nuclear family (distance ≤ 2). This triggers regardless of budget, so
a small family with a bad local arrangement (the remarriage/cousin cases) is
protected too. Visible people touching hidden kin get a **frontier marker**
(bucketed up / down / side); clicking a node re-centres the scope, a focus stack
gives a back step, and an **Overview** toggle restores the whole-tree view. `homePerson` picks a deterministic most-connected person to
open on. Everything here is pure + unit-tested (`*.test.ts`, run with
`npm test`). The demo seed lives in `app/src/db/seed-data.ts`.

The **timeline** is another pure derivation off the same `Dataset`:
`app/src/lib/timeline.ts` (`buildTimeline`, unit-tested in `timeline.test.ts`)
merges *derived* events (birth/death from `person`, marriage/divorce from spouse
`relationship` dates, a `document` per dated `media`, a **residence span** per
`residence` row) with *stored* `event` rows into one chronologically-sorted
`events: TimelineEvent[]` on the `Dataset`.
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
docker compose up -d # Postgres (pgvector/pgvector:pg16) :5432 + TEI :8080
                     # + MinIO (S3-compatible media storage) :9000, console :9001
                     # + Photon geocoder :2322 (optional, large index — see below)

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
service); leave it unset to run search in lexical-only (keyword) mode. For the
location picker set `GEOCODER_URL=http://localhost:2322` (the docker-compose
Photon service); leave it unset to run the picker with archive-place autocomplete
only.

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

### Location picker / geocoding

The location picker is the `LocationField` design-system component (root
`src/components/LocationField.tsx`), used wherever a place is entered (person
birth/death places, residencies). As the user types it calls `GET /api/geocode?q=…`
(session-gated by middleware), which **merges** two sources: places already used in
the archive (residencies + person/event places — so the picker is useful even with
no geocoder at all) and structured results from a self-hosted geocoder.

Geocoding is **self-hosted and env-gated**, mirroring the embeddings server.
`app/src/lib/geocode.ts` reads `GEOCODER_URL` and queries a **Photon** instance
(Apache-2.0, https://github.com/komoot/photon — returns GeoJSON country → address
features). **No place query is sent to any third party.** When `GEOCODER_URL` is
unset/unreachable (or a request fails/times out) it returns `[]` and the picker
degrades to **archive-place autocomplete only** — so the repo stays
keyless/serviceless by default, exactly like lexical-only search.

- Env var: `GEOCODER_URL` (empty ⇒ archive-place autocomplete only). The
  docker-compose `geocoder` service (Photon, `:2322`) is **optional and heavy** —
  its search index is a multi-GB download, so the first boot is slow; omit the
  service to run without it.

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
- **Geocoder service** (optional): add a service from a Photon image (e.g.
  `rtuszik/photon-docker`, or run the official Photon JAR), give it a volume for the
  (large, multi-GB) search index, expose its HTTP port, and point the app at it via
  a private-network reference variable
  `GEOCODER_URL = http://${{ geocoder.RAILWAY_PRIVATE_DOMAIN }}:2322`. The geocoder
  runs on infra you own — no place query leaves the project. Omit the service (and
  the var) to run the location picker with archive-place autocomplete only.
- **Media storage**: uploaded files live in S3-compatible object storage (never the
  ephemeral container disk). Production uses a **Railway managed Bucket** (create it
  in the project; wire its credentials into the app service). Local dev uses the
  MinIO docker-compose service. The app speaks the S3 API through the `minio` client
  (`app/src/lib/storage`), reading these env vars (point them at the bucket in prod,
  MinIO in dev): `STORAGE_ENDPOINT`, `STORAGE_PORT`, `STORAGE_USE_SSL`,
  `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`, `STORAGE_BUCKET` (default
  `family-media`, auto-created on first use), `STORAGE_REGION`. Bytes are never on a
  public path — they stream through the authenticated route `GET /api/media/[id]/file`
  (session-gated by middleware, with Range support + `?download=1`). Upload is
  `POST /api/media` (multipart; magic-byte sniffed, 25 MB cap, allow-listed
  image/PDF — SVG/HTML rejected); delete is `DELETE /api/media/[id]`.

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
with the demo family. **Media upload + archive is live**: files go to S3-compatible
object storage (Railway Bucket in prod, MinIO in dev) via the `minio` client, are
served through an authenticated, Range-capable route, and surface as real previews
in the Gallery + person Documents tab (upload, view-detail, **edit metadata +
re-link people** via `PUT /api/media/[id]`, download, delete). Stored timeline
events are **editable in place** — an Edit affordance on each non-derived event row
opens `AddEventDialog` in edit mode (change type, title, date, place, people,
source, confidence) via the existing `updateEvent` action. A **first-class
residency system** is live: the `residence` table records structured
country → address spans with start/end partial dates, they derive into the
timeline as span events, and the `0005` migration backfills old point-in-time
residence events. Places are entered through a **location picker** (`LocationField`
+ `/api/geocode`) backed by an optional **self-hosted Photon geocoder**
(`GEOCODER_URL`), degrading to archive-place autocomplete when unset. Every
discrete fact carries a **unified `ProvenanceMark`** (status + linked source
document + note).
Still stubbed: Auth.js (a shared password gate stands in) and image thumbnails
(originals are served, lazy-loaded). Not yet wired: indexing events into hybrid
search. Next up: thumbnail generation + Auth.js.
