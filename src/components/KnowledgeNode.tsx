"use client";

import { memo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { VIEWPOINT_COLORS, DEFAULT_VIEWPOINT_COLOR } from "@/lib/colors";

export interface KnowledgeNodeData extends Record<string, unknown> {
  title: string;
  viewpoint: string;
  degree: number;
  radius: number;
  fontSize: number;
}

export type KnowledgeNodeType = Node<KnowledgeNodeData, "knowledge">;

export const KnowledgeNode = memo(
  (props: NodeProps<KnowledgeNodeType>) => {
    const { data, selected } = props;
    const color =
      (data.viewpoint && VIEWPOINT_COLORS[data.viewpoint]) ||
      DEFAULT_VIEWPOINT_COLOR;
    const size = data.radius * 2;

    return (
      <div
        className="relative flex flex-col items-center"
        style={{ width: size, minHeight: size }}
      >
        {/* Glow for high-degree nodes */}
        {data.degree >= 3 && (
          <div
            className="absolute rounded-full"
            style={{
              inset: -8,
              background: color + "20",
            }}
          />
        )}
        {/* Node circle */}
        <div
          style={{
            width: size,
            height: size,
            borderRadius: "50%",
            background: color,
            border: selected
              ? "2px solid #fff"
              : `1px solid ${color}99`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            zIndex: 1,
          }}
        >
          {data.degree >= 2 && (
            <span
              style={{
                color: "#0f172a",
                fontSize: Math.round(data.radius * 0.7),
                fontWeight: 800,
              }}
            >
              {data.degree}
            </span>
          )}
        </div>
        {/* Label */}
        <div
          style={{
            position: "absolute",
            bottom: -size / 2 - 20,
            left: "50%",
            transform: "translateX(-50%)",
            whiteSpace: "nowrap",
            fontSize: data.fontSize,
            fontWeight: selected ? 700 : 400,
            color: selected ? "#f1f5f9" : "#94a3b8",
            pointerEvents: "none",
            maxWidth: 140,
            overflow: "hidden",
            textOverflow: "ellipsis",
            textAlign: "center",
          }}
        >
          {data.title.length > 22 ? data.title.slice(0, 22) + "..." : data.title}
        </div>
        <Handle
          type="source"
          position={Position.Right}
          style={{ opacity: 0 }}
        />
        <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      </div>
    );
  }
);

KnowledgeNode.displayName = "KnowledgeNode";
