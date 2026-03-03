"use client";

import type { NodeWithDegree } from "@/lib/types";
import { VIEWPOINT_COLORS, DEFAULT_VIEWPOINT_COLOR } from "@/lib/colors";

interface HubRankingProps {
  nodes: NodeWithDegree[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function HubRanking({ nodes, selectedId, onSelect }: HubRankingProps) {
  const top5 = [...nodes]
    .sort((a, b) => b.degree - a.degree)
    .filter((n) => n.degree > 0)
    .slice(0, 5);

  if (top5.length === 0) {
    return (
      <div className="rounded-lg bg-slate-800/80 px-4 py-2 text-sm text-slate-400">
        Hub Top5 — 接続があるノードがありません
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-800/80 px-4 py-2">
      <span className="text-xs font-medium text-slate-400">Hub Top5</span>
      {top5.map((n, i) => {
        const color =
          VIEWPOINT_COLORS[n.viewpoint] ?? DEFAULT_VIEWPOINT_COLOR;
        const isSelected = selectedId === n.id;
        return (
          <button
            key={n.id}
            type="button"
            onClick={() => onSelect(n.id)}
            className={`flex items-center gap-2 rounded-full px-3 py-1 text-sm transition-all ${
              isSelected
                ? "ring-2 ring-cyan-400 ring-offset-2 ring-offset-slate-900"
                : "hover:bg-slate-700"
            }`}
          >
            <span
              className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-slate-900"
              style={{ background: color }}
            >
              {i + 1}
            </span>
            <span className="max-w-[160px] truncate text-slate-200">
              {n.title}
            </span>
            <span className="text-xs text-slate-500">({n.degree})</span>
          </button>
        );
      })}
    </div>
  );
}
