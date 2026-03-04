"use client";

import type { NodeWithDegree, FilteredEdge, Relation } from "@/lib/types";
import { VIEWPOINT_COLORS, RELATION_COLORS, DEFAULT_VIEWPOINT_COLOR } from "@/lib/colors";
import { edgeToSentence } from "@/lib/edge-verbalizer";

interface DetailPanelProps {
  node: NodeWithDegree | null;
  nodes: NodeWithDegree[];
  edges: FilteredEdge[];
  onSelectNode: (id: string) => void;
}

function RelatedList({
  node,
  edges,
  onSelectNode,
}: {
  node: NodeWithDegree;
  edges: FilteredEdge[];
  onSelectNode: (id: string) => void;
}) {
  const outgoing = edges.filter((e) => e.from === node.id);
  const incoming = edges.filter((e) => e.to === node.id);

  const renderItem = (e: Relation, direction: "out" | "in") => {
    const otherId = direction === "out" ? e.to : e.from;
    const color = RELATION_COLORS[e.type] ?? "#64748b";
    return (
      <button
        key={`${e.from}-${e.to}-${e.type}`}
        type="button"
        onClick={() => onSelectNode(otherId)}
        className="flex w-full items-start gap-2 rounded-lg border border-slate-700/80 bg-slate-800/50 p-2 text-left text-sm transition hover:border-slate-600"
      >
        <span
          className="shrink-0 rounded px-1.5 py-0.5 text-xs font-medium"
          style={{ background: color + "30", color }}
        >
          {e.type}
        </span>
        <span className="text-slate-400">
          {direction === "out" ? "→" : "←"} {otherId}
        </span>
        {e.description && (
          <span className="truncate text-slate-500">{e.description}</span>
        )}
      </button>
    );
  };

  return (
    <div className="space-y-3">
      {outgoing.length > 0 && (
        <div>
          <h4 className="mb-1 text-xs font-medium text-slate-400">
            出ていく関係（{outgoing.length}）
          </h4>
          <div className="space-y-1">
            {outgoing.map((e) => renderItem(e, "out"))}
          </div>
        </div>
      )}
      {incoming.length > 0 && (
        <div>
          <h4 className="mb-1 text-xs font-medium text-slate-400">
            入ってくる関係（{incoming.length}）
          </h4>
          <div className="space-y-1">
            {incoming.map((e) => renderItem(e, "in"))}
          </div>
        </div>
      )}
    </div>
  );
}

function EdgeVerbalizerBlock({
  node,
  nodes,
  edges,
}: {
  node: NodeWithDegree;
  nodes: NodeWithDegree[];
  edges: FilteredEdge[];
}) {
  const related = edges.filter((e) => e.from === node.id || e.to === node.id);
  const getTitle = (id: string) => nodes.find((n) => n.id === id)?.title ?? id;
  if (related.length === 0) {
    return <p className="text-xs text-slate-500">接続されているエッジはありません</p>;
  }
  return (
    <ul className="space-y-2 text-xs text-slate-300 leading-relaxed">
      {related.map((e) => (
        <li key={`${e.from}-${e.to}-${e.type}`} className="list-disc pl-4">
          {edgeToSentence(e, getTitle)}
        </li>
      ))}
    </ul>
  );
}

export function DetailPanel({
  node,
  nodes,
  edges,
  onSelectNode,
}: DetailPanelProps) {
  if (!node) {
    return (
      <aside className="flex w-80 shrink-0 flex-col overflow-hidden rounded-xl border border-slate-700/80 bg-slate-900/90 backdrop-blur">
        <div className="border-b border-slate-700/80 p-4">
          <h2 className="text-sm font-semibold text-slate-300">
            ノード詳細
          </h2>
        </div>
        <div className="flex flex-1 items-center justify-center p-6 text-slate-500">
          ノードをクリックすると詳細が表示されます
        </div>
      </aside>
    );
  }

  const viewpointColor =
    VIEWPOINT_COLORS[node.viewpoint] ?? DEFAULT_VIEWPOINT_COLOR;

  return (
    <aside className="flex w-80 shrink-0 flex-col overflow-hidden rounded-xl border border-slate-700/80 bg-slate-900/90 backdrop-blur">
      <div className="border-b border-slate-700/80 p-4">
        <h2 className="text-sm font-semibold text-slate-300">ノード詳細</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <span
            className="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium text-slate-900"
            style={{ background: viewpointColor }}
          >
            {node.viewpoint}
          </span>
          <h3 className="mt-2 text-base font-semibold text-slate-100">
            {node.title}
          </h3>
        </div>
        <p className="text-sm text-slate-400 leading-relaxed">
          {node.content}
        </p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-slate-500">製品</span>
            <p className="text-slate-300">{node.product}</p>
          </div>
          <div>
            <span className="text-slate-500">時間軸</span>
            <p className="text-slate-300">{node.timeline}</p>
          </div>
          <div>
            <span className="text-slate-500">業務フロー</span>
            <p className="text-slate-300">{node.flow}</p>
          </div>
          <div>
            <span className="text-slate-500">ドメイン</span>
            <p className="text-slate-300">{node.domain}</p>
          </div>
        </div>
        <div className="flex gap-4 text-xs text-slate-400">
          <span>接続数: <strong className="text-slate-300">{node.degree}</strong></span>
          <span>ノードサイズ: <strong className="text-slate-300">{Math.round(node.radius * 2)}px</strong></span>
        </div>
        <div>
          <h4 className="mb-2 text-xs font-medium text-slate-400">
            関連ナレッジ
          </h4>
          <RelatedList
            node={node}
            edges={edges}
            onSelectNode={onSelectNode}
          />
        </div>
        <div>
          <h4 className="mb-2 text-xs font-medium text-slate-400">
            つなぎ方（言語化）
          </h4>
          <EdgeVerbalizerBlock
            node={node}
            nodes={nodes}
            edges={edges}
          />
        </div>
      </div>
    </aside>
  );
}
