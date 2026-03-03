"use client";

import {
  getSmoothStepPath,
  getBezierPath,
  EdgeLabelRenderer,
  BaseEdge,
  type EdgeProps,
} from "@xyflow/react";
import { RELATION_COLORS, DEFAULT_RELATION_COLOR } from "@/lib/colors";

const BORDER_RADIUS = 16;

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
  const curvature = (data?.curvature as number) ?? 0.25;
  const useSmoothStep = (data?.useSmoothStep as boolean) ?? true;
  const color = RELATION_COLORS[type] ?? DEFAULT_RELATION_COLOR;

  const [edgePath, labelX, labelY] = useSmoothStep
    ? getSmoothStepPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
        borderRadius: BORDER_RADIUS,
        offset: 24,
      })
    : getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
        curvature,
      });

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: color,
          strokeWidth: selected ? 3 : 2,
          strokeOpacity: selected ? 1 : 0.9,
        }}
        markerEnd={markerEnd}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: "all",
            fontSize: 11,
            color: "#e2e8f0",
            fontWeight: 700,
            background: "rgba(15, 23, 42, 0.95)",
            padding: "4px 8px",
            borderRadius: 6,
            border: `2px solid ${color}`,
            boxShadow: "0 1px 3px rgba(0,0,0,0.4)",
          }}
        >
          {type}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
