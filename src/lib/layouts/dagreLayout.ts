import dagre from 'dagre';
import { MapMindNode, MapMindEdge, LayoutDensity } from '@/types/graph';

export interface DagreLayoutOptions {
  direction?: 'TB' | 'LR' | 'BT' | 'RL';
  density?: LayoutDensity;
  nodeWidth?: number;
  nodeHeight?: number;
  rankSep?: number;
  nodeSep?: number;
}

const DENSITY_CONFIGS: Record<
  LayoutDensity,
  { rankSep: number; nodeSep: number; margin: number }
> = {
  compact: { rankSep: 45, nodeSep: 22, margin: 20 },
  balanced: { rankSep: 65, nodeSep: 38, margin: 30 },
  spacious: { rankSep: 90, nodeSep: 55, margin: 40 },
};

/**
 * Calculates hierarchical layout coordinates using Dagre.
 * Supports Top-to-Bottom (TB) and Left-to-Right (LR) hierarchies.
 */
export function getDagreLayout(
  nodes: MapMindNode[],
  edges: MapMindEdge[],
  options: DagreLayoutOptions = {}
): { nodes: MapMindNode[]; edges: MapMindEdge[] } {
  const {
    direction = 'TB',
    density = 'compact',
    nodeWidth = 190,
    nodeHeight = 72,
    rankSep = DENSITY_CONFIGS[density].rankSep,
    nodeSep = DENSITY_CONFIGS[density].nodeSep,
  } = options;

  const margin = DENSITY_CONFIGS[density].margin;

  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  dagreGraph.setGraph({
    rankdir: direction,
    ranksep: rankSep,
    nodesep: nodeSep,
    marginx: margin,
    marginy: margin,
  });

  // Filter out hidden nodes so they don't distort the visible layout
  const visibleNodes = nodes.filter((n) => !n.data?.hidden);
  const visibleNodeIds = new Set(visibleNodes.map((n) => n.id));
  const visibleEdges = edges.filter(
    (e) => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target)
  );

  // Add nodes to dagre
  visibleNodes.forEach((node) => {
    const w = node.measured?.width || (node.width as number) || nodeWidth;
    const h = node.measured?.height || (node.height as number) || nodeHeight;
    dagreGraph.setNode(node.id, { width: w, height: h });
  });

  // Add edges to dagre
  visibleEdges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  // Execute Dagre layout calculation
  dagre.layout(dagreGraph);

  // Map calculated coordinates back to React Flow nodes
  const layoutedNodes = nodes.map((node) => {
    if (!visibleNodeIds.has(node.id)) {
      return node;
    }

    const nodeWithPosition = dagreGraph.node(node.id);
    const w = node.measured?.width || (node.width as number) || nodeWidth;
    const h = node.measured?.height || (node.height as number) || nodeHeight;

    return {
      ...node,
      position: {
        // Dagre uses center point, React Flow uses top-left point
        x: nodeWithPosition.x - w / 2,
        y: nodeWithPosition.y - h / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}
