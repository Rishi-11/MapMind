import { MapMindNode, MapMindEdge } from '@/types/graph';
import { getCompactWrappedLayout, CompactLayoutOptions } from '../layouts/compactWrappingLayout';
import { resolveAllGraphCollisions, resolveNodeDragCollision } from '../collision/collisionAvoidance';
import { WorkerRequest, WorkerResponse } from './layout.worker';

class LayoutWorkerBridge {
  private worker: Worker | null = null;
  private callbacks = new Map<string, { resolve: (val: any) => void; reject: (err: any) => void; timeout: any }>();
  private reqCounter = 0;
  private isWorkerSupported = typeof window !== 'undefined' && typeof Worker !== 'undefined';

  constructor() {
    this.initWorker();
  }

  private initWorker() {
    if (!this.isWorkerSupported) return;

    try {
      this.worker = new Worker(
        new URL('./layout.worker.ts', import.meta.url),
        { type: 'module' }
      );

      this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        const { id, success, payload, error } = event.data;
        const cb = this.callbacks.get(id);
        if (cb) {
          clearTimeout(cb.timeout);
          this.callbacks.delete(id);
          if (success) {
            cb.resolve(payload);
          } else {
            cb.reject(new Error(error || 'Worker execution failed'));
          }
        }
      };

      this.worker.onerror = (err) => {
        console.warn('Layout Web Worker encountered an error; falling back to main-thread execution.', err);
      };
    } catch (e) {
      console.warn('Failed to initialize Layout Web Worker, using main thread fallback.', e);
      this.worker = null;
    }
  }

  private sendRequest<T>(type: WorkerRequest['type'], payload: any, fallbackFn: () => T): Promise<T> {
    if (!this.worker) {
      return Promise.resolve(fallbackFn());
    }

    const id = `req_${++this.reqCounter}_${Date.now()}`;

    return new Promise<T>((resolve, reject) => {
      // 5-second timeout safeguard: falls back to main thread if worker hangs
      const timeout = setTimeout(() => {
        this.callbacks.delete(id);
        console.warn(`Worker task ${type} timed out; resolving on main thread.`);
        try {
          resolve(fallbackFn());
        } catch (e) {
          reject(e);
        }
      }, 5000);

      this.callbacks.set(id, { resolve, reject, timeout });

      try {
        this.worker!.postMessage({ id, type, payload } as WorkerRequest);
      } catch (err) {
        clearTimeout(timeout);
        this.callbacks.delete(id);
        resolve(fallbackFn());
      }
    });
  }

  /**
   * Computes compact 2D graph layout in background Web Worker
   */
  public calculateLayout(
    nodes: MapMindNode[],
    edges: MapMindEdge[],
    options: CompactLayoutOptions = {}
  ): Promise<{ nodes: MapMindNode[]; edges: MapMindEdge[] }> {
    return this.sendRequest(
      'CALCULATE_LAYOUT',
      { nodes, edges, options },
      () => getCompactWrappedLayout(nodes, edges, options)
    );
  }

  /**
   * Solves non-penetrating graph collisions in background Web Worker
   */
  public resolveCollisions(nodes: MapMindNode[], margin?: number): Promise<MapMindNode[]> {
    return this.sendRequest(
      'RESOLVE_ALL_COLLISIONS',
      { nodes, margin },
      () => resolveAllGraphCollisions(nodes, margin)
    );
  }

  /**
   * Solves drag drop collision in background Web Worker
   */
  public resolveDragCollision(draggedNodeId: string, nodes: MapMindNode[], margin?: number): Promise<MapMindNode[]> {
    return this.sendRequest(
      'RESOLVE_DRAG_COLLISION',
      { draggedNodeId, nodes, margin },
      () => resolveNodeDragCollision(draggedNodeId, nodes, margin)
    );
  }
}

export const layoutWorkerBridge = new LayoutWorkerBridge();
