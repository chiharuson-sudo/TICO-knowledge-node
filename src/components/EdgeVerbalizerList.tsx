"use client";

import { useState } from "react";
import type { NodeWithDegree, FilteredEdge } from "@/lib/types";
import { edgesToSentences } from "@/lib/edge-verbalizer";

interface EdgeVerbalizerListProps {
  nodes: NodeWithDegree[];
  edges: FilteredEdge[];
}

export function EdgeVerbalizerList({ nodes, edges }: EdgeVerbalizerListProps) {
  const [open, setOpen] = useState(false);
  const getTitle = (id: string) => nodes.find((n) => n.id === id)?.title ?? id;
  const sentences = edgesToSentences(edges, getTitle);

  if (edges.length === 0) return null;

  return (
    <div className="rounded-lg border border-slate-700/80 bg-slate-800/60">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-2 text-left text-sm font-medium text-slate-300 hover:bg-slate-700/50"
      >
        <span>エッジのつなぎ方（{edges.length}件・言語化）</span>
        <span className="text-slate-500">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="max-h-48 overflow-y-auto border-t border-slate-700/80 px-4 py-2">
          <ul className="space-y-1.5 text-xs text-slate-300 leading-relaxed">
            {sentences.map((s, i) => (
              <li key={i} className="list-disc pl-4">
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
