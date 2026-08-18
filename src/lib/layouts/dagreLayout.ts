import { MapMindNode, MapMindEdge, LayoutDensity } from '@/types/graph';
import { layoutWorkerBridge } from '../workers/layoutWorkerBridge';
import { getCompactWrappedLayout } from './compactWrappingLayout';

export interface DagreLayoutOptions {
  direction?: 'TB' | 'LR' | 'BT' | 'RL';
  density?: LayoutDensity;
  nodeWidth?: number;
  nodeHeight?: number;
  rankSep?: number;
  nodeSep?: number;
}

/**
 * Calculates hierarchical layout coordinates in background Web Worker
 * with compact child wrapping and strict collision avoidance.
 */
export async function getDagreLayout(
  nodes: MapMindNode[],
  edges: MapMindEdge[],
  options: DagreLayoutOptions = {}
): Promise<{ nodes: MapMindNode[]; edges: MapMindEdge[] }> {
  return layoutWorkerBridge.calculateLayout(nodes, edges, {
    direction: options.direction || 'TB',
    density: options.density,
    nodeWidth: options.nodeWidth,
    nodeHeight: options.nodeHeight,
  });
}

/**
 * Synchronous fallback if needed
 */
export function getDagreLayoutSync(
  nodes: MapMindNode[],
  edges: MapMindEdge[],
  options: DagreLayoutOptions = {}
): { nodes: MapMindNode[]; edges: MapMindEdge[] } {
  return getCompactWrappedLayout(nodes, edges, {
    direction: options.direction || 'TB',
    density: options.density,
    nodeWidth: options.nodeWidth,
    nodeHeight: options.nodeHeight,
  });
}
