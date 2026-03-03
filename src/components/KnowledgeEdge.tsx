"use client";

import {
  getBezierPath,
  EdgeLabelRenderer,
  BaseEdge,
  type EdgeProps,
} from "@xyflow/react";
import { RELATION_COLORS, DEFAULT_RELATION_COLOR } from "@/lib/colors";

export function KnowledgeEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
  markerEnd,
}: EdgeProps) {
  const type = (data?.type as string) || "前提";
  const color = RELATION_COLORS[type] ?? DEFAULT_RELATION_COLOR;

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: color,
          strokeWidth: selected ? 2.5 : 1.5,
          strokeOpacity: selected ? 1 : 0.85,
        }}
        markerEnd={markerEnd}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: "all",
            fontSize: 10,
            color,
            fontWeight: 600,
            background: "rgba(10, 14, 26, 0.9)",
            padding: "2px 6px",
            borderRadius: 4,
            border: `1px solid ${color}80`,
          }}
        >
          {type}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
