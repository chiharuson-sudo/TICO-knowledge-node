"use client";

interface StatsBarProps {
  nodeCount: number;
  edgeCount: number;
  maxDegree: number;
}

export function StatsBar({ nodeCount, edgeCount, maxDegree }: StatsBarProps) {
  return (
    <div className="flex items-center gap-4 rounded-lg bg-slate-800/80 px-4 py-2 text-sm">
      <span className="text-slate-400">
        ノード: <strong className="text-slate-200">{nodeCount}</strong>
      </span>
      <span className="text-slate-400">
        エッジ: <strong className="text-slate-200">{edgeCount}</strong>
      </span>
      <span className="text-slate-400">
        最大接続数: <strong className="text-slate-200">{maxDegree}</strong>
      </span>
    </div>
  );
}
