import type { Knowledge, Relation } from "./types";
import type { EmbeddingResult } from "./embedding";
import { cosineSimilarity } from "./embedding";

export interface CandidatePair {
  fromId: string;
  toId: string;
  similarity: number;
  fromSource: string;
  toSource: string;
}

/** 会議横断ペア抽出: 同一会議・既存エッジ除外、閾値以上の類似度ペアを返す */
export function findCrossMeetingPairs(
  nodes: Knowledge[],
  embeddings: EmbeddingResult[],
  existingEdges: Relation[],
  threshold: number = 0.72
): CandidatePair[] {
  const embMap = new Map(embeddings.map((e) => [e.id, e.embedding]));
  const existingSet = new Set(
    existingEdges.flatMap((e) => [`${e.from}-${e.to}`, `${e.to}-${e.from}`])
  );
  const candidates: CandidatePair[] = [];

  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i], b = nodes[j];
      if ((a.source ?? "") === (b.source ?? "")) continue;
      if (existingSet.has(`${a.id}-${b.id}`)) continue;
      const embA = embMap.get(a.id), embB = embMap.get(b.id);
      if (!embA || !embB) continue;
      const sim = cosineSimilarity(embA, embB);
      if (sim >= threshold) {
        candidates.push({
          fromId: a.id, toId: b.id, similarity: sim,
          fromSource: a.source ?? "", toSource: b.source ?? "",
        });
      }
    }
  }
  return candidates.sort((x, y) => y.similarity - x.similarity);
}
