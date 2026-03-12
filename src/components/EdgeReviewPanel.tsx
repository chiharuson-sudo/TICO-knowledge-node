"use client";

import type React from "react";
import type { Knowledge } from "@/lib/types";
import type { ClassificationResult } from "@/lib/relation-classifier";
import type { AnalysisStats } from "./AiAnalysisTab";

export interface EdgeCandidate {
  fromId: string;
  toId: string;
  similarity: number;
  fromSource: string;
  toSource: string;
  isCrossMeeting?: boolean;
  classification: ClassificationResult;
}

interface EdgeReviewPanelProps {
  candidates: EdgeCandidate[];
  allNodes: Knowledge[];
  onApprove: (fromId: string, toId: string, type: string, desc: string, confidence?: number) => void;
  onReject: (fromId: string, toId: string) => void;
  onEdit?: (fromId: string, toId: string) => void;
  isLoading: boolean;
  analysisStats?: AnalysisStats | null;
  similarityThreshold?: number;
  confidenceThreshold?: number;
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
  analysisStats,
  similarityThreshold = 0.65,
  confidenceThreshold = 0.5,
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
    const noAnalysisYet = analysisStats === null;
    const noPairs = analysisStats && analysisStats.pairsAboveThreshold === 0;
    const noRelations = analysisStats && analysisStats.pairsAboveThreshold > 0 && analysisStats.relationsFound === 0;
    const sourceCount = new Set(allNodes.map((n) => n.source ?? "")).size;

    let message: React.ReactNode = "会議横断の関係候補はありません。閾値を下げるか、ナレッジを増やして再分析してください。";
    if (!noAnalysisYet) {
      if (noPairs) {
        message = (
          <span>
            {sourceCount <= 1 ? (
              <>
                現在のナレッジは会議（source）が <strong>1 種類だけ</strong>のため、会議横断ペアは 0 件です。
                会議横断の候補を出すには、<strong>データ取込</strong>で<strong>異なる会議（source）</strong>のナレッジを追加してください。
              </>
            ) : (
              <>
                類似度閾値（現在 <strong>{similarityThreshold}</strong>）以上の会議横断ペアが 0 件でした。
                会議は {sourceCount} 種類ありますが、類似度を上げるペアがありません。<strong>類似度閾値を下げて</strong>（例: 0.45）再分析してください。
              </>
            )}
          </span>
        );
      } else if (noRelations) {
        message = (
          <span>
            会議横断ペアは <strong>{analysisStats.pairsAboveThreshold} 件</strong>あり、そのうち <strong>{analysisStats.pairsSentToLLM} 件</strong>をLLMで判定しましたが、
            関係ありと判定された候補は 0 件でした。<strong>確信度閾値</strong>（現在 {confidenceThreshold}）を下げるか、
            <strong>最大ペア数</strong>を増やして再分析してください。
          </span>
        );
      }
    }

    return (
      <div className="rounded-xl border border-slate-600 bg-slate-800/60 p-6 text-center text-slate-400">
        <p className="mb-2">{message}</p>
        {analysisStats && (
          <p className="text-xs text-slate-500 mt-2">
            今回の結果: 類似度候補 {analysisStats.pairsAboveThreshold} 件 → LLM判定 {analysisStats.pairsSentToLLM} 件 → 関係あり {analysisStats.relationsFound} 件
            {allNodes.length > 0 && (
              <> ｜ 現在のナレッジ: 会議（source）<strong> {sourceCount} 種類</strong> / ノード {allNodes.length} 件</>
            )}
          </p>
        )}
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
              <div className="mb-1 flex flex-wrap items-center gap-2">
                {c.isCrossMeeting ? (
                  <span className="rounded bg-cyan-600/30 px-1.5 py-0.5 text-xs text-cyan-300">
                    🔗 会議横断
                  </span>
                ) : (
                  <span className="rounded bg-slate-600/30 px-1.5 py-0.5 text-xs text-slate-400">
                    📌 同一会議内
                  </span>
                )}
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
                  onClick={() => onApprove(fromId, toId, typeLabel, desc, cl.confidence)}
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
