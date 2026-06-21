/**
 * Embeddings client (server-only).
 *
 * The embedder is a thin HTTP client over a self-hosted Hugging Face Text
 * Embeddings Inference (TEI) server — an open-source embedding model we run
 * ourselves (see config.ts). `getEmbedder()` returns `null` when no server is
 * configured, which puts search into lexical-only mode; callers must handle that.
 *
 * The instance is memoized as a module singleton (mirrors getDb()).
 *
 * Not marked `server-only`: it's a server module, but the standalone
 * `npm run db:reindex` script (tsx, outside Next) loads it through index-doc.ts,
 * and the server-only guard throws outside the React Server runtime.
 */
import { EMBEDDING_DIM, EMBEDDINGS_URL } from "./config";

export interface Embedder {
  readonly dimension: number;
  /** One L2-normalized vector per input, each of length `dimension`. */
  embed(texts: string[]): Promise<number[][]>;
}

/** TEI client: POST {url}/embed with `{ inputs }`, returns `number[][]`. */
class TeiEmbedder implements Embedder {
  readonly dimension = EMBEDDING_DIM;
  constructor(private readonly baseUrl: string) {}

  async embed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    const res = await fetch(`${this.baseUrl}/embed`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ inputs: texts, normalize: true }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Embedding server ${res.status}: ${detail.slice(0, 200)}`);
    }
    const vectors = (await res.json()) as number[][];
    if (!Array.isArray(vectors) || vectors.length !== texts.length) {
      throw new Error(`Embedding server returned ${vectors?.length} vectors for ${texts.length} inputs`);
    }
    for (const v of vectors) {
      if (!Array.isArray(v) || v.length !== this.dimension) {
        throw new Error(
          `Embedding dimension mismatch: got ${v?.length}, expected ${this.dimension} (check EMBEDDING_DIM vs the model/migration)`,
        );
      }
    }
    return vectors;
  }
}

let cached: Embedder | null | undefined;

/** The configured embedder, or `null` for lexical-only mode. Memoized. */
export function getEmbedder(): Embedder | null {
  if (cached === undefined) cached = EMBEDDINGS_URL ? new TeiEmbedder(EMBEDDINGS_URL) : null;
  return cached;
}
