import { MapMindNode, MapMindEdge, LayoutDensity, LayoutDirection } from '@/types/graph';
import {
  getNodeBoundingBox,
  resolveAllGraphCollisions,
  DEFAULT_COLLISION_MARGIN,
} from '@/lib/collision/collisionAvoidance';

export interface CompactLayoutOptions {
  direction?: LayoutDirection;
  density?: LayoutDensity;
  nodeWidth?: number;
  nodeHeight?: number;
}

const DENSITY_SPACING: Record<
  LayoutDensity,
  { colGap: number; rowGap: number; layerGap: number; margin: number }
> = {
  compact: { colGap: 24, rowGap: 20, layerGap: 65, margin: 24 },
  balanced: { colGap: 36, rowGap: 30, layerGap: 85, margin: 32 },
  spacious: { colGap: 52, rowGap: 42, layerGap: 110, margin: 44 },
};

/**
 * Calculates a compact, wrapped mindmap / tree layout that prevents
 * single infinitely long horizontal or vertical lines. Sibling nodes are wrapped
 * into multi-column/row compact grids and balanced radially around the root.
 */
export function getCompactWrappedLayout(
  nodes: MapMindNode[],
  edges: MapMindEdge[],
  options: CompactLayoutOptions = {}
): { nodes: MapMindNode[]; edges: MapMindEdge[] } {
  const {
    direction = 'BALANCED_MINDMAP',
    density = 'compact',
    nodeWidth = 200,
    nodeHeight = 75,
  } = options;

  const cfg = DENSITY_SPACING[density];
  const visibleNodes = nodes.filter((n) => !n.data?.hidden);
  const visibleNodeIds = new Set(visibleNodes.map((n) => n.id));

  // Filter valid edges (exclude self-loops for tree placement)
  const treeEdges = edges.filter(
    (e) =>
      visibleNodeIds.has(e.source) &&
      visibleNodeIds.has(e.target) &&
      e.source !== e.target
  );

  if (visibleNodes.length === 0) return { nodes, edges };

  // 1. Identify Root
  let root = visibleNodes.find((n) => n.data?.isRoot);
  if (!root) {
    const targetIds = new Set(treeEdges.map((e) => e.target));
    root = visibleNodes.find((n) => !targetIds.has(n.id)) || visibleNodes[0];
  }

  // 2. Build adjacency map (children)
  const childrenMap = new Map<string, string[]>();
  treeEdges.forEach((e) => {
    const list = childrenMap.get(e.source) || [];
    if (!list.includes(e.target)) {
      list.push(e.target);
    }
    childrenMap.set(e.source, list);
  });

  const positions = new Map<string, { x: number; y: number }>();
  positions.set(root.id, { x: 0, y: 0 });

  const isBalanced = direction === 'BALANCED_MINDMAP';
  const isHorizontal = direction === 'LR' || direction === 'RL' || isBalanced;
  const isTopDown = direction === 'TB';

  const globalVisited = new Set<string>([root.id]);

  if (isBalanced) {
    // Partition direct children of root into Right and Left branches
    const directChildren = (childrenMap.get(root.id) || []).filter(
      (cid) => cid !== root.id
    );

    const mid = Math.ceil(directChildren.length / 2);
    const rightPillars = directChildren.slice(0, mid);
    const leftPillars = directChildren.slice(mid);

    layoutHorizontalSide(rightPillars, 'RIGHT', 0, 0);
    layoutHorizontalSide(leftPillars, 'LEFT', 0, 0);
  } else if (isHorizontal) {
    const directChildren = (childrenMap.get(root.id) || []).filter(
      (cid) => cid !== root.id
    );
    layoutHorizontalSide(directChildren, direction === 'RL' ? 'LEFT' : 'RIGHT', 0, 0);
  } else {
    // Top-to-Bottom (TB) or Bottom-to-Top (BT)
    const directChildren = (childrenMap.get(root.id) || []).filter(
      (cid) => cid !== root.id
    );
    layoutVerticalHierarchy(directChildren, isTopDown ? 'DOWN' : 'UP', 0, 0);
  }

  // Helper: Layout horizontal branches (Right or Left) with compact multi-column wrapping
  function layoutHorizontalSide(
    pillarIds: string[],
    side: 'LEFT' | 'RIGHT',
    originX: number,
    originY: number
  ) {
    if (pillarIds.length === 0) return;

    const sign = side === 'RIGHT' ? 1 : -1;

    // Wrap pillars themselves if there are many direct pillars (e.g. > 4 pillars)
    const numPillars = pillarIds.length;
    const pillarCols = numPillars <= 3 ? 1 : numPillars <= 8 ? 2 : 3;
    const pillarRows = Math.ceil(numPillars / pillarCols);

    const pillarTotalHeight = pillarRows * (nodeHeight + cfg.rowGap * 1.5) - cfg.rowGap * 1.5;
    const startPillarY = originY - pillarTotalHeight / 2 + nodeHeight / 2;

    pillarIds.forEach((pid, pIdx) => {
      globalVisited.add(pid);

      const pCol = Math.floor(pIdx / pillarRows);
      const pRow = pIdx % pillarRows;

      const pX = originX + sign * (nodeWidth + cfg.layerGap + pCol * (nodeWidth + cfg.colGap * 1.2));
      const pY = startPillarY + pRow * (nodeHeight + cfg.rowGap * 1.5);

      positions.set(pid, { x: pX, y: pY });

      // Layout subtree of this pillar with multi-column wrapping
      layoutSubtreeHorizontal(pid, pX, pY, sign);
    });
  }

  function layoutSubtreeHorizontal(
    parentId: string,
    parentX: number,
    parentY: number,
    sign: number
  ) {
    const children = (childrenMap.get(parentId) || []).filter(
      (cid) => !globalVisited.has(cid) && cid !== parentId
    );

    if (children.length === 0) return;

    children.forEach((c) => globalVisited.add(c));

    const count = children.length;
    // Smart Multi-Column Wrapping:
    // If <= 3 children: 1 column
    // If 4..8 children: 2 columns
    // If 9+ children: 3 columns
    const numCols = count <= 3 ? 1 : count <= 8 ? 2 : 3;
    const numRows = Math.ceil(count / numCols);

    const totalHeight = numRows * (nodeHeight + cfg.rowGap) - cfg.rowGap;
    const startY = parentY - totalHeight / 2 + nodeHeight / 2;

    children.forEach((childId, idx) => {
      const col = Math.floor(idx / numRows);
      const row = idx % numRows;

      const childX =
        parentX +
        sign * (nodeWidth + cfg.layerGap + col * (nodeWidth + cfg.colGap));
      const childY = startY + row * (nodeHeight + cfg.rowGap);

      positions.set(childId, { x: childX, y: childY });

      // Recursively layout child's subtrees outward
      layoutSubtreeHorizontal(childId, childX, childY, sign);
    });
  }

  // Helper: Layout vertical hierarchy (TB/BT) with compact multi-row wrapping
  function layoutVerticalHierarchy(
    pillarIds: string[],
    verticalDir: 'DOWN' | 'UP',
    originX: number,
    originY: number
  ) {
    if (pillarIds.length === 0) return;

    const sign = verticalDir === 'DOWN' ? 1 : -1;

    // Wrap pillars into multi-row grid if many pillars
    const numPillars = pillarIds.length;
    const pillarRows = numPillars <= 3 ? 1 : numPillars <= 8 ? 2 : 3;
    const pillarCols = Math.ceil(numPillars / pillarRows);

    const pillarTotalWidth = pillarCols * (nodeWidth + cfg.colGap * 1.2) - cfg.colGap * 1.2;
    const startPillarX = originX - pillarTotalWidth / 2 + nodeWidth / 2;

    pillarIds.forEach((pid, pIdx) => {
      globalVisited.add(pid);

      const pRow = Math.floor(pIdx / pillarCols);
      const pCol = pIdx % pillarCols;

      const pX = startPillarX + pCol * (nodeWidth + cfg.colGap * 1.2);
      const pY = originY + sign * (nodeHeight + cfg.layerGap + pRow * (nodeHeight + cfg.rowGap * 1.2));

      positions.set(pid, { x: pX, y: pY });

      // Layout subtree of this pillar with multi-row wrapping
      layoutSubtreeVertical(pid, pX, pY, sign);
    });
  }

  function layoutSubtreeVertical(
    parentId: string,
    parentX: number,
    parentY: number,
    sign: number
  ) {
    const children = (childrenMap.get(parentId) || []).filter(
      (cid) => !globalVisited.has(cid) && cid !== parentId
    );

    if (children.length === 0) return;

    children.forEach((c) => globalVisited.add(c));

    const count = children.length;
    // Smart Multi-Row Wrapping:
    // If <= 3 children: 1 row
    // If 4..8 children: 2 rows
    // If 9+ children: 3 rows
    const numRows = count <= 3 ? 1 : count <= 8 ? 2 : 3;
    const numCols = Math.ceil(count / numRows);

    const totalWidth = numCols * (nodeWidth + cfg.colGap) - cfg.colGap;
    const startX = parentX - totalWidth / 2 + nodeWidth / 2;

    children.forEach((childId, idx) => {
      const row = Math.floor(idx / numCols);
      const col = idx % numCols;

      const childX = startX + col * (nodeWidth + cfg.colGap);
      const childY =
        parentY +
        sign * (nodeHeight + cfg.layerGap + row * (nodeHeight + cfg.rowGap));

      positions.set(childId, { x: childX, y: childY });

      // Recursively layout child's subtrees downward
      layoutSubtreeVertical(childId, childX, childY, sign);
    });
  }

  // Fallback for any unpositioned visible nodes (e.g. disconnected components)
  let orphanOffset = 220;
  visibleNodes.forEach((n) => {
    if (!positions.has(n.id)) {
      positions.set(n.id, { x: 0, y: orphanOffset });
      orphanOffset += nodeHeight + cfg.rowGap;
    }
  });

  // Apply positions back to nodes
  const rawLayoutedNodes = nodes.map((node) => {
    const pos = positions.get(node.id);
    if (pos) {
      const box = getNodeBoundingBox(node, nodeWidth, nodeHeight);
      return {
        ...node,
        position: {
          x: Math.round(pos.x - box.width / 2),
          y: Math.round(pos.y - box.height / 2),
        },
      };
    }
    return node;
  });

  // Strict Final Collision Avoidance Pass: guarantees zero overlapping cards!
  const finalNodes = resolveAllGraphCollisions(rawLayoutedNodes, cfg.margin || DEFAULT_COLLISION_MARGIN);

  return { nodes: finalNodes, edges };
}
