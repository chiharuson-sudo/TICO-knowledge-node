import type { Knowledge, Relation } from "./types";
import type { EmbeddingResult } from "./embedding";
import { cosineSimilarity } from "./embedding";

export interface CandidatePair {
  fromId: string;
  toId: string;
  similarity: number;
  fromSource: string;
  toSource: string;
  /** 両方とも会議（source）が付いており、かつ異なる会議のペア */
  isCrossMeeting?: boolean;
}

/** 会議横断ペア抽出: 同一会議・既存エッジ除外、閾値以上の類似度ペアを返す。会議横断ペアを優先してソート */
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
      const a = nodes[i];
      const b = nodes[j];
      const aSource = a.source ?? "";
      const bSource = b.source ?? "";
      const bothHaveSource =
        aSource &&
        aSource !== "不明" &&
        bSource &&
        bSource !== "不明";
      if (bothHaveSource && aSource === bSource) continue;
      if (existingSet.has(`${a.id}-${b.id}`)) continue;
      const embA = embMap.get(a.id);
      const embB = embMap.get(b.id);
      if (!embA || !embB) continue;
      const sim = cosineSimilarity(embA, embB);
      if (sim >= threshold) {
        candidates.push({
          fromId: a.id,
          toId: b.id,
          similarity: sim,
          fromSource: aSource || "不明",
          toSource: bSource || "不明",
          isCrossMeeting: Boolean(bothHaveSource && aSource !== bSource),
        });
      }
    }
  }
  return candidates.sort((x, y) => {
    if (x.isCrossMeeting && !y.isCrossMeeting) return -1;
    if (!x.isCrossMeeting && y.isCrossMeeting) return 1;
    return y.similarity - x.similarity;
  });
}
