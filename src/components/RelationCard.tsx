"use client";

import type { Relation, RelationType } from "@/lib/types";
import { RELATION_COLORS } from "@/lib/colors";
import { CONFIDENCE_SILENT_APPROVE } from "@/lib/relation-constants";

export interface RelationWithNodes extends Relation {
  fromTitle?: string;
  toTitle?: string;
}

interface RelationCardProps {
  edge: RelationWithNodes;
  /** 簡易モード: ボタンなし（表示のみ） */
  compact?: boolean;
  onApprove?: (from: string, to: string) => void;
  onReject?: (from: string, to: string) => void;
  onChangeType?: (from: string, to: string, newType: RelationType) => void;
  onLogFeedback?: (action: "approved" | "rejected" | "changed", payload: { from: string; to: string; newType?: RelationType; reason?: string }) => void;
}

function daysUntil(iso: string): number {
  const d = new Date(iso);
  const now = new Date();
  return Math.max(0, Math.ceil((d.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));
}

export function RelationCard({
  edge,
  compact = false,
  onApprove,
  onReject,
  onChangeType,
  onLogFeedback,
}: RelationCardProps) {
  const evidence = edge.evidence_text || edge.description || "—";
  const confidence = edge.confidence_score ?? 0;
  const status = edge.status ?? "pending";
  const isSilentPending =
    status === "pending" &&
    confidence >= CONFIDENCE_SILENT_APPROVE &&
    edge.auto_approve_at;
  const daysLeft = edge.auto_approve_at ? daysUntil(edge.auto_approve_at) : 0;
  const color = RELATION_COLORS[edge.type] ?? "#64748b";

  return (
    <div
      className="rounded-lg border border-slate-600 bg-slate-800/50 p-3 text-sm"
      title="関係性を定義することで、FMEAのS値（影響度）の根拠が確定します"
    >
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <span
          className="rounded px-1.5 py-0.5 text-xs font-medium"
          style={{ background: color + "30", color }}
        >
          {edge.type}
        </span>
        {confidence > 0 && (
          <span className="text-xs text-slate-400">
            確信度 {(confidence * 100).toFixed(0)}%
          </span>
        )}
        {status !== "pending" && status !== "silent_approved" && (
          <span className="text-xs text-slate-500">
            {status === "approved" && "✓ 承認済み"}
            {status === "rejected" && "✗ 却下"}
            {status === "changed" && "編集済み"}
          </span>
        )}
        {status === "silent_approved" && (
          <span className="text-xs text-cyan-400">サイレント承認済み</span>
        )}
      </div>

      <div className="text-slate-300">
        <span className="font-medium">{edge.fromTitle || edge.from}</span>
        <span className="mx-1 text-slate-500">→</span>
        <span className="font-medium">{edge.toTitle || edge.to}</span>
      </div>

      <p className="mt-1.5 text-xs text-slate-400 leading-relaxed" title="推論根拠（エビデンス）">
        📌 {evidence}
      </p>

      {isSilentPending && (
        <div className="mt-2 rounded bg-cyan-900/30 px-2 py-1.5">
          <p className="text-xs text-cyan-200">
            自動承認まであと <strong>{daysLeft} 日</strong>
          </p>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-700">
            <div
              className="h-full rounded-full bg-cyan-500 transition-all"
              style={{
                width: `${Math.max(0, Math.min(100, 100 - (daysLeft / 7) * 100))}%`,
              }}
            />
          </div>
        </div>
      )}

      {!compact && (onApprove || onReject || onChangeType) && status === "pending" && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {onApprove && (
            <button
              type="button"
              onClick={() => {
                onApprove(edge.from, edge.to);
                onLogFeedback?.("approved", { from: edge.from, to: edge.to });
              }}
              className="rounded bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-500"
            >
              OK
            </button>
          )}
          {onReject && (
            <button
              type="button"
              onClick={() => {
                onReject(edge.from, edge.to);
                onLogFeedback?.("rejected", { from: edge.from, to: edge.to });
              }}
              className="rounded bg-rose-600 px-2 py-1 text-xs font-medium text-white hover:bg-rose-500"
            >
              NG
            </button>
          )}
          {onChangeType && (
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <span>変更:</span>
              {(["前提", "因果", "対策", "波及"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    onChangeType(edge.from, edge.to, t);
                    onLogFeedback?.("changed", { from: edge.from, to: edge.to, newType: t });
                  }}
                  className={`rounded px-1.5 py-0.5 text-xs ${t === edge.type ? "ring-1 ring-cyan-400" : ""}`}
                  style={{ background: RELATION_COLORS[t] + "20", color: RELATION_COLORS[t] }}
                >
                  {t}
                </button>
              ))}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
