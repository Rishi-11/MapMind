import { MapMindNode, MapMindEdge } from './graph';

export interface HistorySnapshot {
  id: string;
  timestamp: number;
  formattedTime: string;
  name: string;
  nodeCount: number;
  edgeCount: number;
  state: {
    nodes: MapMindNode[];
    edges: MapMindEdge[];
  };
  trigger: 'auto-save' | 'manual-save' | 'layout-change' | 'import';
}

export interface HistoryStats {
  totalSnapshots: number;
  lastSavedAt: number | null;
  nextAutoSaveInSeconds: number;
}
