import { MapMindNode, MapMindEdge, LayoutDensity } from '@/types/graph';
import { layoutWorkerBridge } from '../workers/layoutWorkerBridge';

export interface ElkLayoutOptions {
  density?: LayoutDensity;
  nodeWidth?: number;
  nodeHeight?: number;
  spacing?: number;
}

/**
 * Calculates a balanced mind map layout off the main thread via Web Worker.
 * Uses compact multi-level grid wrapping to prevent single infinitely long lines,
 * and ensures strict non-overlapping collision avoidance across all cards.
 */
export async function getElkLayout(
  nodes: MapMindNode[],
  edges: MapMindEdge[],
  options: ElkLayoutOptions = {}
): Promise<{ nodes: MapMindNode[]; edges: MapMindEdge[] }> {
  return layoutWorkerBridge.calculateLayout(nodes, edges, {
    direction: 'BALANCED_MINDMAP',
    density: options.density,
    nodeWidth: options.nodeWidth,
    nodeHeight: options.nodeHeight,
  });
}

/**
 * Standard directional tree layout helper using background Web Worker
 */
export async function runStandardElkTree(
  nodes: MapMindNode[],
  edges: MapMindEdge[],
  direction: 'DOWN' | 'RIGHT' | 'LEFT' | 'UP' = 'DOWN',
  options: ElkLayoutOptions = {}
): Promise<{ nodes: MapMindNode[]; edges: MapMindEdge[] }> {
  return layoutWorkerBridge.calculateLayout(nodes, edges, {
    direction: direction === 'DOWN' ? 'TB' : direction === 'UP' ? 'BT' : direction === 'LEFT' ? 'RL' : 'LR',
    density: options.density,
    nodeWidth: options.nodeWidth,
    nodeHeight: options.nodeHeight,
  });
}
