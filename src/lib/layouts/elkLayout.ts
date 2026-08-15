import ELK, { ElkNode, ElkExtendedEdge } from 'elkjs/lib/elk.bundled.js';
import { MapMindNode, MapMindEdge } from '@/types/graph';

const elk = new ELK();

export interface ElkLayoutOptions {
  nodeWidth?: number;
  nodeHeight?: number;
  spacing?: number;
}

/**
 * Helper to find all descendants of a given node in the graph
 */
function getSubtreeNodesAndEdges(
  rootId: string,
  allNodes: MapMindNode[],
  allEdges: MapMindEdge[]
): { subtreeNodes: MapMindNode[]; subtreeEdges: MapMindEdge[] } {
  const visited = new Set<string>([rootId]);
  const queue = [rootId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const outgoing = allEdges.filter((e) => e.source === current);
    for (const edge of outgoing) {
      if (!visited.has(edge.target)) {
        visited.add(edge.target);
        queue.push(edge.target);
      }
    }
  }

  const subtreeNodes = allNodes.filter((n) => visited.has(n.id));
  const subtreeEdges = allEdges.filter(
    (e) => visited.has(e.source) && visited.has(e.target)
  );

  return { subtreeNodes, subtreeEdges };
}

/**
 * Calculates a balanced mind map layout (branching evenly left and right from a central root node).
 * Partitions direct child branches into left and right groups, layouts them with ELK,
 * and centers them around the root node.
 */
export async function getElkLayout(
  nodes: MapMindNode[],
  edges: MapMindEdge[],
  options: ElkLayoutOptions = {}
): Promise<{ nodes: MapMindNode[]; edges: MapMindEdge[] }> {
  const { nodeWidth = 220, nodeHeight = 85, spacing = 60 } = options;

  const visibleNodes = nodes.filter((n) => !n.data?.hidden);
  const visibleNodeIds = new Set(visibleNodes.map((n) => n.id));
  const visibleEdges = edges.filter(
    (e) => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target)
  );

  if (visibleNodes.length === 0) {
    return { nodes, edges };
  }

  // 1. Identify Root Node
  let rootNode = visibleNodes.find((n) => n.data?.isRoot);
  if (!rootNode) {
    // Find node with 0 incoming edges
    const targetIds = new Set(visibleEdges.map((e) => e.target));
    rootNode = visibleNodes.find((n) => !targetIds.has(n.id)) || visibleNodes[0];
  }

  // Find direct children of the root
  const directChildEdges = visibleEdges.filter((e) => e.source === rootNode!.id);
  const directChildren = directChildEdges
    .map((e) => visibleNodes.find((n) => n.id === e.target))
    .filter(Boolean) as MapMindNode[];

  // If node has <= 1 child or simple graph, run standard ELK layout
  if (directChildren.length <= 1) {
    return runStandardElkTree(nodes, edges, 'RIGHT', options);
  }

  // 2. Partition direct children evenly: Left branch and Right branch
  const mid = Math.ceil(directChildren.length / 2);
  const rightChildren = directChildren.slice(0, mid);
  const leftChildren = directChildren.slice(mid);

  // Helper to layout a side
  async function layoutSide(
    children: MapMindNode[],
    direction: 'LEFT' | 'RIGHT'
  ): Promise<Map<string, { x: number; y: number }>> {
    const positionMap = new Map<string, { x: number; y: number }>();
    if (children.length === 0) return positionMap;

    // Collect all nodes and edges in these subtrees
    const sideNodeSet = new Set<string>();
    const sideEdgeSet = new Set<MapMindEdge>();

    for (const child of children) {
      const { subtreeNodes, subtreeEdges } = getSubtreeNodesAndEdges(
        child.id,
        visibleNodes,
        visibleEdges
      );
      subtreeNodes.forEach((n) => sideNodeSet.add(n.id));
      subtreeEdges.forEach((e) => sideEdgeSet.add(e));
    }

    const elkNodes: ElkNode[] = Array.from(sideNodeSet).map((id) => {
      const node = visibleNodes.find((n) => n.id === id)!;
      const w = node.measured?.width || (node.width as number) || nodeWidth;
      const h = node.measured?.height || (node.height as number) || nodeHeight;
      return {
        id,
        width: w,
        height: h,
      };
    });

    const elkEdges: ElkExtendedEdge[] = Array.from(sideEdgeSet).map((e) => ({
      id: e.id,
      sources: [e.source],
      targets: [e.target],
    }));

    // Virtual root for grouping multiple subtrees on this side
    const virtualRootId = `__virtual_root_${direction}__`;
    const sideGraph: ElkNode = {
      id: 'side_root',
      layoutOptions: {
        'elk.algorithm': 'mrtree',
        'elk.direction': direction,
        'elk.spacing.nodeNode': `${spacing}`,
        'elk.layered.spacing.nodeNodeBetweenLayers': `${spacing * 1.5}`,
        'elk.mrtree.nodeNodeSpacing': `${spacing}`,
        'elk.mrtree.levelSpacing': `${spacing * 1.8}`,
      },
      children: [
        { id: virtualRootId, width: 1, height: 1 },
        ...elkNodes,
      ],
      edges: [
        ...elkEdges,
        ...children.map((c) => ({
          id: `virtual_${c.id}`,
          sources: [virtualRootId],
          targets: [c.id],
        })),
      ],
    };

    const layoutResult = await elk.layout(sideGraph);

    if (layoutResult.children) {
      const vRoot = layoutResult.children.find((c) => c.id === virtualRootId);
      const vRootX = vRoot?.x || 0;
      const vRootY = vRoot?.y || 0;

      for (const child of layoutResult.children) {
        if (child.id !== virtualRootId) {
          // Relative to the virtual root
          positionMap.set(child.id, {
            x: (child.x || 0) - vRootX,
            y: (child.y || 0) - vRootY,
          });
        }
      }
    }

    return positionMap;
  }

  // Execute left & right branch layouts in parallel
  const [rightPositions, leftPositions] = await Promise.all([
    layoutSide(rightChildren, 'RIGHT'),
    layoutSide(leftChildren, 'LEFT'),
  ]);

  const rootW = rootNode.measured?.width || (rootNode.width as number) || nodeWidth;
  const rootH = rootNode.measured?.height || (rootNode.height as number) || nodeHeight;
  const rootX = 0;
  const rootY = 0;

  const nodePositions = new Map<string, { x: number; y: number }>();
  nodePositions.set(rootNode.id, { x: rootX, y: rootY });

  // Place right nodes to the right of root
  rightPositions.forEach((pos, id) => {
    nodePositions.set(id, {
      x: rootX + rootW / 2 + pos.x + spacing * 1.2,
      y: rootY + rootH / 2 + pos.y,
    });
  });

  // Place left nodes to the left of root
  leftPositions.forEach((pos, id) => {
    nodePositions.set(id, {
      x: rootX - rootW / 2 + pos.x - spacing * 1.2,
      y: rootY + rootH / 2 + pos.y,
    });
  });

  // Apply positions back to graph nodes
  const layoutedNodes = nodes.map((node) => {
    const calculated = nodePositions.get(node.id);
    if (calculated) {
      const w = node.measured?.width || (node.width as number) || nodeWidth;
      const h = node.measured?.height || (node.height as number) || nodeHeight;
      return {
        ...node,
        position: {
          x: calculated.x - w / 2,
          y: calculated.y - h / 2,
        },
      };
    }
    return node;
  });

  return { nodes: layoutedNodes, edges };
}

/**
 * Standard directional ELK tree layout helper
 */
export async function runStandardElkTree(
  nodes: MapMindNode[],
  edges: MapMindEdge[],
  direction: 'DOWN' | 'RIGHT' | 'LEFT' | 'UP' = 'DOWN',
  options: ElkLayoutOptions = {}
): Promise<{ nodes: MapMindNode[]; edges: MapMindEdge[] }> {
  const { nodeWidth = 220, nodeHeight = 85, spacing = 60 } = options;

  const visibleNodes = nodes.filter((n) => !n.data?.hidden);
  const visibleNodeIds = new Set(visibleNodes.map((n) => n.id));
  const visibleEdges = edges.filter(
    (e) => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target)
  );

  const elkGraph: ElkNode = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': direction,
      'elk.spacing.nodeNode': `${spacing}`,
      'elk.layered.spacing.nodeNodeBetweenLayers': `${spacing * 1.5}`,
    },
    children: visibleNodes.map((node) => {
      const w = node.measured?.width || (node.width as number) || nodeWidth;
      const h = node.measured?.height || (node.height as number) || nodeHeight;
      return {
        id: node.id,
        width: w,
        height: h,
      };
    }),
    edges: visibleEdges.map((edge) => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
    })),
  };

  const layoutResult = await elk.layout(elkGraph);
  const positionMap = new Map<string, { x: number; y: number }>();

  layoutResult.children?.forEach((child) => {
    positionMap.set(child.id, { x: child.x || 0, y: child.y || 0 });
  });

  const layoutedNodes = nodes.map((node) => {
    const pos = positionMap.get(node.id);
    if (pos) {
      return {
        ...node,
        position: { x: pos.x, y: pos.y },
      };
    }
    return node;
  });

  return { nodes: layoutedNodes, edges };
}
