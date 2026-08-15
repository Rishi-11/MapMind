import { Node, Edge } from '@xyflow/react';

export type LayoutDirection = 'TB' | 'LR' | 'BT' | 'RL' | 'BALANCED_MINDMAP';

export type NodeColorTheme = 'slate' | 'blue' | 'emerald' | 'amber' | 'rose' | 'purple' | 'cyan';

export type NodeShape = 'card' | 'pill' | 'sharp' | 'cloud' | 'banner' | 'diamond';

export type NodeCardStyle = 'default' | 'bold' | 'classy' | 'minimal' | 'gradient' | 'notion';

export type CanvasBackgroundPreset =
  | 'warm'       // Warm Paper / Cream
  | 'slate'      // Cool Slate
  | 'solarized'  // Solarized Ochre
  | 'charcoal'   // Midnight Charcoal
  | 'sage'       // Botanical Sage
  | 'rose'       // Rosé Tint
  | 'cyber';     // Cyber Space

export interface CustomNodeData extends Record<string, unknown> {
  label: string;
  sublabel?: string;
  colorTheme?: NodeColorTheme;
  collapsed?: boolean;
  hidden?: boolean;
  tags?: string[];
  isRoot?: boolean;
  childCount?: number;
  shape?: NodeShape;
  cardStyle?: NodeCardStyle;
  notes?: string;
  isEditing?: boolean;
  locked?: boolean;
}

export type MapMindNode = Node<CustomNodeData>;
export type MapMindEdge = Edge;

export interface MindMapGraphState {
  nodes: MapMindNode[];
  edges: MapMindEdge[];
}

export interface CanvasSettings {
  sketchMode: boolean;
  gridSnap: boolean;
  gridSize: number;
  gridType: 'dots' | 'lines' | 'cross' | 'none';
  theme: 'light' | 'dark';
  backgroundPreset: CanvasBackgroundPreset;
}
