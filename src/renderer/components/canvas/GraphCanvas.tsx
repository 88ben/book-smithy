import React, { useCallback, useState, useEffect, useRef, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  BaseEdge,
  EdgeLabelRenderer,
  useInternalNode,
  applyNodeChanges,
  applyEdgeChanges,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type NodeProps,
  type EdgeProps,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

export type NodePositions = Record<string, { x: number; y: number }>;

export interface GraphNode {
  id: string;
  label: string;
  color: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  label: string;
}

interface GraphCanvasProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  nodePositions: NodePositions;
  onNodePositionsChange: (positions: NodePositions) => void;
}

const NODE_RADIUS = 16;

function computeForceLayout(
  graphNodes: GraphNode[],
  graphEdges: GraphEdge[],
): NodePositions {
  const n = graphNodes.length;
  if (n === 0) return {};
  if (n === 1) return { [graphNodes[0].id]: { x: 300, y: 250 } };

  const adj = new Map<string, Set<string>>();
  for (const gn of graphNodes) adj.set(gn.id, new Set());
  for (const ge of graphEdges) {
    adj.get(ge.source)?.add(ge.target);
    adj.get(ge.target)?.add(ge.source);
  }

  type Particle = { x: number; y: number; vx: number; vy: number };
  const ps: Record<string, Particle> = {};
  const cx = 300;
  const cy = 250;
  const initRadius = Math.max(100, n * 30);

  graphNodes.forEach((gn, i) => {
    const a = (2 * Math.PI * i) / n - Math.PI / 2;
    ps[gn.id] = {
      x: cx + initRadius * Math.cos(a),
      y: cy + initRadius * Math.sin(a),
      vx: 0,
      vy: 0,
    };
  });

  const ids = graphNodes.map((gn) => gn.id);
  const REPULSION = 5000;
  const SPRING = 0.005;
  const IDEAL_LEN = 120;
  const CENTER = 0.01;
  const DAMPING = 0.9;
  const ITERS = 200;

  for (let iter = 0; iter < ITERS; iter++) {
    const t = 1 - iter / ITERS;

    for (let i = 0; i < ids.length; i++) {
      let fx = 0;
      let fy = 0;
      const a = ps[ids[i]];

      for (let j = 0; j < ids.length; j++) {
        if (i === j) continue;
        const b = ps[ids[j]];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const d = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
        const f = REPULSION / (d * d);
        fx += (dx / d) * f;
        fy += (dy / d) * f;
      }

      for (const nid of adj.get(ids[i]) || []) {
        if (!ps[nid]) continue;
        const dx = ps[nid].x - a.x;
        const dy = ps[nid].y - a.y;
        const d = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
        const displacement = d - IDEAL_LEN;
        fx += (dx / d) * displacement * SPRING;
        fy += (dy / d) * displacement * SPRING;
      }

      fx += (cx - a.x) * CENTER;
      fy += (cy - a.y) * CENTER;

      a.vx = (a.vx + fx) * DAMPING * t;
      a.vy = (a.vy + fy) * DAMPING * t;
    }

    for (const id of ids) {
      ps[id].x += ps[id].vx;
      ps[id].y += ps[id].vy;
    }
  }

  const result: NodePositions = {};
  for (const id of ids) {
    result[id] = { x: ps[id].x, y: ps[id].y };
  }
  return result;
}

function CircleNode({ data, selected }: NodeProps) {
  const { label, color } = data as { label: string; color: string };

  return (
    <div
      style={{
        width: NODE_RADIUS * 2,
        height: NODE_RADIUS * 2,
        position: 'relative',
      }}
    >
      <Handle
        type="source"
        position={Position.Top}
        style={{ opacity: 0, pointerEvents: 'none' }}
      />
      <Handle
        type="target"
        position={Position.Bottom}
        style={{ opacity: 0, pointerEvents: 'none' }}
      />

      <div
        style={{
          width: NODE_RADIUS * 2,
          height: NODE_RADIUS * 2,
          borderRadius: '50%',
          backgroundColor: color,
          boxShadow: selected ? `0 0 16px ${color}80` : `0 0 8px ${color}40`,
          transform: selected ? 'scale(1.15)' : 'scale(1)',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          cursor: 'grab',
        }}
      />

      <div
        style={{
          position: 'absolute',
          top: NODE_RADIUS * 2 + 6,
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: 11,
          color: '#d4d4d8',
          fontWeight: 500,
          whiteSpace: 'nowrap',
          userSelect: 'none',
          textAlign: 'center',
        }}
      >
        {label}
      </div>
    </div>
  );
}

const nodeTypes = { circle: CircleNode };

function StraightFloatingEdge({ source, target, data, style }: EdgeProps) {
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);

  if (!sourceNode || !targetNode) return null;

  const sw = sourceNode.measured?.width ?? NODE_RADIUS * 2;
  const tw = targetNode.measured?.width ?? NODE_RADIUS * 2;

  const sx = sourceNode.internals.positionAbsolute.x + sw / 2;
  const sy = sourceNode.internals.positionAbsolute.y + NODE_RADIUS;
  const tx = targetNode.internals.positionAbsolute.x + tw / 2;
  const ty = targetNode.internals.positionAbsolute.y + NODE_RADIUS;

  const dx = tx - sx;
  const dy = ty - sy;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < 1) return null;

  const startX = sx + (dx / dist) * NODE_RADIUS;
  const startY = sy + (dy / dist) * NODE_RADIUS;
  const endX = tx - (dx / dist) * NODE_RADIUS;
  const endY = ty - (dy / dist) * NODE_RADIUS;

  const path = `M ${startX} ${startY} L ${endX} ${endY}`;
  const midX = (startX + endX) / 2;
  const midY = (startY + endY) / 2;

  const { label } = (data ?? {}) as { label?: string };

  return (
    <>
      <BaseEdge path={path} style={{ ...(style as React.CSSProperties), strokeWidth: 2 }} />
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${midX}px,${midY}px)`,
              fontSize: 10,
              color: '#a1a1aa',
              backgroundColor: 'rgba(24, 24, 27, 0.85)',
              padding: '2px 8px',
              borderRadius: 4,
              pointerEvents: 'none',
            }}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

const edgeTypes = { straight: StraightFloatingEdge };

export function GraphCanvas({
  nodes: graphNodes,
  edges: graphEdges,
  nodePositions,
  onNodePositionsChange,
}: GraphCanvasProps) {
  const positionsRef = useRef<NodePositions>(nodePositions);

  useEffect(() => {
    positionsRef.current = nodePositions;
  }, [nodePositions]);

  const forcePositions = useMemo(
    () => computeForceLayout(graphNodes, graphEdges),
    [graphNodes, graphEdges],
  );

  function getPosition(nodeId: string): { x: number; y: number } {
    return positionsRef.current[nodeId] || forcePositions[nodeId] || { x: 300, y: 250 };
  }

  function buildNodes(prevNodes?: Node[]): Node[] {
    const prevPositions: NodePositions = {};
    if (prevNodes) {
      for (const n of prevNodes) prevPositions[n.id] = n.position;
    }

    return graphNodes.map((gn) => ({
      id: gn.id,
      type: 'circle' as const,
      position: prevPositions[gn.id] || getPosition(gn.id),
      data: { label: gn.label, color: gn.color },
    }));
  }

  function buildEdges(): Edge[] {
    return graphEdges.map((ge) => ({
      id: `e-${ge.source}-${ge.target}`,
      source: ge.source,
      target: ge.target,
      type: 'straight' as const,
      data: { label: ge.label },
      style: { stroke: '#52525b' },
    }));
  }

  const [nodes, setNodes] = useState<Node[]>(() => buildNodes());
  const [edges, setEdges] = useState<Edge[]>(() => buildEdges());

  useEffect(() => {
    setEdges(buildEdges());
  }, [graphEdges]);

  useEffect(() => {
    setNodes((prev) => buildNodes(prev));
  }, [graphNodes]);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((nds) => applyNodeChanges(changes, nds));
  }, []);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((eds) => applyEdgeChanges(changes, eds));
  }, []);

  const onNodeDragStop = useCallback(
    (_: React.MouseEvent, node: Node) => {
      positionsRef.current = { ...positionsRef.current, [node.id]: node.position };
      onNodePositionsChange(positionsRef.current);
    },
    [onNodePositionsChange],
  );

  return (
    <div className="h-full rounded-xl border border-zinc-800/50 overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        nodesConnectable={false}
        elementsSelectable={false}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        className="bg-zinc-950"
      >
        <Background variant={BackgroundVariant.Dots} color="#27272a" gap={20} />
        <Controls
          className="!bg-zinc-800 !border-zinc-700 !rounded-lg [&>button]:!bg-zinc-800 [&>button]:!border-zinc-700 [&>button]:!text-zinc-400 [&>button:hover]:!bg-zinc-700"
        />
      </ReactFlow>
    </div>
  );
}
