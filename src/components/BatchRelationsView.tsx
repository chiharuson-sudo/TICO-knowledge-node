"use client";

import { useMemo, useState } from "react";
import type { Knowledge, Relation } from "@/lib/types";
import type { RelationType } from "@/lib/types";
import { RelationCard, type RelationWithNodes } from "./RelationCard";
import { CONFIDENCE_SILENT_APPROVE } from "@/lib/relation-constants";

interface BatchRelationsViewProps {
  nodes: Knowledge[];
  edges: Relation[];
  onRelationApprove?: (from: string, to: string) => void;
  onRelationReject?: (from: string, to: string) => void;
  onRelationChangeType?: (from: string, to: string, newType: RelationType) => void;
}

/** 確信度が低い・要確認を先頭に */
function sortByNeedReview(edges: Relation[]): Relation[] {
  return [...edges].sort((a, b) => {
    const confA = a.confidence_score ?? 0;
    const confB = b.confidence_score ?? 0;
    const needA = confA < CONFIDENCE_SILENT_APPROVE && (a.status === "pending" || !a.status) ? 1 : 0;
    const needB = confB < CONFIDENCE_SILENT_APPROVE && (b.status === "pending" || !b.status) ? 1 : 0;
    if (needA !== needB) return needB - needA;
    return confA - confB;
  });
}

export function BatchRelationsView({
  nodes,
  edges,
  onRelationApprove,
  onRelationReject,
  onRelationChangeType,
}: BatchRelationsViewProps) {
  const nodeMap = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const withNodes: RelationWithNodes[] = useMemo(
    () =>
      edges.map((e) => ({
        ...e,
        fromTitle: nodeMap.get(e.from)?.title,
        toTitle: nodeMap.get(e.to)?.title,
      })),
    [edges, nodeMap]
  );
  const sorted = useMemo(() => sortByNeedReview(withNodes), [withNodes]);
  const needReviewList = useMemo(
    () =>
      sorted.filter((e) => {
        const conf = e.confidence_score ?? 0;
        return conf < CONFIDENCE_SILENT_APPROVE && (e.status === "pending" || !e.status);
      }),
    [sorted]
  );
  const otherList = useMemo(
    () =>
      sorted.filter((e) => {
        const conf = e.confidence_score ?? 0;
        const isPending = e.status === "pending" || !e.status;
        return !(conf < CONFIDENCE_SILENT_APPROVE && isPending);
      }),
    [sorted]
  );
  const silentPendingCount = useMemo(
    () =>
      edges.filter(
        (e) =>
          (e.confidence_score ?? 0) >= CONFIDENCE_SILENT_APPROVE &&
          (e.status === "pending" || !e.status) &&
          e.auto_approve_at
      ).length,
    [edges]
  );

  const renderCards = (list: RelationWithNodes[]) =>
    list.map((edge) => (
      <RelationCard
        key={`${edge.from}-${edge.to}`}
        edge={edge}
        compact={false}
        onApprove={onRelationApprove}
        onReject={onRelationReject}
        onChangeType={onRelationChangeType}
      />
    ));

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-6">
      <h2 className="text-lg font-semibold text-slate-100">広域関係性ビュー</h2>
      <p className="text-sm text-slate-400">
        共通・時間軸・製品・顧客で横断したナレッジ間の関係性。推論根拠（エビデンス）と確信度を表示。要確認を優先表示し、その他もすべて表示します。
      </p>

      <div className="flex flex-wrap items-center gap-3">
        {needReviewList.length > 0 && (
          <span className="rounded bg-amber-900/40 px-2 py-1 text-xs text-amber-200">
            要確認（優先） {needReviewList.length} 件
          </span>
        )}
        {silentPendingCount > 0 && (
          <span className="rounded bg-cyan-900/40 px-2 py-1 text-xs text-cyan-200">
            サイレント承認待ち {silentPendingCount} 件
          </span>
        )}
        <span className="text-xs text-slate-500">合計 {edges.length} 件</span>
      </div>

      {needReviewList.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-medium text-amber-200">要確認（AIが迷っている箇所・優先して確認）</h3>
          <div className="space-y-3">{renderCards(needReviewList)}</div>
        </div>
      )}

      <div>
        <h3 className="mb-2 text-sm font-medium text-slate-300">
          その他（サイレント承認待ち・承認済み・却下等）
        </h3>
        {otherList.length === 0 ? (
          <p className="rounded-lg border border-slate-600 bg-slate-800/50 p-4 text-center text-slate-500 text-sm">
            要確認以外の関係性はありません
          </p>
        ) : (
          <div className="space-y-3">{renderCards(otherList)}</div>
        )}
      </div>

      {/* FMEA連携: 対策タイプを具体的な手順として表示 */}
      {(() => {
        const taisakuEdges = edges.filter((e) => e.type === "対策" && (e.status === "approved" || e.status === "silent_approved" || e.status === "changed"));
        if (taisakuEdges.length === 0) return null;
        return (
          <div className="mt-8 rounded-xl border border-slate-600 bg-slate-800/60 p-4">
            <h3 className="mb-2 text-sm font-semibold text-slate-200">FMEA 対策欄マッピング（承認済み）</h3>
            <p className="mb-3 text-xs text-slate-400">
              「XXの条件においてYYを実施する」形式の具体的な手順
            </p>
            <ul className="list-inside list-disc space-y-1 text-sm text-slate-300">
              {taisakuEdges.map((e) => {
                const fromTitle = nodeMap.get(e.from)?.title ?? e.from;
                const toTitle = nodeMap.get(e.to)?.title ?? e.to;
                const ev = e.evidence_text || e.description || "";
                const line = ev ? `${fromTitle}の条件において、${toTitle}を実施する。根拠: ${ev}` : `${fromTitle}の条件において、${toTitle}を実施する。`;
                return <li key={`${e.from}-${e.to}`}>{line}</li>;
              })}
            </ul>
          </div>
        );
      })()}
    </div>
  );
}
