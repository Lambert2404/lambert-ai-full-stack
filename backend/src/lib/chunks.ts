/**
 * Lightweight deterministic text embeddings + chunking + cosine retrieval.
 * This is a local, provider-agnostic retrieval index so document Q&A works
 * fully offline. In production it can be replaced by any vector store
 * (e.g. pgvector) without changing the call sites.
 */

export const EMBEDDING_DIM = 256;

const STOPWORDS = new Set(
  'a an and are as at be but by for from has have if in into is it its of on or that the their there these they this to was were will with would can could do does dont.'.split(/\s+/)
);

export function tokenize(text: string): string[] {
  const raw = text
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, ' ')
    .split(/[\s'-]+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
  return raw.slice(0, 2000);
}

function fnv1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function embedTokens(tokens: string[]): number[] {
  const vector = Array.from({ length: EMBEDDING_DIM }).fill(0) as number[];
  const tf = new Map<string, number>();
  for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);

  for (const [token, count] of tf) {
    const h1 = fnv1a(token);
    const h2 = fnv1a(token + ':x');
    const dim = h1 % EMBEDDING_DIM;
    const sign = h1 & 1 ? 1 : -1;
    const weight = 1 + 0.5 * Math.log1p(count);
    vector[dim]! += sign * weight * (1 + (h2 % 3));
  }

  // L2 normalize
  let norm = 0;
  for (const v of vector) norm += v * v;
  norm = Math.sqrt(norm);
  if (norm === 0) return vector;
  return vector.map((v) => v / norm);
}

export function embedText(text: string): number[] {
  return embedTokens(tokenize(text));
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += (a[i] ?? 0) * (b[i] ?? 0);
  return dot;
}

export interface ChunkOptions {
  maxWords?: number;
  overlapWords?: number;
}

export function chunkText(text: string, opts: ChunkOptions = {}): string[] {
  const { maxWords = 500, overlapWords = 60 } = opts;
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let buffer: string[] = [];
  let bufferWords = 0;

  const flush = () => {
    if (buffer.length === 0) return;
    chunks.push(buffer.join(' '));
    const tail = buffer.slice(-overlapWords);
    buffer = [...tail];
    bufferWords = tail.length;
  };

  for (const para of paragraphs) {
    const words = para.split(' ');
    for (const word of words) {
      if (bufferWords >= maxWords) flush();
      buffer.push(word);
      bufferWords++;
    }
    flush();
  }
  flush();
  return chunks.filter((c) => c.trim().length > 0);
}

export interface ChunkIndex {
  id: string;
  documentId: string;
  index: number;
  content: string;
  score: number;
  page?: number;
}

export interface RetrievalOptions {
  query: string;
  candidates: Array<{ id: string; documentId: string; index: number; content: string; embeddingJson: unknown; metadata?: unknown }>;
  k?: number;
  minScore?: number;
}

/** Rank candidate chunks against the query and return the top-K. */
export function retrieveChunks(opts: RetrievalOptions): ChunkIndex[] {
  const { query, candidates, k = 5, minScore = 0 } = opts;
  const queryVec = embedText(query);
  return candidates
    .map((c) => {
      const emb = Array.isArray(c.embeddingJson) ? (c.embeddingJson as number[]) : [];
      const score = cosineSimilarity(queryVec, emb);
      return {
        id: c.id,
        documentId: c.documentId,
        index: c.index,
        content: c.content,
        score,
        page: extractPageNumber(c.metadata),
      } satisfies ChunkIndex;
    })
    .filter((c) => c.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}

function extractPageNumber(metadata: unknown): number | undefined {
  if (!metadata || typeof metadata !== 'object') return undefined;
  const page = (metadata as Record<string, unknown>).page;
  return typeof page === 'number' ? page : undefined;
}