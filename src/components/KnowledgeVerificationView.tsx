"use client";

import { useMemo, useState } from "react";
import type { Knowledge, Relation, RelationType } from "@/lib/types";
import type { CitationSpan } from "@/lib/types";
import { applyHighlights, findCitationFallback } from "@/lib/highlighter";
import { WorkflowStepper } from "./WorkflowStepper";
import { RelationCard, type RelationWithNodes } from "./RelationCard";
import { VIEWPOINT_COLORS, RELATION_COLORS, DEFAULT_VIEWPOINT_COLOR } from "@/lib/colors";

export type KnowledgeReviewStatus = "pending" | "approved" | "rejected" | "modified";

interface KnowledgeVerificationViewProps {
  knowledge: Knowledge[];
  relations: Relation[];
  /** 議事録(VTT)全文。source（会議名）→ テキスト */
  sourceDocuments?: Record<string, string>;
  onSourceDocumentChange?: (source: string, text: string) => void;
  reviewStatusMap: Record<string, KnowledgeReviewStatus>;
  onReviewStatusChange: (id: string, status: KnowledgeReviewStatus) => void;
  onKnowledgeEdit?: (id: string, patch: { title?: string; content?: string }) => void;
  onRelationApprove?: (from: string, to: string) => void;
  onRelationReject?: (from: string, to: string) => void;
  onRelationChangeType?: (from: string, to: string, newType: RelationType) => void;
}

export function KnowledgeVerificationView({
  knowledge,
  relations,
  sourceDocuments = {},
  onSourceDocumentChange,
  reviewStatusMap,
  onReviewStatusChange,
  onKnowledgeEdit,
  onRelationApprove,
  onRelationReject,
  onRelationChangeType,
}: KnowledgeVerificationViewProps) {
  const [sourceFilter, setSourceFilter] = useState<string>("");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [vttPaste, setVttPaste] = useState("");

  const sources = useMemo(
    () => [...new Set(knowledge.map((k) => k.source).filter(Boolean))].sort(),
    [knowledge]
  );
  const filtered = useMemo(
    () => knowledge.filter((k) => !sourceFilter || k.source === sourceFilter),
    [knowledge, sourceFilter]
  );
  const approvedIds = useMemo(
    () => new Set(Object.entries(reviewStatusMap).filter(([, v]) => v === "approved" || v === "modified").map(([k]) => k)),
    [reviewStatusMap]
  );
  const nodeMap = useMemo(() => new Map(knowledge.map((n) => [n.id, n])), [knowledge]);

  const getVttForKnowledge = (k: Knowledge): string => {
    return sourceDocuments[k.source] ?? "";
  };

  const getHighlightSpan = (k: Knowledge): CitationSpan | null => {
    const vtt = getVttForKnowledge(k);
    if (!vtt) return null;
    if (k.citation && k.citation.start >= 0 && k.citation.end <= vtt.length) {
      return k.citation;
    }
    const fallback = findCitationFallback(vtt, k.content);
    return fallback;
  };

  const isHovered = (id: string) => hoveredId === id;

  const startEdit = (k: Knowledge) => {
    setEditingId(k.id);
    setEditTitle(k.title);
    setEditContent(k.content ?? "");
  };

  const saveEdit = () => {
    if (!editingId || !onKnowledgeEdit) return;
    onKnowledgeEdit(editingId, { title: editTitle, content: editContent });
    onReviewStatusChange(editingId, "modified");
    setEditingId(null);
  };

  const currentSource = sourceFilter || sources[0] || "";
  const vttText = sourceDocuments[currentSource] ?? "";
  const activeSpan = hoveredId ? (() => {
    const k = nodeMap.get(hoveredId);
    if (!k) return null;
    return getHighlightSpan(k);
  })() : null;

  const highlightResult = useMemo(() => {
    if (!vttText) return null;
    const spans = filtered
      .filter((k) => k.source === currentSource)
      .map((k) => {
        const s = getHighlightSpan(k);
        if (!s) return null;
        return { start: s.start, end: s.end, active: isHovered(k.id) };
      })
      .filter((s): s is { start: number; end: number; active: boolean } => s !== null);
    return applyHighlights(vttText, spans);
  }, [vttText, filtered, currentSource, hoveredId]);

  const relationsForNode = (nodeId: string): RelationWithNodes[] =>
    relations
      .filter((r) => r.from === nodeId || r.to === nodeId)
      .map((r) => ({
        ...r,
        fromTitle: nodeMap.get(r.from)?.title,
        toTitle: nodeMap.get(r.to)?.title,
      }));

  return (
    <div className="flex h-full flex-col overflow-hidden p-4">
      <WorkflowStepper
        currentPhase={approvedIds.size > 0 ? 2 : 1}
        pendingCount={filtered.filter((k) => !approvedIds.has(k.id) && reviewStatusMap[k.id] !== "rejected").length}
        relationshipPendingCount={relations.filter((r) => (r.status ?? "pending") === "pending").length}
      />

      <div className="mt-4 flex items-center gap-3">
        <label className="text-sm text-slate-400">
          会議（source）
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="ml-2 rounded border border-slate-600 bg-slate-900 px-2 py-1 text-slate-200"
          >
            <option value="">すべて</option>
            {sources.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-4 grid flex-1 min-h-0 grid-cols-1 gap-4 lg:grid-cols-2">
        {/* 左カラム: Source Context (VTT) */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-slate-600 bg-slate-800/60">
          <h3 className="border-b border-slate-600 px-4 py-2 text-sm font-medium text-slate-300">
            Source Context（議事録 VTT）
          </h3>
          <div className="flex-1 overflow-y-auto p-4">
            {vttText ? (
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
                {highlightResult?.parts.map((p, i) => (
                  <span
                    key={i}
                    className={
                      p.highlighted
                        ? p.active
                          ? "rounded bg-amber-300/60"
                          : "rounded bg-amber-200/40"
                        : ""
                    }
                  >
                    {p.text}
                  </span>
                )) ?? vttText}
              </div>
            ) : onSourceDocumentChange && currentSource ? (
              <div className="space-y-2">
                <p className="text-slate-500 text-sm">議事録（VTT）を貼り付けてください</p>
                <textarea
                  value={vttPaste}
                  onChange={(e) => setVttPaste(e.target.value)}
                  placeholder="VTTテキスト..."
                  rows={8}
                  className="w-full rounded border border-slate-600 bg-slate-900 px-2 py-1 text-sm text-slate-200"
                />
                <button
                  type="button"
                  onClick={() => {
                    onSourceDocumentChange(currentSource, vttPaste);
                    setVttPaste("");
                  }}
                  className="rounded bg-cyan-600 px-3 py-1 text-sm text-white hover:bg-cyan-500"
                >
                  反映
                </button>
              </div>
            ) : (
              <p className="text-slate-500 text-sm">
                議事録データがありません。会議を選択し、VTTを貼り付けてください。
              </p>
            )}
          </div>
        </div>

        {/* 右カラム: Extracted Knowledge */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-slate-600 bg-slate-800/60">
          <h3 className="border-b border-slate-600 px-4 py-2 text-sm font-medium text-slate-300">
            Extracted Knowledge（AI抽出ナレッジ）
          </h3>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {filtered.map((k) => {
              const status = reviewStatusMap[k.id] ?? "pending";
              const color = VIEWPOINT_COLORS[k.viewpoint] ?? DEFAULT_VIEWPOINT_COLOR;
              const isApproved = approvedIds.has(k.id);
              const citation = getHighlightSpan(k);
              const isEditing = editingId === k.id;

              return (
                <div
                  key={k.id}
                  className={`rounded-lg border p-4 transition ${
                    isHovered(k.id) ? "border-amber-500/60 bg-slate-800/80" : "border-slate-600 bg-slate-800/50"
                  }`}
                  onMouseEnter={() => setHoveredId(k.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  <div className="mb-2 flex items-center gap-2">
                    <span className="font-mono text-xs text-slate-500">{k.id}</span>
                    <span
                      className="rounded px-1.5 py-0.5 text-xs font-medium"
                      style={{ background: color + "30", color }}
                    >
                      {k.viewpoint}
                    </span>
                    {k.source && (
                      <span className="rounded bg-slate-700/60 px-1.5 py-0.5 text-xs text-slate-400">{k.source}</span>
                    )}
                    {status !== "pending" && (
                      <span
                        className={`text-xs ${
                          status === "approved" || status === "modified"
                            ? "text-emerald-400"
                            : "text-rose-400"
                        }`}
                      >
                        {status === "approved" && "✓ 承認済み"}
                        {status === "modified" && "編集済み"}
                        {status === "rejected" && "✗ NG"}
                      </span>
                    )}
                  </div>

                  {citation?.summary && (
                    <p className="mb-2 text-xs text-slate-500">なぜ重要か: {citation.summary}</p>
                  )}

                  {isEditing ? (
                    <div className="space-y-2">
                      <input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full rounded border border-slate-600 bg-slate-900 px-2 py-1 text-sm text-slate-200"
                        placeholder="タイトル"
                      />
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={4}
                        className="w-full rounded border border-slate-600 bg-slate-900 px-2 py-1 text-sm text-slate-200"
                        placeholder="内容"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={saveEdit}
                          className="rounded bg-cyan-600 px-3 py-1 text-xs text-white hover:bg-cyan-500"
                        >
                          保存
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="rounded bg-slate-600 px-3 py-1 text-xs text-slate-200 hover:bg-slate-500"
                        >
                          キャンセル
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <h4 className="font-medium text-slate-100">{k.title}</h4>
                      <p className="mt-1 text-sm text-slate-400">{k.content}</p>

                      {!isApproved && status !== "rejected" && (
                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            onClick={() => onReviewStatusChange(k.id, "approved")}
                            className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500"
                          >
                            承認 (OK)
                          </button>
                          <button
                            type="button"
                            onClick={() => onReviewStatusChange(k.id, "rejected")}
                            className="rounded bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-500"
                          >
                            NG
                          </button>
                          {onKnowledgeEdit && (
                            <button
                              type="button"
                              onClick={() => startEdit(k)}
                              className="rounded bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-500"
                            >
                              修正
                            </button>
                          )}
                        </div>
                      )}

                      {/* Phase 2: 承認後に関係性FBセクションを展開 */}
                      {isApproved && (
                        <div className="mt-4 rounded-lg border border-slate-600 bg-slate-900/50 p-3">
                          <h4 className="mb-2 text-xs font-medium text-slate-300">
                            Phase 2: 関係性定義（FMEA配慮）
                          </h4>
                          <p className="mb-2 text-xs text-slate-400">
                            このナレッジと他ナレッジの因果・前提・波及・対策を定義。対策の場合は引用元の具体的な手順が正しく反映されているか確認してください。
                          </p>
                          {relationsForNode(k.id).length === 0 ? (
                            <p className="text-xs text-slate-500">
                              このナレッジに関連する関係性はまだありません。「関係性FB」タブでAI分析を実行するか、手動で追加してください。
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {relationsForNode(k.id).map((edge) => (
                                <div key={`${edge.from}-${edge.to}`} className="space-y-1">
                                  <RelationCard
                                    edge={edge}
                                    compact={false}
                                    onApprove={onRelationApprove}
                                    onReject={onRelationReject}
                                    onChangeType={onRelationChangeType}
                                  />
                                  <label className="flex items-center gap-2 text-xs text-slate-400">
                                    <input type="checkbox" className="rounded border-slate-500" />
                                    FMEAのS値（影響度）に影響する
                                  </label>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
