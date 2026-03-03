import type {
  Knowledge,
  Relation,
  Filters,
  NodeWithDegree,
  FilteredEdge,
  GraphResult,
} from "./types";

/**
 * フィルタ適用（★「共通」は常に含める）
 * product/timeline/client/flow で「共通」のナレッジはどの選択でも表示
 */
function matchesFilter(k: Knowledge, filters: Filters): boolean {
  if (
    filters.product !== "全て" &&
    k.product !== filters.product &&
    k.product !== "共通"
  )
    return false;
  if (
    filters.timeline !== "全て" &&
    k.timeline !== filters.timeline &&
    k.timeline !== "共通"
  )
    return false;
  if (
    filters.client !== "全て" &&
    k.client !== filters.client &&
    k.client !== "共通"
  )
    return false;
  if (
    filters.flow !== "全て" &&
    k.flow !== filters.flow &&
    k.flow !== "共通"
  )
    return false;
  if (filters.domain !== "全て" && k.domain !== filters.domain) return false;
  if (filters.viewpoint !== "全て" && k.viewpoint !== filters.viewpoint)
    return false;
  return true;
}

/**
 * グラフ自動生成エンジン
 * 入力: knowledge + relations + filters
 * 出力: degree 付きノード・フィルタ済みエッジ・maxDegree
 */
export function buildFilteredGraph(
  knowledge: Knowledge[],
  relations: Relation[],
  filters: Filters
): GraphResult {
  const filtered = knowledge.filter((k) => matchesFilter(k, filters));
  const ids = new Set(filtered.map((k) => k.id));
  const edges: FilteredEdge[] = relations
    .filter((r) => ids.has(r.from) && ids.has(r.to))
    .map((r) => ({ ...r, id: `${r.from}-${r.to}-${r.type}` }));

  const degree: Record<string, number> = {};
  filtered.forEach((n) => (degree[n.id] = 0));
  edges.forEach((e) => {
    degree[e.from] = (degree[e.from] ?? 0) + 1;
    degree[e.to] = (degree[e.to] ?? 0) + 1;
  });
  const maxDeg = Math.max(1, ...Object.values(degree));

  const nodes: NodeWithDegree[] = filtered.map((k) => {
    const d = degree[k.id] ?? 0;
    return {
      ...k,
      degree: d,
      radius: 6 + (d / maxDeg) * 16,
      fontSize: 8 + (d / maxDeg) * 5,
    };
  });

  return { nodes, edges, maxDegree: maxDeg };
}
