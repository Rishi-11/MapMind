import { MapMindNode, MapMindEdge, NodeColorTheme } from '@/types/graph';

const PALETTE: NodeColorTheme[] = ['blue', 'emerald', 'purple', 'amber', 'rose', 'cyan'];

export interface BranchMetrics {
  nodeMap: Map<string, MapMindNode>;
  childrenMap: Map<string, string[]>;
  parentMap: Map<string, string>;
  descendantCountMap: Map<string, number>;
  inheritedColorMap: Map<string, NodeColorTheme>;
  depthMap: Map<string, number>;
}

/**
 * Computes tree metrics including depth, branch color inheritance, and total descendant counts.
 */
export function computeBranchMetrics(
  nodes: MapMindNode[],
  edges: MapMindEdge[]
): BranchMetrics {
  const nodeMap = new Map<string, MapMindNode>();
  nodes.forEach((n) => nodeMap.set(n.id, n));

  const childrenMap = new Map<string, string[]>();
  const parentMap = new Map<string, string>();

  edges.forEach((e) => {
    const list = childrenMap.get(e.source) || [];
    list.push(e.target);
    childrenMap.set(e.source, list);
    parentMap.set(e.target, e.source);
  });

  // Identify root node
  let root = nodes.find((n) => n.data?.isRoot);
  if (!root && nodes.length > 0) {
    const targetIds = new Set(edges.map((e) => e.target));
    root = nodes.find((n) => !targetIds.has(n.id)) || nodes[0];
  }

  const depthMap = new Map<string, number>();
  const inheritedColorMap = new Map<string, NodeColorTheme>();
  const descendantCountMap = new Map<string, number>();

  if (root) {
    depthMap.set(root.id, 0);

    // Get primary pillars (depth 1 children)
    const primaryPillars = childrenMap.get(root.id) || [];

    primaryPillars.forEach((pillarId, idx) => {
      const pillarColor = PALETTE[idx % PALETTE.length];

      // Recursively color and depth-calculate pillar's subtree
      function traverse(nodeId: string, currentDepth: number) {
        depthMap.set(nodeId, currentDepth);
        inheritedColorMap.set(nodeId, pillarColor);

        const children = childrenMap.get(nodeId) || [];
        children.forEach((childId) => {
          traverse(childId, currentDepth + 1);
        });
      }

      traverse(pillarId, 1);
    });

    // Compute recursive descendant count for every node (bottom-up memoization)
    function computeDescendants(nodeId: string): number {
      const children = childrenMap.get(nodeId) || [];
      let total = children.length;
      for (const cid of children) {
        total += computeDescendants(cid);
      }
      descendantCountMap.set(nodeId, total);
      return total;
    }

    computeDescendants(root.id);
  }

  return {
    nodeMap,
    childrenMap,
    parentMap,
    descendantCountMap,
    inheritedColorMap,
    depthMap,
  };
}

/**
 * Computes set of node IDs in the active spotlight (ancestor trail + active subtree)
 */
export function computeSpotlightSet(
  selectedNodeId: string | null,
  _nodes: MapMindNode[],
  edges: MapMindEdge[]
): Set<string> | null {
  if (!selectedNodeId) return null;

  const set = new Set<string>();
  set.add(selectedNodeId);

  // 1. Traverse up to root (Ancestors)
  const parentMap = new Map<string, string>();
  edges.forEach((e) => parentMap.set(e.target, e.source));

  let curr = parentMap.get(selectedNodeId);
  while (curr && !set.has(curr)) {
    set.add(curr);
    curr = parentMap.get(curr);
  }

  // 2. Traverse down to leaves (Descendants)
  const childrenMap = new Map<string, string[]>();
  edges.forEach((e) => {
    const list = childrenMap.get(e.source) || [];
    list.push(e.target);
    childrenMap.set(e.source, list);
  });

  const queue = [selectedNodeId];
  while (queue.length > 0) {
    const id = queue.shift()!;
    const children = childrenMap.get(id) || [];
    for (const cid of children) {
      if (!set.has(cid)) {
        set.add(cid);
        queue.push(cid);
      }
    }
  }

  return set;
}
