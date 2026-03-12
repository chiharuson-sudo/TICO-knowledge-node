/** 引用元（VTT内の該当箇所） */
export interface CitationSpan {
  start: number;
  end: number;
  summary?: string;
}

/** ナレッジ（1行 = 1ノード） */
export interface Knowledge {
  id: string;
  title: string;
  /** データ取込時の元キー。関係テーブルとのマッチング用 */
  titleKey?: string;
  viewpoint: string;
  content: string;
  product: string;
  timeline: string;
  client: string;
  flow: string;
  domain: string;
  source: string;
  /** 議事録(VTT)内の引用箇所（ハイライト用）。source に対応するVTTテキスト内の文字位置 */
  citation?: CitationSpan;
}

/** 関係タイプ（FMEA: 要因→故障モード→影響の連鎖を区別） */
export type RelationType = "前提" | "因果" | "対策" | "波及";

/** 関係性の承認状態 */
export type RelationStatus =
  | "pending"       // 未確認
  | "approved"      // 人間がOK
  | "rejected"      // 人間がNG
  | "silent_approved" // サイレント承認（高確信度・異議なしで自動確定）
  | "changed";      // 人間が種類を変更して承認

/** 関係（エッジ） */
export interface Relation {
  from: string;
  to: string;
  type: RelationType;
  description: string;
  /** 推論根拠（なぜこの2つが繋がるか・1行エビデンス） */
  evidence_text?: string;
  /** 関係性の確信度 0〜1。0.9以上でサイレント承認の対象 */
  confidence_score?: number;
  /** 承認状態 */
  status?: RelationStatus;
  /** サイレント承認予定日時（ISO文字列）。過ぎたら status を silent_approved に更新 */
  auto_approve_at?: string;
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

/** 関係性フィードバックのログ（NGにした理由・変更内容等。評価エージェント移行用） */
export interface RelationFeedbackLog {
  id: string;
  from: string;
  to: string;
  action: "approved" | "rejected" | "changed";
  previous_type?: RelationType;
  new_type?: RelationType;
  reason?: string;
  created_at: string;
}
