"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  MarkerType,
  useReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { KnowledgeNode } from "./KnowledgeNode";
import { KnowledgeEdge } from "./KnowledgeEdge";
import { runForceLayout } from "@/lib/force-layout";
import type { NodeWithDegree, FilteredEdge } from "@/lib/types";

const nodeTypes = { knowledge: KnowledgeNode };
const edgeTypes = { knowledge: KnowledgeEdge };

interface KnowledgeGraphProps {
  nodes: NodeWithDegree[];
  edges: FilteredEdge[];
  selectedId: string | null;
  onSelectNode: (id: string | null) => void;
  width: number;
  height: number;
}

function KnowledgeGraphInner({
  nodes: rawNodes,
  edges: rawEdges,
  selectedId,
  onSelectNode,
  width,
  height,
}: KnowledgeGraphProps) {

  const positions = useMemo(() => {
    return runForceLayout(
      rawNodes,
      rawEdges.map((e) => ({ from: e.from, to: e.to })),
      width,
      height
    );
  }, [rawNodes, rawEdges, width, height]);

  const initialNodes: Node[] = useMemo(
    () =>
      rawNodes.map((n: NodeWithDegree) => ({
        id: n.id,
        type: "knowledge",
        position: { x: 0, y: 0 },
        data: {
          title: n.title,
          viewpoint: n.viewpoint,
          degree: n.degree,
          radius: n.radius,
          fontSize: n.fontSize,
        },
      })),
    [rawNodes]
  );

  const initialEdges: Edge[] = useMemo(
    () =>
      rawEdges.map((e: FilteredEdge) => ({
        id: e.id ?? `${e.from}-${e.to}-${e.type}`,
        source: e.from,
        target: e.to,
        type: "knowledge",
        data: { type: e.type },
        markerEnd: { type: MarkerType.ArrowClosed },
      })),
    [rawEdges]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    const newNodes: Node[] = rawNodes.map((n: NodeWithDegree) => {
      const pos = positions.get(n.id) ?? { x: width / 2, y: height / 2 };
      return {
        id: n.id,
        type: "knowledge",
        position: pos,
        selected: selectedId === n.id,
        data: {
          title: n.title,
          viewpoint: n.viewpoint,
          degree: n.degree,
          radius: n.radius,
          fontSize: n.fontSize,
        },
      };
    });
    setNodes(newNodes);
    setEdges(
      rawEdges.map((e: FilteredEdge) => {
        const id = e.id ?? `${e.from}-${e.to}-${e.type}`;
        const connected =
          selectedId !== null &&
          (e.from === selectedId || e.to === selectedId);
        return {
          id,
          source: e.from,
          target: e.to,
          type: "knowledge",
          data: { type: e.type },
          markerEnd: { type: MarkerType.ArrowClosed },
          selected: connected,
        };
      })
    );
  }, [rawNodes, rawEdges, positions, width, height, selectedId, setNodes, setEdges]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onSelectNode(node.id);
    },
    [onSelectNode]
  );

  const onPaneClick = useCallback(() => {
    onSelectNode(null);
  }, [onSelectNode]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={onNodeClick}
      onPaneClick={onPaneClick}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      fitView
      fitViewOptions={{ padding: 0.2 }}
      minZoom={0.2}
      maxZoom={1.5}
      defaultViewport={{ x: 0, y: 0, zoom: 1 }}
      proOptions={{ hideAttribution: true }}
      className="bg-[#0a0e1a]"
    >
      <Background color="#1e293b" gap={16} />
      <Controls className="!bg-slate-800 !border-slate-700 !rounded-lg" />
      <MiniMap
        nodeColor={(n) => {
          const v = (n.data as { viewpoint?: string }).viewpoint;
          return (
            {
              "①判断ルール・分岐条件": "#2563eb",
              "②社内ルール・段取り": "#7c3aed",
              "③技術的注意点": "#d97706",
              "④設計思想・教訓": "#059669",
              "⑤絶対注意（ミス防止）": "#dc2626",
              "⑧再発防止・未然防止": "#db2777",
              "⑨影響範囲・波及リスク": "#0891b2",
            }[v ?? ""] ?? "#6b7280"
          );
        }}
        className="!bg-slate-800 !rounded-lg"
      />
    </ReactFlow>
  );
}

export function KnowledgeGraph(props: KnowledgeGraphProps) {
  return (
    <ReactFlowProvider>
      <KnowledgeGraphInner {...props} />
    </ReactFlowProvider>
  );
}
