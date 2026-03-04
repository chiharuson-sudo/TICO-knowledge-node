import type { Knowledge } from "./types";

export const EMBEDDING_MODEL = "text-embedding-3-small";
export const SIMILARITY_THRESHOLD_DEFAULT = 0.72;

export interface EmbeddingResult {
  id: string;
  embedding: number[];
}

/** ナレッジ本文からembedding用テキストを構築（タイトルを2回で重み付け） */
export function buildEmbeddingText(node: Knowledge): string {
  const content = (node.content ?? "").slice(0, 500);
  return `${node.title}\n${node.title}\n${node.viewpoint}\n${content}`;
}

/** コサイン類似度 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}
