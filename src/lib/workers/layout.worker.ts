import { getCompactWrappedLayout } from '../layouts/compactWrappingLayout';
import { resolveAllGraphCollisions, resolveNodeDragCollision } from '../collision/collisionAvoidance';
import { computeBranchMetrics, computeSpotlightSet } from '../branchUtils';

export interface WorkerRequest {
  id: string;
  type: 'CALCULATE_LAYOUT' | 'RESOLVE_ALL_COLLISIONS' | 'RESOLVE_DRAG_COLLISION' | 'BRANCH_METRICS' | 'SPOTLIGHT';
  payload: any;
}

export interface WorkerResponse {
  id: string;
  success: boolean;
  type: string;
  payload?: any;
  error?: string;
}

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const { id, type, payload } = event.data;

  try {
    switch (type) {
      case 'CALCULATE_LAYOUT': {
        const { nodes, edges, options } = payload;
        const result = getCompactWrappedLayout(nodes, edges, options);
        self.postMessage({ id, success: true, type, payload: result } as WorkerResponse);
        break;
      }

      case 'RESOLVE_ALL_COLLISIONS': {
        const { nodes, margin } = payload;
        const result = resolveAllGraphCollisions(nodes, margin);
        self.postMessage({ id, success: true, type, payload: result } as WorkerResponse);
        break;
      }

      case 'RESOLVE_DRAG_COLLISION': {
        const { draggedNodeId, nodes, margin } = payload;
        const result = resolveNodeDragCollision(draggedNodeId, nodes, margin);
        self.postMessage({ id, success: true, type, payload: result } as WorkerResponse);
        break;
      }

      case 'BRANCH_METRICS': {
        const { nodes, edges } = payload;
        const result = computeBranchMetrics(nodes, edges);
        // Convert Maps to serializable plain objects
        const serializable = {
          depthMap: Object.fromEntries(result.depthMap),
          inheritedColorMap: Object.fromEntries(result.inheritedColorMap),
          descendantCountMap: Object.fromEntries(result.descendantCountMap),
          childrenMap: Object.fromEntries(result.childrenMap),
          parentMap: Object.fromEntries(result.parentMap),
        };
        self.postMessage({ id, success: true, type, payload: serializable } as WorkerResponse);
        break;
      }

      case 'SPOTLIGHT': {
        const { targetNodeId, nodes, edges } = payload;
        const result = computeSpotlightSet(targetNodeId, nodes, edges);
        const serializable = result ? Array.from(result) : null;
        self.postMessage({ id, success: true, type, payload: serializable } as WorkerResponse);
        break;
      }

      default:
        self.postMessage({ id, success: false, type, error: `Unknown worker action: ${type}` } as WorkerResponse);
    }
  } catch (err: any) {
    self.postMessage({ id, success: false, type, error: err?.message || String(err) } as WorkerResponse);
  }
};
