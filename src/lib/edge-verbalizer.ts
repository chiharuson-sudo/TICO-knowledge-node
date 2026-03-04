import type { FilteredEdge } from "./types";

/**
 * エッジを1文で言語化する
 * 例: 「電圧レンジ確認は...」—【前提】→「異常検知時の...」。電圧確認の前提として安全設計がある
 */
export function edgeToSentence(
  edge: FilteredEdge,
  getTitle: (id: string) => string
): string {
  const fromTitle = getTitle(edge.from);
  const toTitle = getTitle(edge.to);
  const desc = edge.description?.trim();
  const base = `「${fromTitle}」—【${edge.type}】→「${toTitle}」`;
  return desc ? `${base}。${desc}` : base;
}

/**
 * 複数エッジを箇条書き用の文の配列に
 */
export function edgesToSentences(
  edges: FilteredEdge[],
  getTitle: (id: string) => string
): string[] {
  return edges.map((e) => edgeToSentence(e, getTitle));
}
