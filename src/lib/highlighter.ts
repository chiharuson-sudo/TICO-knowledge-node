/**
 * テキストハイライト制御ロジック
 * 引用元(VTT)テキストに複数のスパンを適用し、ハイライト表示する
 */

export interface HighlightSpan {
  start: number;
  end: number;
  /** ホバー時に強調するか */
  active?: boolean;
}

export interface HighlightResult {
  parts: { text: string; highlighted: boolean; active?: boolean }[];
}

/**
 * テキストをスパンで分割し、ハイライト対象の部分をマークする
 */
export function applyHighlights(
  text: string,
  spans: HighlightSpan[],
  highlightClass = "bg-amber-200/50"
): HighlightResult {
  if (!spans.length) {
    return { parts: [{ text, highlighted: false }] };
  }
  const sorted = [...spans].sort((a, b) => a.start - b.start);
  const parts: { text: string; highlighted: boolean; active?: boolean }[] = [];
  let pos = 0;

  for (const span of sorted) {
    const s = Math.max(0, span.start);
    const e = Math.min(text.length, span.end);
    if (s > pos) {
      parts.push({ text: text.slice(pos, s), highlighted: false });
    }
    if (s < e) {
      parts.push({
        text: text.slice(s, e),
        highlighted: true,
        active: span.active,
      });
    }
    pos = Math.max(pos, e);
  }
  if (pos < text.length) {
    parts.push({ text: text.slice(pos), highlighted: false });
  }
  return { parts };
}

/**
 * ナレッジの content を VTT テキスト内で検索し、見つかった位置をスパンとして返す
 * citation が無い場合のフォールバック
 */
export function findCitationFallback(
  vttText: string,
  content: string,
  maxLength = 200
): { start: number; end: number } | null {
  const normalized = content.replace(/\s+/g, " ").trim().slice(0, maxLength);
  if (!normalized) return null;
  const idx = vttText.indexOf(normalized);
  if (idx >= 0) {
    return { start: idx, end: idx + normalized.length };
  }
  const words = normalized.split(/\s+/).filter(Boolean);
  if (words.length < 2) return null;
  const firstFew = words.slice(0, 3).join(" ");
  const idx2 = vttText.indexOf(firstFew);
  if (idx2 >= 0) {
    return { start: idx2, end: Math.min(idx2 + normalized.length, vttText.length) };
  }
  return null;
}
