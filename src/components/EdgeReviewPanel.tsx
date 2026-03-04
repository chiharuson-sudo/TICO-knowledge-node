"use client";

import type { Knowledge } from "@/lib/types";
import type { ClassificationResult } from "@/lib/relation-classifier";

export interface EdgeCandidate {
  fromId: string;
  toId: string;
  similarity: number;
  fromSource: string;
  toSource: string;
  classification: ClassificationResult;
}

interface EdgeReviewPanelProps {
  candidates: EdgeCandidate[];
  allNodes: Knowledge[];
  onApprove: (fromId: string, toId: string, type: string, desc: string) => void;
  onReject: (fromId: string, toId: string) => void;
  onEdit?: (fromId: string, toId: string) => void;
  isLoading: boolean;
}

function stars(similarity: number): string {
  if (similarity >= 0.85) return "★★★★★";
  if (similarity >= 0.78) return "★★★★";
  if (similarity >= 0.72) return "★★★";
  return "★★";
}

export function EdgeReviewPanel({
  candidates,
  allNodes,
  onApprove,
  onReject,
  onEdit,
  isLoading,
}: EdgeReviewPanelProps) {
  const nodeMap = new Map(allNodes.map((n) => [n.id, n]));

  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-600 bg-slate-800/60 p-6 text-center text-slate-400">
        Embedding・類似度計算・LLM分類を実行中…
      </div>
    );
  }

  if (candidates.length === 0) {
    return (
      <div className="rounded-xl border border-slate-600 bg-slate-800/60 p-6 text-center text-slate-400">
        会議横断の関係候補はありません。閾値を下げるか、ナレッジを増やして再分析してください。
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-slate-200">
        AI推定エッジ候補 ({candidates.length}件)
      </h3>
      <div className="space-y-3">
        {candidates.map((c) => {
          const fromNode = nodeMap.get(c.fromId);
          const toNode = nodeMap.get(c.toId);
          const cl = c.classification;
          const typeLabel = cl.type ?? "—";
          const direction = cl.direction === "A_to_B" ? "A→B" : cl.direction === "B_to_A" ? "B→A" : "—";
          const [fromId, toId] =
            cl.direction === "B_to_A"
              ? [c.toId, c.fromId]
              : [c.fromId, c.toId];
          const desc = cl.reason || "";

          return (
            <div
              key={`${c.fromId}-${c.toId}`}
              className="rounded-lg border border-slate-600 bg-slate-800/50 p-4"
            >
              <div className="mb-1 flex items-center gap-2">
                <span className="text-xs text-cyan-400">
                  [類似度 {c.similarity.toFixed(2)}] {stars(c.similarity)}
                </span>
              </div>
              <div className="text-sm text-slate-300">
                <div className="font-medium">
                  {fromNode?.title ?? c.fromId} ({fromNode?.source ?? c.fromSource})
                </div>
                <div className="my-1 text-slate-500">
                  ↓ [{typeLabel}] {direction} confidence: {cl.confidence.toFixed(2)}
                </div>
                <div className="font-medium">
                  {toNode?.title ?? c.toId} ({toNode?.source ?? c.toSource})
                </div>
                {cl.reason && (
                  <p className="mt-2 text-xs text-slate-400">理由: {cl.reason}</p>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onApprove(fromId, toId, typeLabel, desc)}
                  className="rounded bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-500"
                >
                  承認
                </button>
                <button
                  type="button"
                  onClick={() => onReject(c.fromId, c.toId)}
                  className="rounded bg-slate-600 px-2 py-1 text-xs font-medium text-slate-200 hover:bg-slate-500"
                >
                  却下
                </button>
                {onEdit && (
                  <button
                    type="button"
                    onClick={() => onEdit(c.fromId, c.toId)}
                    className="rounded bg-slate-600 px-2 py-1 text-xs font-medium text-slate-200 hover:bg-slate-500"
                  >
                    編集
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
