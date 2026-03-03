/** ナレッジ（1行 = 1ノード） */
export interface Knowledge {
  id: string;
  title: string;
  viewpoint: string;
  content: string;
  product: string;
  timeline: string;
  client: string;
  flow: string;
  domain: string;
  source: string;
}

/** 関係タイプ */
export type RelationType = "前提" | "因果" | "対策" | "波及";

/** 関係（エッジ） */
export interface Relation {
  from: string;
  to: string;
  type: RelationType;
  description: string;
}

/** 6軸フィルタ */
export interface Filters {
  product: string;
  timeline: string;
  client: string;
  flow: string;
  domain: string;
  viewpoint: string;
}

/** degree 付きナレッジノード（グラフエンジン出力） */
export interface NodeWithDegree extends Knowledge {
  degree: number;
  radius: number;
  fontSize: number;
}

/** フィルタ後のエッジ */
export interface FilteredEdge extends Relation {
  id?: string;
}

/** グラフエンジン出力 */
export interface GraphResult {
  nodes: NodeWithDegree[];
  edges: FilteredEdge[];
  maxDegree: number;
}
