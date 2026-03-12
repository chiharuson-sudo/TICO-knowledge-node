"use client";

import { useMemo, useState } from "react";
import type { Knowledge, Relation } from "@/lib/types";
import { VIEWPOINT_COLORS, DEFAULT_VIEWPOINT_COLOR } from "@/lib/colors";

export type KnowledgeReviewStatus = "pending" | "approved" | "rejected" | "modified";

interface KnowledgeReviewViewProps {
  knowledge: Knowledge[];
  relations: Relation[];
  /** セッション内のFB結果（id → status）。永続化は未実装時は親の state で保持 */
  reviewStatusMap: Record<string, KnowledgeReviewStatus>;
  onReviewStatusChange: (id: string, status: KnowledgeReviewStatus) => void;
  onKnowledgeEdit?: (id: string, patch: { title?: string; content?: string }) => void;
}

export function KnowledgeReviewView({
  knowledge,
  relations,
  reviewStatusMap,
  onReviewStatusChange,
  onKnowledgeEdit,
}: KnowledgeReviewViewProps) {
  const [sourceFilter, setSourceFilter] = useState<string>("");
  const [viewpointFilter, setViewpointFilter] = useState<string>("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");

  const sources = useMemo(() => [...new Set(knowledge.map((k) => k.source).filter(Boolean))].sort(), [knowledge]);
  const viewpoints = useMemo(() => [...new Set(knowledge.map((k) => k.viewpoint).filter(Boolean))].sort(), [knowledge]);

  const filtered = useMemo(() => {
    return knowledge.filter((k) => {
      if (sourceFilter && k.source !== sourceFilter) return false;
      if (viewpointFilter && k.viewpoint !== viewpointFilter) return false;
      return true;
    });
  }, [knowledge, sourceFilter, viewpointFilter]);

  const relationCountByNode = useMemo(() => {
    const m: Record<string, number> = {};
    relations.forEach((r) => {
      m[r.from] = (m[r.from] ?? 0) + 1;
      m[r.to] = (m[r.to] ?? 0) + 1;
    });
    return m;
  }, [relations]);

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

  const cancelEdit = () => {
    setEditingId(null);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-6">
      <h2 className="text-lg font-semibold text-slate-100">ナレッジ確認（Step 1：会議直後 個別FB）</h2>
      <div className="rounded-xl border border-slate-600 bg-slate-800/60 p-4 text-sm text-slate-300">
        <p className="mb-2">
          AIが会議VTTから抽出したナレッジ（トピック×観点）の<strong>適切性</strong>を判断してください。
          同時に、ノード詳細や「関係性FB」タブで同一会議内の関係性（因果/前提/波及/対策）が正しいかも確認できます。
        </p>
        <p className="text-xs text-slate-400">
          関係性の記述は、FMEAの影響度（S）の根拠・対策の具体化・「なぜこの対策が必要か」の根拠提示に不可欠です。
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-slate-400">
          会議（source）
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="rounded border border-slate-600 bg-slate-900 px-2 py-1 text-slate-200"
          >
            <option value="">すべて</option>
            {sources.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-400">
          観点
          <select
            value={viewpointFilter}
            onChange={(e) => setViewpointFilter(e.target.value)}
            className="rounded border border-slate-600 bg-slate-900 px-2 py-1 text-slate-200"
          >
            <option value="">すべて</option>
            {viewpoints.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </label>
        <span className="text-xs text-slate-500">{filtered.length} 件</span>
      </div>

      <div className="space-y-3">
        {filtered.map((k) => {
          const status = reviewStatusMap[k.id] ?? "pending";
          const color = VIEWPOINT_COLORS[k.viewpoint] ?? DEFAULT_VIEWPOINT_COLOR;
          const relCount = relationCountByNode[k.id] ?? 0;
          const isEditing = editingId === k.id;

          return (
            <div
              key={k.id}
              className="rounded-lg border border-slate-600 bg-slate-800/50 p-4"
            >
              <div className="mb-2 flex flex-wrap items-center gap-2">
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
                {relCount > 0 && (
                  <span className="text-xs text-cyan-400" title="このナレッジを参照する関係の数（根拠の提示に活用）">
                    関係 {relCount} 件
                  </span>
                )}
                {status !== "pending" && (
                  <span
                    className={`text-xs ${
                      status === "approved" ? "text-emerald-400" : status === "rejected" ? "text-rose-400" : "text-amber-400"
                    }`}
                  >
                    {status === "approved" && "✓ OK"}
                    {status === "rejected" && "✗ NG"}
                    {status === "modified" && "編集済み"}
                  </span>
                )}
              </div>

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
                      onClick={cancelEdit}
                      className="rounded bg-slate-600 px-3 py-1 text-xs text-slate-200 hover:bg-slate-500"
                    >
                      キャンセル
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <h3 className="font-medium text-slate-100">{k.title}</h3>
                  <p className="mt-1 text-sm text-slate-400 line-clamp-3">{k.content}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onReviewStatusChange(k.id, "approved")}
                      className="rounded bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-500"
                    >
                      OK
                    </button>
                    <button
                      type="button"
                      onClick={() => onReviewStatusChange(k.id, "rejected")}
                      className="rounded bg-rose-600 px-2 py-1 text-xs font-medium text-white hover:bg-rose-500"
                    >
                      NG
                    </button>
                    {onKnowledgeEdit && (
                      <button
                        type="button"
                        onClick={() => startEdit(k)}
                        className="rounded bg-amber-600 px-2 py-1 text-xs font-medium text-white hover:bg-amber-500"
                      >
                        微修正
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="rounded-xl border border-slate-600 bg-slate-800/60 p-6 text-center text-slate-400">
          該当するナレッジがありません
        </p>
      )}
    </div>
  );
}
