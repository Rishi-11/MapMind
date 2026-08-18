import { MapMindNode } from '@/types/graph';

export interface BoundingBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  locked?: boolean;
  isRoot?: boolean;
}

const DEFAULT_NODE_WIDTH = 200;
const DEFAULT_NODE_HEIGHT = 75;
export const DEFAULT_COLLISION_MARGIN = 28;

/**
 * Extracts normalized bounding box for a node
 */
export function getNodeBoundingBox(
  node: MapMindNode,
  defaultWidth = DEFAULT_NODE_WIDTH,
  defaultHeight = DEFAULT_NODE_HEIGHT
): BoundingBox {
  const width = node.measured?.width || (node.width as number) || defaultWidth;
  const height = node.measured?.height || (node.height as number) || defaultHeight;

  return {
    id: node.id,
    x: node.position.x,
    y: node.position.y,
    width: Math.max(width, 140),
    height: Math.max(height, 50),
    locked: Boolean(node.data?.locked),
    isRoot: Boolean(node.data?.isRoot),
  };
}

/**
 * Checks if two bounding boxes overlap with safety margin
 */
export function checkBoxesOverlap(
  boxA: BoundingBox,
  boxB: BoundingBox,
  margin = DEFAULT_COLLISION_MARGIN
): boolean {
  return (
    boxA.x < boxB.x + boxB.width + margin &&
    boxA.x + boxA.width + margin > boxB.x &&
    boxA.y < boxB.y + boxB.height + margin &&
    boxA.y + boxA.height + margin > boxB.y
  );
}

/**
 * Checks if a line segment between (x1, y1) and (x2, y2) intersects an expanded bounding box
 */
export function segmentIntersectsBox(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  box: BoundingBox,
  clearance = 12
): boolean {
  const minX = box.x - clearance;
  const maxX = box.x + box.width + clearance;
  const minY = box.y - clearance;
  const maxY = box.y + box.height + clearance;

  // Quick bounding check
  if (Math.max(x1, x2) < minX || Math.min(x1, x2) > maxX) return false;
  if (Math.max(y1, y2) < minY || Math.min(y1, y2) > maxY) return false;

  // Check if either endpoint is inside the box
  if (x1 >= minX && x1 <= maxX && y1 >= minY && y1 <= maxY) return true;
  if (x2 >= minX && x2 <= maxX && y2 >= minY && y2 <= maxY) return true;

  // Helper line intersection check
  function lineIntersectsSegment(
    ax: number,
    ay: number,
    bx: number,
    by: number,
    cx: number,
    cy: number,
    dx: number,
    dy: number
  ): boolean {
    const denom = (bx - ax) * (dy - cy) - (by - ay) * (dx - cx);
    if (denom === 0) return false;
    const t = ((cx - ax) * (dy - cy) - (cy - ay) * (dx - cx)) / denom;
    const u = ((cx - ax) * (by - ay) - (cy - ay) * (bx - ax)) / denom;
    return t >= 0 && t <= 1 && u >= 0 && u <= 1;
  }

  // 4 edges of the bounding box
  return (
    lineIntersectsSegment(x1, y1, x2, y2, minX, minY, maxX, minY) || // Top
    lineIntersectsSegment(x1, y1, x2, y2, maxX, minY, maxX, maxY) || // Right
    lineIntersectsSegment(x1, y1, x2, y2, minX, maxY, maxX, maxY) || // Bottom
    lineIntersectsSegment(x1, y1, x2, y2, minX, minY, minX, maxY)    // Left
  );
}

/**
 * Resolves collisions for a specifically moved/dragged node.
 * Nudges the dragged node smoothly to the nearest non-colliding location.
 */
export function resolveNodeDragCollision(
  draggedNodeId: string,
  nodes: MapMindNode[],
  margin = DEFAULT_COLLISION_MARGIN
): MapMindNode[] {
  const visibleNodes = nodes.filter((n) => !n.data?.hidden);
  const targetNode = visibleNodes.find((n) => n.id === draggedNodeId);
  if (!targetNode) return nodes;

  const otherNodes = visibleNodes.filter((n) => n.id !== draggedNodeId);
  if (otherNodes.length === 0) return nodes;

  let currentBox = getNodeBoundingBox(targetNode);
  let hasCollision = true;
  let iterations = 0;
  const maxIterations = 20;

  while (hasCollision && iterations < maxIterations) {
    hasCollision = false;
    iterations++;

    for (const other of otherNodes) {
      const otherBox = getNodeBoundingBox(other);

      if (checkBoxesOverlap(currentBox, otherBox, margin)) {
        hasCollision = true;

        // Calculate overlap depths in 4 directions
        const overlapLeft = currentBox.x + currentBox.width + margin - otherBox.x;
        const overlapRight = otherBox.x + otherBox.width + margin - currentBox.x;
        const overlapTop = currentBox.y + currentBox.height + margin - otherBox.y;
        const overlapBottom = otherBox.y + otherBox.height + margin - currentBox.y;

        // Find direction of minimum displacement
        const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

        if (minOverlap === overlapLeft) {
          currentBox.x -= overlapLeft;
        } else if (minOverlap === overlapRight) {
          currentBox.x += overlapRight;
        } else if (minOverlap === overlapTop) {
          currentBox.y -= overlapTop;
        } else {
          currentBox.y += overlapBottom;
        }
      }
    }
  }

  // If position changed, update nodes
  if (currentBox.x !== targetNode.position.x || currentBox.y !== targetNode.position.y) {
    return nodes.map((node) => {
      if (node.id === draggedNodeId) {
        return {
          ...node,
          position: {
            x: Math.round(currentBox.x),
            y: Math.round(currentBox.y),
          },
        };
      }
      return node;
    });
  }

  return nodes;
}

/**
 * Resolves all overlapping nodes across the entire whiteboard using iterative repulsion.
 * Strictly guarantees non-overlapping bounding boxes with mandatory minimum margin.
 */
export function resolveAllGraphCollisions(
  nodes: MapMindNode[],
  margin = DEFAULT_COLLISION_MARGIN
): MapMindNode[] {
  const visibleNodes = nodes.filter((n) => !n.data?.hidden);
  if (visibleNodes.length <= 1) return nodes;

  const boxes = new Map<string, BoundingBox>();
  visibleNodes.forEach((n) => boxes.set(n.id, getNodeBoundingBox(n)));

  let anyCollision = true;
  let iterations = 0;
  const maxIterations = 30;

  while (anyCollision && iterations < maxIterations) {
    anyCollision = false;
    iterations++;

    for (let i = 0; i < visibleNodes.length; i++) {
      const nodeA = visibleNodes[i];
      const boxA = boxes.get(nodeA.id)!;

      for (let j = i + 1; j < visibleNodes.length; j++) {
        const nodeB = visibleNodes[j];
        const boxB = boxes.get(nodeB.id)!;

        if (checkBoxesOverlap(boxA, boxB, margin)) {
          anyCollision = true;

          const centerAX = boxA.x + boxA.width / 2;
          const centerAY = boxA.y + boxA.height / 2;
          const centerBX = boxB.x + boxB.width / 2;
          const centerBY = boxB.y + boxB.height / 2;

          let dx = centerBX - centerAX;
          let dy = centerBY - centerAY;

          if (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1) {
            dx = 1;
            dy = 0;
          }

          const reqDistX = (boxA.width + boxB.width) / 2 + margin;
          const reqDistY = (boxA.height + boxB.height) / 2 + margin;

          const overlapX = reqDistX - Math.abs(dx);
          const overlapY = reqDistY - Math.abs(dy);

          if (overlapX > 0 && overlapY > 0) {
            // Push along shallowest penetration axis
            if (overlapX < overlapY) {
              const shift = overlapX / 2;
              const sign = dx >= 0 ? 1 : -1;
              if (!boxA.locked && !boxA.isRoot) boxA.x -= shift * sign;
              if (!boxB.locked && !boxB.isRoot) boxB.x += shift * sign;
            } else {
              const shift = overlapY / 2;
              const sign = dy >= 0 ? 1 : -1;
              if (!boxA.locked && !boxA.isRoot) boxA.y -= shift * sign;
              if (!boxB.locked && !boxB.isRoot) boxB.y += shift * sign;
            }
          }
        }
      }
    }
  }

  return nodes.map((node) => {
    const updated = boxes.get(node.id);
    if (updated && (updated.x !== node.position.x || updated.y !== node.position.y)) {
      return {
        ...node,
        position: {
          x: Math.round(updated.x),
          y: Math.round(updated.y),
        },
      };
    }
    return node;
  });
}
