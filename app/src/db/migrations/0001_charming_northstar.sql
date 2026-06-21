-- Hand-augmented after `drizzle-kit generate` (search_doc index table):
--   1. CREATE EXTENSION must run first — the vector(384) column type and the
--      HNSW index both require pgvector.
--   2. The `tsv` STORED generated column + its GIN index are added here because
--      drizzle-kit can't express a generated tsvector. It is intentionally NOT
--      declared in schema.ts and is invisible to the ORM (queried via raw SQL),
--      so it won't round-trip into meta/0001_snapshot.json — that drift is fine.
CREATE EXTENSION IF NOT EXISTS vector;
--> statement-breakpoint
CREATE TABLE "search_doc" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"ref_id" text NOT NULL,
	"content" text NOT NULL,
	"place" text,
	"embedding" vector(384),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "search_doc"
	ADD COLUMN "tsv" tsvector
	GENERATED ALWAYS AS (to_tsvector('english', coalesce("content", ''))) STORED;
--> statement-breakpoint
CREATE INDEX "search_doc_tsv_idx" ON "search_doc" USING gin ("tsv");
--> statement-breakpoint
CREATE INDEX "search_doc_embedding_idx" ON "search_doc" USING hnsw ("embedding" vector_cosine_ops);
