/** 観点カラー */
export const VIEWPOINT_COLORS: Record<string, string> = {
  "①判断ルール・分岐条件": "#2563eb",
  "②社内ルール・段取り": "#7c3aed",
  "③技術的注意点": "#d97706",
  "④設計思想・教訓": "#059669",
  "⑤絶対注意（ミス防止）": "#dc2626",
  "⑧再発防止・未然防止": "#db2777",
  "⑨影響範囲・波及リスク": "#0891b2",
};

/** 関係タイプカラー */
export const RELATION_COLORS: Record<string, string> = {
  前提: "#3b82f6",
  因果: "#ef4444",
  対策: "#10b981",
  波及: "#f59e0b",
};

export const DEFAULT_VIEWPOINT_COLOR = "#6b7280";
export const DEFAULT_RELATION_COLOR = "#64748b";
