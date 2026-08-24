import { Position, getBezierPath, getSmoothStepPath, getStraightPath } from '@xyflow/react';
import { EdgeRoutingStyle } from '@/types/graph';
import { BoundingBox, segmentIntersectsBox } from '@/lib/collision/collisionAvoidance';

export interface Point2D {
  x: number;
  y: number;
}

export interface LineSegment {
  p1: Point2D;
  p2: Point2D;
  edgeId?: string;
}

export interface RouteEdgeParams {
  id: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  sourcePosition: Position;
  targetPosition: Position;
  routingStyle: EdgeRoutingStyle;
  isSelfLoop?: boolean;
  selfLoopIndex?: number;
  parallelIndex?: number;
  parallelCount?: number;
  obstacleBoxes?: BoundingBox[];
  sourceNodeId?: string;
  targetNodeId?: string;
  crossingSegments?: LineSegment[];
}

export interface RouteEdgeResult {
  path: string;
  labelX: number;
  labelY: number;
  isDetour: boolean;
}

/**
 * Computes exact line segment intersection between (p1, p2) and (p3, p4)
 */
export function getLineIntersection(
  p1: Point2D,
  p2: Point2D,
  p3: Point2D,
  p4: Point2D
): Point2D | null {
  const dx12 = p2.x - p1.x;
  const dy12 = p2.y - p1.y;
  const dx34 = p4.x - p3.x;
  const dy34 = p4.y - p3.y;

  const denom = dx12 * dy34 - dy12 * dx34;
  if (Math.abs(denom) < 1e-6) return null; // Parallel or colinear

  const dx13 = p1.x - p3.x;
  const dy13 = p1.y - p3.y;

  const t = (dx13 * dy34 - dy13 * dx34) / -denom;
  const u = (dx12 * dy13 - dy12 * dx13) / denom;

  // Strict interior intersection (not at endpoints)
  if (t > 0.05 && t < 0.95 && u > 0.05 && u < 0.95) {
    return {
      x: p1.x + t * dx12,
      y: p1.y + t * dy12,
    };
  }

  return null;
}

/**
 * Computes self-referencing loop path attached cleanly to a node handle
 */
export function computeSelfLoopPath(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  sourcePosition: Position,
  selfLoopIndex = 0
): RouteEdgeResult {
  const k = selfLoopIndex;
  const loopRadius = 38 + k * 26;

  let cp1X = sourceX;
  let cp1Y = sourceY;
  let cp2X = targetX;
  let cp2Y = targetY;
  let labelX = (sourceX + targetX) / 2;
  let labelY = (sourceY + targetY) / 2;

  if (sourcePosition === Position.Top || sourcePosition === Position.Bottom) {
    const isTop = sourcePosition === Position.Top;
    const sign = isTop ? -1 : 1;

    cp1X = sourceX - loopRadius * 0.85;
    cp1Y = sourceY + sign * loopRadius * 1.5;
    cp2X = targetX + loopRadius * 0.85;
    cp2Y = targetY + sign * loopRadius * 1.5;

    labelX = (sourceX + targetX) / 2;
    labelY = sourceY + sign * (loopRadius * 1.25 + 6);
  } else {
    const isRight = sourcePosition === Position.Right;
    const sign = isRight ? 1 : -1;

    cp1X = sourceX + sign * loopRadius * 1.5;
    cp1Y = sourceY - loopRadius * 0.85;
    cp2X = targetX + sign * loopRadius * 1.5;
    cp2Y = targetY + loopRadius * 0.85;

    labelX = sourceX + sign * (loopRadius * 1.25 + 6);
    labelY = (sourceY + targetY) / 2;
  }

  const path = `M ${sourceX} ${sourceY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${targetX} ${targetY}`;

  return {
    path,
    labelX,
    labelY,
    isDetour: false,
  };
}

/**
 * Computes multi-edge separated parallel curve
 */
export function computeParallelCurvePath(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  parallelIndex: number,
  parallelCount: number,
  routingStyle: EdgeRoutingStyle
): RouteEdgeResult {
  const normalOffset = (parallelIndex - (parallelCount - 1) / 2) * 32;

  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const len = Math.hypot(dx, dy) || 1;

  const nx = -dy / len;
  const ny = dx / len;

  const midX = (sourceX + targetX) / 2 + nx * normalOffset;
  const midY = (sourceY + targetY) / 2 + ny * normalOffset;

  const cp1X = sourceX + (dx / 3) + nx * normalOffset * 1.15;
  const cp1Y = sourceY + (dy / 3) + ny * normalOffset * 1.15;
  const cp2X = sourceX + (dx * 2 / 3) + nx * normalOffset * 1.15;
  const cp2Y = sourceY + (dy * 2 / 3) + ny * normalOffset * 1.15;

  let path = '';
  if (routingStyle === 'straight' && Math.abs(normalOffset) < 1) {
    path = `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`;
  } else {
    path = `M ${sourceX} ${sourceY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${targetX} ${targetY}`;
  }

  return {
    path,
    labelX: midX,
    labelY: midY,
    isDetour: false,
  };
}

/**
 * Converts waypoints into a smooth filleted orthogonal SVG path with line jump hops
 */
export function waypointsToFilletedPath(
  points: Point2D[],
  radius = 14,
  crossings: Point2D[] = []
): string {
  if (points.length < 2) return '';
  if (points.length === 2 && crossings.length === 0) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }

  let d = `M ${points[0].x} ${points[0].y}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const segLen = Math.hypot(dx, dy);

    if (segLen < 1e-4) continue;

    const ux = dx / segLen;
    const uy = dy / segLen;
    const nx = -uy;
    const ny = ux;

    // Check for crossings along this segment
    const segCrossings: Point2D[] = [];
    for (const c of crossings) {
      const distFromP1 = (c.x - p1.x) * ux + (c.y - p1.y) * uy;
      if (distFromP1 > 16 && distFromP1 < segLen - 16) {
        segCrossings.push(c);
      }
    }

    // Sort crossings along segment
    segCrossings.sort((a, b) => {
      const da = (a.x - p1.x) * ux + (a.y - p1.y) * uy;
      const db = (b.x - p1.x) * ux + (b.y - p1.y) * uy;
      return da - db;
    });

    if (i < points.length - 2) {
      // Corner fillet approaching p2
      const p3 = points[i + 2];
      const nextDx = p3.x - p2.x;
      const nextDy = p3.y - p2.y;
      const nextLen = Math.hypot(nextDx, nextDy);
      const r = Math.min(radius, segLen / 2, nextLen / 2);

      const cornerStartX = p2.x - ux * r;
      const cornerStartY = p2.y - uy * r;
      const cornerEndX = p2.x + (nextDx / nextLen) * r;
      const cornerEndY = p2.y + (nextDy / nextLen) * r;

      if (segCrossings.length > 0) {
        for (const c of segCrossings) {
          const hopStartX = c.x - ux * 8;
          const hopStartY = c.y - uy * 8;
          const hopEndX = c.x + ux * 8;
          const hopEndY = c.y + uy * 8;
          const hopPeakX = c.x + nx * 8;
          const hopPeakY = c.y + ny * 8;

          d += ` L ${hopStartX} ${hopStartY} Q ${hopPeakX} ${hopPeakY} ${hopEndX} ${hopEndY}`;
        }
      }

      d += ` L ${cornerStartX} ${cornerStartY} Q ${p2.x} ${p2.y} ${cornerEndX} ${cornerEndY}`;
    } else {
      // Final segment to endpoint
      if (segCrossings.length > 0) {
        for (const c of segCrossings) {
          const hopStartX = c.x - ux * 8;
          const hopStartY = c.y - uy * 8;
          const hopEndX = c.x + ux * 8;
          const hopEndY = c.y + uy * 8;
          const hopPeakX = c.x + nx * 8;
          const hopPeakY = c.y + ny * 8;

          d += ` L ${hopStartX} ${hopStartY} Q ${hopPeakX} ${hopPeakY} ${hopEndX} ${hopEndY}`;
        }
      }
      d += ` L ${p2.x} ${p2.y}`;
    }
  }

  return d;
}

/**
 * Checks if a cubic Bezier curve intersects a bounding box by sampling 10 points along the arc.
 */
function bezierIntersectsBox(
  p0: Point2D,
  cp1: Point2D,
  cp2: Point2D,
  p3: Point2D,
  box: BoundingBox,
  clearance = 16
): boolean {
  let prev = p0;
  const samples = 10;
  for (let i = 1; i <= samples; i++) {
    const t = i / samples;
    const t1 = 1 - t;
    const curr: Point2D = {
      x: t1 * t1 * t1 * p0.x + 3 * t1 * t1 * t * cp1.x + 3 * t1 * t * t * cp2.x + t * t * t * p3.x,
      y: t1 * t1 * t1 * p0.y + 3 * t1 * t1 * t * cp1.y + 3 * t1 * t * t * cp2.y + t * t * t * p3.y,
    };
    if (segmentIntersectsBox(prev.x, prev.y, curr.x, curr.y, box, clearance)) {
      return true;
    }
    prev = curr;
  }
  return false;
}

/**
 * Adjusts edge label position so it never overlaps source or target cards.
 */
function adjustLabelPosition(
  labelX: number,
  labelY: number,
  sourceBox?: BoundingBox,
  targetBox?: BoundingBox
): Point2D {
  const clearance = 26;
  let adjustedX = labelX;
  let adjustedY = labelY;

  const isInside = (x: number, y: number, b: BoundingBox) =>
    x >= b.x - clearance &&
    x <= b.x + b.width + clearance &&
    y >= b.y - clearance &&
    y <= b.y + b.height + clearance;

  if (sourceBox && isInside(adjustedX, adjustedY, sourceBox)) {
    if (targetBox) {
      // Move halfway between source and target boxes
      const sMidX = sourceBox.x + sourceBox.width / 2;
      const tMidX = targetBox.x + targetBox.width / 2;
      const sMidY = sourceBox.y + sourceBox.height / 2;
      const tMidY = targetBox.y + targetBox.height / 2;
      adjustedX = (sMidX + tMidX) / 2;
      adjustedY = (sMidY + tMidY) / 2;
    } else {
      adjustedY += sourceBox.height / 2 + clearance;
    }
  } else if (targetBox && isInside(adjustedX, adjustedY, targetBox)) {
    if (sourceBox) {
      const sMidX = sourceBox.x + sourceBox.width / 2;
      const tMidX = targetBox.x + targetBox.width / 2;
      const sMidY = sourceBox.y + sourceBox.height / 2;
      const tMidY = targetBox.y + targetBox.height / 2;
      adjustedX = (sMidX + tMidX) / 2;
      adjustedY = (sMidY + tMidY) / 2;
    } else {
      adjustedY -= targetBox.height / 2 + clearance;
    }
  }

  return { x: adjustedX, y: adjustedY };
}

/**
 * Calculates a strict obstacle-avoiding route that guarantees zero intersection with any card bounding boxes.
 */
export function computeObstacleAvoidingPath(
  params: RouteEdgeParams
): RouteEdgeResult {
  const {
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    routingStyle,
    isSelfLoop,
    selfLoopIndex = 0,
    parallelIndex = 0,
    parallelCount = 1,
    obstacleBoxes = [],
    sourceNodeId,
    targetNodeId,
    crossingSegments = [],
  } = params;

  // 1. Self-Loop Check
  if (isSelfLoop || (sourceNodeId && targetNodeId && sourceNodeId === targetNodeId)) {
    return computeSelfLoopPath(sourceX, sourceY, targetX, targetY, sourcePosition, selfLoopIndex);
  }

  const isMultiEdge = parallelCount > 1;

  // Find source & target boxes for clearance and label refinement
  const sourceBox = obstacleBoxes.find((b) => b.id === sourceNodeId);
  const targetBox = obstacleBoxes.find((b) => b.id === targetNodeId);

  // Filter out source and target nodes from obstacle collision list
  const relevantObstacles = obstacleBoxes.filter(
    (b) => b.id !== sourceNodeId && b.id !== targetNodeId
  );

  const CLEARANCE_MARGIN = 24;

  // Adaptive curvature calculation:
  // For sequential steps, use a clean low-amplitude curve (0.18 - 0.22) rather than wide sweeping loops
  const dist = Math.hypot(targetX - sourceX, targetY - sourceY);
  const adaptiveCurvature = Math.min(0.24, Math.max(0.14, 38 / Math.max(dist, 80)));

  // Calculate default Bezier control points to check if curve clips an obstacle
  let defaultCp1: Point2D = { x: sourceX, y: sourceY };
  let defaultCp2: Point2D = { x: targetX, y: targetY };
  if (sourcePosition === Position.Right) defaultCp1.x += dist * adaptiveCurvature * 2.2;
  else if (sourcePosition === Position.Left) defaultCp1.x -= dist * adaptiveCurvature * 2.2;
  else if (sourcePosition === Position.Bottom) defaultCp1.y += dist * adaptiveCurvature * 2.2;
  else if (sourcePosition === Position.Top) defaultCp1.y -= dist * adaptiveCurvature * 2.2;

  if (targetPosition === Position.Left) defaultCp2.x -= dist * adaptiveCurvature * 2.2;
  else if (targetPosition === Position.Right) defaultCp2.x += dist * adaptiveCurvature * 2.2;
  else if (targetPosition === Position.Top) defaultCp2.y -= dist * adaptiveCurvature * 2.2;
  else if (targetPosition === Position.Bottom) defaultCp2.y += dist * adaptiveCurvature * 2.2;

  // Check if direct path or curve intersects any intermediate obstacle
  const collidingObstacles = relevantObstacles.filter((box) => {
    const directHit = segmentIntersectsBox(sourceX, sourceY, targetX, targetY, box, CLEARANCE_MARGIN);
    if (directHit) return true;
    if (routingStyle === 'curved') {
      return bezierIntersectsBox(
        { x: sourceX, y: sourceY },
        defaultCp1,
        defaultCp2,
        { x: targetX, y: targetY },
        box,
        CLEARANCE_MARGIN
      );
    }
    return false;
  });

  // If no obstacle collision:
  if (collidingObstacles.length === 0) {
    if (isMultiEdge) {
      return computeParallelCurvePath(
        sourceX,
        sourceY,
        targetX,
        targetY,
        parallelIndex,
        parallelCount,
        routingStyle
      );
    }

    if (routingStyle === 'curved') {
      const [path, lx, ly] = getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
        curvature: adaptiveCurvature,
      });
      const adjusted = adjustLabelPosition(lx, ly, sourceBox, targetBox);
      return { path, labelX: adjusted.x, labelY: adjusted.y, isDetour: false };
    } else if (routingStyle === 'straight') {
      const [path, lx, ly] = getStraightPath({
        sourceX,
        sourceY,
        targetX,
        targetY,
      });
      const adjusted = adjustLabelPosition(lx, ly, sourceBox, targetBox);
      return { path, labelX: adjusted.x, labelY: adjusted.y, isDetour: false };
    } else {
      const [path, lx, ly] = getSmoothStepPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
        borderRadius: routingStyle === 'step' ? 0 : 14,
      });
      const adjusted = adjustLabelPosition(lx, ly, sourceBox, targetBox);
      return { path, labelX: adjusted.x, labelY: adjusted.y, isDetour: false };
    }
  }

  // 2. Multi-Obstacle Detour Solver
  // Merge colliding obstacles into composite bounding envelope
  let minObsX = Infinity;
  let minObsY = Infinity;
  let maxObsX = -Infinity;
  let maxObsY = -Infinity;

  collidingObstacles.forEach((obs) => {
    minObsX = Math.min(minObsX, obs.x - CLEARANCE_MARGIN);
    minObsY = Math.min(minObsY, obs.y - CLEARANCE_MARGIN);
    maxObsX = Math.max(maxObsX, obs.x + obs.width + CLEARANCE_MARGIN);
    maxObsY = Math.max(maxObsY, obs.y + obs.height + CLEARANCE_MARGIN);
  });

  // Determine initial launch vector from source handle
  const leadOut = 24;
  let startLaunch: Point2D = { x: sourceX, y: sourceY };
  if (sourcePosition === Position.Right) startLaunch = { x: sourceX + leadOut, y: sourceY };
  else if (sourcePosition === Position.Left) startLaunch = { x: sourceX - leadOut, y: sourceY };
  else if (sourcePosition === Position.Top) startLaunch = { x: sourceX, y: sourceY - leadOut };
  else if (sourcePosition === Position.Bottom) startLaunch = { x: sourceX, y: sourceY + leadOut };

  // Determine approach vector into target handle
  let endApproach: Point2D = { x: targetX, y: targetY };
  if (targetPosition === Position.Left) endApproach = { x: targetX - leadOut, y: targetY };
  else if (targetPosition === Position.Right) endApproach = { x: targetX + leadOut, y: targetY };
  else if (targetPosition === Position.Top) endApproach = { x: targetX, y: targetY - leadOut };
  else if (targetPosition === Position.Bottom) endApproach = { x: targetX, y: targetY + leadOut };

  // Generate candidate corridors around the 4 sides of the composite obstacle
  const corridorTop: Point2D[] = [
    { x: sourceX, y: sourceY },
    startLaunch,
    { x: startLaunch.x, y: minObsY },
    { x: endApproach.x, y: minObsY },
    endApproach,
    { x: targetX, y: targetY },
  ];

  const corridorBottom: Point2D[] = [
    { x: sourceX, y: sourceY },
    startLaunch,
    { x: startLaunch.x, y: maxObsY },
    { x: endApproach.x, y: maxObsY },
    endApproach,
    { x: targetX, y: targetY },
  ];

  const corridorLeft: Point2D[] = [
    { x: sourceX, y: sourceY },
    startLaunch,
    { x: minObsX, y: startLaunch.y },
    { x: minObsX, y: endApproach.y },
    endApproach,
    { x: targetX, y: targetY },
  ];

  const corridorRight: Point2D[] = [
    { x: sourceX, y: sourceY },
    startLaunch,
    { x: maxObsX, y: startLaunch.y },
    { x: maxObsX, y: endApproach.y },
    endApproach,
    { x: targetX, y: targetY },
  ];

  const candidateCorridors = [corridorTop, corridorBottom, corridorLeft, corridorRight];

  // Score candidate routes by total length and secondary obstacle intersections
  let bestRoute = corridorTop;
  let bestScore = Infinity;

  for (const route of candidateCorridors) {
    let penalty = 0;
    let length = 0;

    for (let i = 0; i < route.length - 1; i++) {
      const p1 = route[i];
      const p2 = route[i + 1];
      length += Math.hypot(p2.x - p1.x, p2.y - p1.y);

      // Check if candidate route hits any other obstacle
      for (const obs of relevantObstacles) {
        if (segmentIntersectsBox(p1.x, p1.y, p2.x, p2.y, obs, 14)) {
          penalty += 5000;
        }
      }
    }

    const totalScore = length + penalty;
    if (totalScore < bestScore) {
      bestScore = totalScore;
      bestRoute = route;
    }
  }

  // Simplify collinear intermediate waypoints
  const simplifiedRoute: Point2D[] = [bestRoute[0]];
  for (let i = 1; i < bestRoute.length - 1; i++) {
    const prev = simplifiedRoute[simplifiedRoute.length - 1];
    const curr = bestRoute[i];
    const next = bestRoute[i + 1];

    const isCollinearX = Math.abs(prev.x - curr.x) < 1 && Math.abs(curr.x - next.x) < 1;
    const isCollinearY = Math.abs(prev.y - curr.y) < 1 && Math.abs(curr.y - next.y) < 1;

    if (!isCollinearX && !isCollinearY) {
      simplifiedRoute.push(curr);
    }
  }
  simplifiedRoute.push(bestRoute[bestRoute.length - 1]);

  // Adjust for parallel multi-edges
  if (isMultiEdge) {
    const shift = (parallelIndex - (parallelCount - 1) / 2) * 16;
    for (let i = 1; i < simplifiedRoute.length - 1; i++) {
      simplifiedRoute[i].x += shift;
      simplifiedRoute[i].y += shift;
    }
  }

  // Detect edge line crossings with crossingSegments
  const detectedCrossings: Point2D[] = [];
  if (crossingSegments.length > 0) {
    for (let i = 0; i < simplifiedRoute.length - 1; i++) {
      const p1 = simplifiedRoute[i];
      const p2 = simplifiedRoute[i + 1];
      for (const crossSeg of crossingSegments) {
        const pt = getLineIntersection(p1, p2, crossSeg.p1, crossSeg.p2);
        if (pt) {
          detectedCrossings.push(pt);
        }
      }
    }
  }

  // Render smooth SVG path through waypoints
  let finalPath = '';
  if (routingStyle === 'curved') {
    // Smooth quadratic/cubic spline through detour waypoints
    const parts = [`M ${simplifiedRoute[0].x} ${simplifiedRoute[0].y}`];
    for (let i = 1; i < simplifiedRoute.length; i++) {
      const prev = simplifiedRoute[i - 1];
      const curr = simplifiedRoute[i];
      const midX = (prev.x + curr.x) / 2;
      const midY = (prev.y + curr.y) / 2;
      parts.push(`Q ${prev.x} ${prev.y}, ${midX} ${midY}`);
      if (i === simplifiedRoute.length - 1) {
        parts.push(`L ${curr.x} ${curr.y}`);
      }
    }
    finalPath = parts.join(' ');
  } else {
    // Filleted Manhattan path with rounded corners & line jump hops
    finalPath = waypointsToFilletedPath(simplifiedRoute, 14, detectedCrossings);
  }

  const midIdx = Math.floor(simplifiedRoute.length / 2);
  const rawLabelX = (simplifiedRoute[midIdx - 1].x + simplifiedRoute[midIdx].x) / 2;
  const rawLabelY = (simplifiedRoute[midIdx - 1].y + simplifiedRoute[midIdx].y) / 2;
  const adjustedLabel = adjustLabelPosition(rawLabelX, rawLabelY, sourceBox, targetBox);

  return {
    path: finalPath,
    labelX: adjustedLabel.x,
    labelY: adjustedLabel.y,
    isDetour: true,
  };
}
