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
  title?: string;
  sublabel?: string;
  colorTheme?: NodeColorTheme;
  collapsed?: boolean;
  hidden?: boolean;
  tags?: string[];
  isRoot?: boolean;
  childCount?: number;
  descendantCount?: number;
  isDimmed?: boolean;
  isSpotlightTarget?: boolean;
  isLOD?: boolean;
  shape?: NodeShape;
  cardStyle?: NodeCardStyle;
  notes?: string;
  isEditing?: boolean;
  locked?: boolean;
  pageId?: string;
  linkedNoteTitle?: string;
  wikiLinks?: string[];
}

export type EdgeRoutingStyle = 'curved' | 'smoothstep' | 'straight' | 'step';

export type LayoutDensity = 'compact' | 'balanced' | 'spacious';

export interface CustomEdgeData extends Record<string, unknown> {
  label?: string;
  comment?: string;
  routingStyle?: EdgeRoutingStyle;
  isEditing?: boolean;
  colorTheme?: NodeColorTheme;
  animated?: boolean;
  parallelIndex?: number;
  parallelCount?: number;
  isSelfLoop?: boolean;
  selfLoopIndex?: number;
  obstacleAvoidance?: boolean;
  obstacleBoxes?: Array<{ id: string; x: number; y: number; width: number; height: number }>;
  onUpdateLabel?: (edgeId: string, label: string) => void;
  onStartEditing?: (edgeId: string) => void;
  onStopEditing?: (edgeId: string) => void;
  onDelete?: (edgeId: string) => void;
  onSelect?: (edgeId: string) => void;
}

export type MapMindNode = Node<CustomNodeData>;
export type MapMindEdge = Edge<CustomEdgeData>;

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
  edgeRoutingStyle: EdgeRoutingStyle;
  layoutDensity: LayoutDensity;
  collisionAvoidance: boolean;
}
