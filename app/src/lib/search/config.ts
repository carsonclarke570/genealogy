/**
 * Search tunables — one source of truth for the semantic-search stack.
 *
 * Embeddings come from a self-hosted, open-source model (Hugging Face Text
 * Embeddings Inference, an Apache-2.0 server) reached over HTTP at
 * EMBEDDINGS_URL — by default the Railway private network in prod, a local
 * docker-compose service in dev. No family data is ever sent to a third party.
 *
 * When EMBEDDINGS_URL is empty the system runs in lexical-only mode (Postgres
 * full-text), so the repo still works keyless/serviceless.
 *
 * IMPORTANT: EMBEDDING_DIM is baked into the migration's `vector(N)` column.
 * Changing the model to a different dimension requires a new migration
 * (drop/recreate the column + HNSW index) and a full `npm run db:reindex`.
 */

/** Embedding dimension. Must equal the migration's `vector(N)`. bge-small-en-v1.5 = 384. */
export const EMBEDDING_DIM = Number(process.env.EMBEDDING_DIM ?? 384);

/** Base URL of the self-hosted TEI embedding server. Empty ⇒ lexical-only. */
export const EMBEDDINGS_URL = process.env.EMBEDDINGS_URL?.replace(/\/$/, "") ?? "";

/** Model id (informational; the server is already pinned to a model). */
export const EMBEDDINGS_MODEL = process.env.EMBEDDINGS_MODEL ?? "BAAI/bge-small-en-v1.5";

/** Reciprocal Rank Fusion damping constant. */
export const RRF_K = 60;

/** Per-arm candidate depth pulled before fusion. */
export const KNN_CANDIDATES = 50;
