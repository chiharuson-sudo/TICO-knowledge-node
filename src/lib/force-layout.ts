import type { NodeWithDegree } from "./types";

export interface LayoutNode {
  id: string;
  x: number;
  y: number;
  degree: number;
  radius: number;
}

export interface LayoutEdge {
  from: string;
  to: string;
}

const REPULSION_BASE = 3000;
const REPULSION_PER_DEGREE = 800;
const ATTRACTION = 0.01;
const DAMPING = 0.85;
const MIN_DISTANCE = 80;
const MAX_ITERATIONS = 200;

/**
 * Force-directed layout: 高 degree ノードの反発力を強くしてスペース確保
 */
export function runForceLayout(
  nodes: NodeWithDegree[],
  edges: { from: string; to: string }[],
  width: number,
  height: number
): Map<string, { x: number; y: number }> {
  const nodeMap = new Map<string, LayoutNode>();
  const positions = new Map<string, { x: number; y: number }>();

  nodes.forEach((n, i) => {
    const angle = (2 * Math.PI * i) / Math.max(1, nodes.length);
    const r = Math.min(width, height) * 0.3;
    const x = width / 2 + r * Math.cos(angle);
    const y = height / 2 + r * Math.sin(angle);
    nodeMap.set(n.id, {
      id: n.id,
      x,
      y,
      degree: n.degree,
      radius: n.radius,
    });
    positions.set(n.id, { x, y });
  });

  const nodeList = Array.from(nodeMap.values());

  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    const forces = new Map<string, { fx: number; fy: number }>();
    nodeList.forEach((n) => forces.set(n.id, { fx: 0, fy: 0 }));

    for (let i = 0; i < nodeList.length; i++) {
      const a = nodeList[i];
      const posA = positions.get(a.id)!;
      for (let j = i + 1; j < nodeList.length; j++) {
        const b = nodeList[j];
        const posB = positions.get(b.id)!;
        const dx = posA.x - posB.x;
        const dy = posA.y - posB.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
        const repulsionA =
          REPULSION_BASE + a.degree * REPULSION_PER_DEGREE;
        const repulsionB =
          REPULSION_BASE + b.degree * REPULSION_PER_DEGREE;
        const rep = ((repulsionA + repulsionB) / 2) / (dist * dist);
        const fx = (dx / dist) * rep;
        const fy = (dy / dist) * rep;
        const fa = forces.get(a.id)!;
        const fb = forces.get(b.id)!;
        fa.fx += fx;
        fa.fy += fy;
        fb.fx -= fx;
        fb.fy -= fy;
      }
    }

    edges.forEach((e) => {
      const posFrom = positions.get(e.from);
      const posTo = positions.get(e.to);
      if (!posFrom || !posTo) return;
      const dx = posTo.x - posFrom.x;
      const dy = posTo.y - posFrom.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
      const force = ATTRACTION * Math.max(0, dist - MIN_DISTANCE);
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      const fFrom = forces.get(e.from)!;
      const fTo = forces.get(e.to)!;
      if (fFrom) {
        fFrom.fx += fx;
        fFrom.fy += fy;
      }
      if (fTo) {
        fTo.fx -= fx;
        fTo.fy -= fy;
      }
    });

    nodeList.forEach((n) => {
      const pos = positions.get(n.id)!;
      const f = forces.get(n.id)!;
      let x = pos.x + f.fx * DAMPING;
      let y = pos.y + f.fy * DAMPING;
      const margin = n.radius + 20;
      x = Math.max(margin, Math.min(width - margin, x));
      y = Math.max(margin, Math.min(height - margin, y));
      positions.set(n.id, { x, y });
    });
  }

  return positions;
}
