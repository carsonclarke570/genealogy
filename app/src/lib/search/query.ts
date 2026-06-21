/**
 * Hybrid search over the search_doc index (server-only).
 *
 * Two retrieval arms are fused with Reciprocal Rank Fusion (RRF):
 *   - dense:   pgvector cosine KNN (`embedding <=> query`), served by the HNSW index
 *   - lexical: Postgres full-text (`tsv @@ websearch_to_tsquery`), GIN index
 * Each contributes 1/(RRF_K + rank); the sums rank the final results. When no
 * embedding server is configured the dense arm is dropped and we fall back to
 * pure lexical ranking (`mode: "lexical"`) — still useful, just not semantic.
 *
 * Results carry a ts_headline snippet and a `matchedPlace` flag (the query hit a
 * person's place text), which powers the Places scope.
 */
import "server-only";
import { sql, type SQL } from "drizzle-orm";
import type { DB } from "@/db/client";
import { getEmbedder } from "./embed";
import { KNN_CANDIDATES, RRF_K } from "./config";

export type SearchScope = "all" | "people" | "docs" | "places";

export interface SearchHit {
  id: string; // person id or media id (search_doc.ref_id)
  kind: "person" | "media";
  score: number;
  snippet: string;
  matchedPlace: boolean;
}

export interface SearchResult {
  hits: SearchHit[];
  mode: "vector" | "lexical";
}

type RawRow = {
  ref_id: string;
  kind: "person" | "media";
  score: number | string;
  snippet: string;
  matched_place: boolean;
};

// Highlight with unbalanced-safe sentinel markers (not <b>) so the client can
// render highlights without dangerouslySetInnerHTML — ts_headline does not
// escape the source text, so emitting HTML tags would be an injection risk.
const HEADLINE_OPTS = "StartSel=⟪,StopSel=⟫,MaxFragments=1,MaxWords=14,MinWords=5";

/** Extra WHERE fragment for a scope, applied to both retrieval arms. */
function scopeClause(scope: SearchScope, q: string): SQL {
  switch (scope) {
    case "people":
      return sql` and kind = 'person'`;
    case "docs":
      return sql` and kind = 'media'`;
    case "places":
      // Restrict to rows whose place text matches the query (media place is null).
      return sql` and to_tsvector('english', coalesce(place, '')) @@ websearch_to_tsquery('english', ${q})`;
    default:
      return sql``;
  }
}

export async function search(
  db: DB,
  q: string,
  scope: SearchScope,
  limit: number,
): Promise<SearchResult> {
  const where = scopeClause(scope, q);
  const embedder = getEmbedder();

  if (!embedder) {
    const res = await db.execute(sql`
      select ref_id, kind,
             ts_rank_cd(tsv, q) as score,
             ts_headline('english', content, q, ${HEADLINE_OPTS}) as snippet,
             (place is not null and to_tsvector('english', coalesce(place, '')) @@ q) as matched_place
      from search_doc, websearch_to_tsquery('english', ${q}) q
      where tsv @@ q${where}
      order by score desc
      limit ${limit}
    `);
    return { hits: toHits(res.rows as RawRow[]), mode: "lexical" };
  }

  const [vector] = await embedder.embed([q]);
  const qvec = `[${vector.join(",")}]`;

  const res = await db.execute(sql`
    with vec as (
      select id, kind, ref_id, place, content,
             row_number() over (order by embedding <=> ${qvec}::vector) as rnk
      from search_doc
      where embedding is not null${where}
      order by embedding <=> ${qvec}::vector
      limit ${KNN_CANDIDATES}
    ),
    lex as (
      select id, kind, ref_id, place, content,
             row_number() over (order by ts_rank_cd(tsv, q) desc) as rnk
      from search_doc, websearch_to_tsquery('english', ${q}) q
      where tsv @@ q${where}
      limit ${KNN_CANDIDATES}
    ),
    fused as (
      select
        coalesce(v.id, l.id) as id,
        coalesce(v.kind, l.kind) as kind,
        coalesce(v.ref_id, l.ref_id) as ref_id,
        coalesce(v.place, l.place) as place,
        coalesce(v.content, l.content) as content,
        coalesce(1.0 / (${RRF_K} + v.rnk), 0) + coalesce(1.0 / (${RRF_K} + l.rnk), 0) as score
      from vec v
      full outer join lex l on v.id = l.id
    )
    select ref_id, kind, score,
           ts_headline('english', content, websearch_to_tsquery('english', ${q}), ${HEADLINE_OPTS}) as snippet,
           (place is not null and to_tsvector('english', coalesce(place, '')) @@ websearch_to_tsquery('english', ${q})) as matched_place
    from fused
    order by score desc
    limit ${limit}
  `);
  return { hits: toHits(res.rows as RawRow[]), mode: "vector" };
}

function toHits(rows: RawRow[]): SearchHit[] {
  return rows.map((r) => ({
    id: r.ref_id,
    kind: r.kind,
    score: Number(r.score),
    snippet: r.snippet ?? "",
    matchedPlace: r.matched_place === true,
  }));
}
