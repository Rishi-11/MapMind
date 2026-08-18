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
 * Fully cycle-safe and multigraph-safe with zero recursive stack overflow risk.
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

    // Only set parent if not a self-loop and not already set (preserve primary incoming)
    if (e.source !== e.target && !parentMap.has(e.target)) {
      parentMap.set(e.target, e.source);
    }
  });

  // Identify root node
  let root = nodes.find((n) => n.data?.isRoot);
  if (!root && nodes.length > 0) {
    const targetIds = new Set(
      edges.filter((e) => e.source !== e.target).map((e) => e.target)
    );
    root = nodes.find((n) => !targetIds.has(n.id)) || nodes[0];
  }

  const depthMap = new Map<string, number>();
  const inheritedColorMap = new Map<string, NodeColorTheme>();
  const descendantCountMap = new Map<string, number>();

  if (root) {
    depthMap.set(root.id, 0);

    // Get direct child pillars (excluding self-loops)
    const directChildren = (childrenMap.get(root.id) || []).filter(
      (cid) => cid !== root!.id
    );

    // Deduplicate primary pillar IDs
    const primaryPillars = Array.from(new Set(directChildren));

    const globalVisited = new Set<string>([root.id]);

    primaryPillars.forEach((pillarId, idx) => {
      const pillarColor = PALETTE[idx % PALETTE.length];
      if (!nodeMap.has(pillarId)) return;

      // Iterative BFS for pillar subtree to assign depth and color safely
      const queue: { id: string; depth: number }[] = [{ id: pillarId, depth: 1 }];
      globalVisited.add(pillarId);
      depthMap.set(pillarId, 1);
      inheritedColorMap.set(pillarId, pillarColor);

      while (queue.length > 0) {
        const { id, depth } = queue.shift()!;
        const children = childrenMap.get(id) || [];

        for (const childId of children) {
          // Ignore self-loops and already visited nodes in the current path
          if (childId !== id && !globalVisited.has(childId)) {
            globalVisited.add(childId);
            depthMap.set(childId, depth + 1);
            inheritedColorMap.set(childId, pillarColor);
            queue.push({ id: childId, depth: depth + 1 });
          }
        }
      }
    });

    // Fallback for any unreachable/orphan nodes
    nodes.forEach((n) => {
      if (!depthMap.has(n.id)) {
        depthMap.set(n.id, 1);
      }
      if (!inheritedColorMap.has(n.id)) {
        inheritedColorMap.set(n.id, 'blue');
      }
    });

    // Compute cycle-safe reachable descendant counts for each node
    nodes.forEach((n) => {
      const reachable = new Set<string>();
      const queue = [n.id];
      const visited = new Set<string>([n.id]);

      while (queue.length > 0) {
        const curr = queue.shift()!;
        const children = childrenMap.get(curr) || [];

        for (const cid of children) {
          if (!visited.has(cid)) {
            visited.add(cid);
            reachable.add(cid);
            queue.push(cid);
          }
        }
      }

      descendantCountMap.set(n.id, reachable.size);
    });
  } else {
    // Empty graph fallback
    nodes.forEach((n) => {
      depthMap.set(n.id, 0);
      inheritedColorMap.set(n.id, 'blue');
      descendantCountMap.set(n.id, 0);
    });
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
 * Computes set of node IDs in the active spotlight (ancestor trail + active subtree).
 * Fully cycle-safe using iterative BFS and visited tracking.
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
  edges.forEach((e) => {
    if (e.source !== e.target && !parentMap.has(e.target)) {
      parentMap.set(e.target, e.source);
    }
  });

  let curr = parentMap.get(selectedNodeId);
  const ancestorVisited = new Set<string>([selectedNodeId]);

  while (curr && !ancestorVisited.has(curr)) {
    set.add(curr);
    ancestorVisited.add(curr);
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
      if (cid !== id && !set.has(cid)) {
        set.add(cid);
        queue.push(cid);
      }
    }
  }

  return set;
}
