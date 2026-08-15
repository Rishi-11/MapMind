import React, { useMemo, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  ConnectionLineType,
  BackgroundVariant,
  Connection,
  addEdge,
  OnNodesChange,
  OnEdgesChange,
  NodeTypes,
  EdgeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { MapMindNode, MapMindEdge, CanvasSettings } from '@/types/graph';
import { CustomNode } from './CustomNode';
import { CANVAS_BACKGROUND_PRESETS } from '@/lib/canvasThemes';

interface DiagramCanvasProps {
  nodes: MapMindNode[];
  edges: MapMindEdge[];
  onNodesChange: OnNodesChange<MapMindNode>;
  onEdgesChange: OnEdgesChange<MapMindEdge>;
  setEdges: React.Dispatch<React.SetStateAction<MapMindEdge[]>>;
  settings: CanvasSettings;
  onToggleCollapse: (nodeId: string) => void;
  onToggleLock: (nodeId: string) => void;
  onUpdateNodeLabel: (nodeId: string, label: string) => void;
  onAddChildNode: (nodeId: string) => void;
  onAddSiblingNode: (nodeId: string) => void;
  onStartEditingNode: (nodeId: string) => void;
  onStopEditingNode: (nodeId: string) => void;
  onSelectNode: (node: MapMindNode | null) => void;
  onDeleteNode?: (nodeId: string) => void;
}

const nodeTypes: NodeTypes = {
  custom: CustomNode,
};

const edgeTypes: EdgeTypes = {};

export const DiagramCanvas: React.FC<DiagramCanvasProps> = ({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  setEdges,
  settings,
  onToggleCollapse,
  onToggleLock,
  onUpdateNodeLabel,
  onAddChildNode,
  onAddSiblingNode,
  onStartEditingNode,
  onStopEditingNode,
  onSelectNode,
  onDeleteNode,
}) => {
  // Augment node data with handlers, sketch mode, and locking constraints
  const augmentedNodes = useMemo(() => {
    return nodes.map((node) => ({
      ...node,
      // If node is marked locked, disable dragging so it sticks firmly in place
      draggable: !node.data?.locked,
      data: {
        ...node.data,
        sketchMode: settings.sketchMode,
        onToggleCollapse,
        onToggleLock,
        onUpdateLabel: onUpdateNodeLabel,
        onAddChild: onAddChildNode,
        onAddSibling: onAddSiblingNode,
        onStartEditing: onStartEditingNode,
        onStopEditing: onStopEditingNode,
        onSelect: (nodeId: string) => {
          const target = nodes.find((n) => n.id === nodeId) || null;
          onSelectNode(target);
        },
      },
    }));
  }, [
    nodes,
    settings.sketchMode,
    onToggleCollapse,
    onToggleLock,
    onUpdateNodeLabel,
    onAddChildNode,
    onAddSiblingNode,
    onStartEditingNode,
    onStopEditingNode,
    onSelectNode,
  ]);

  const nodeMap = useMemo(() => {
    const map = new Map<string, MapMindNode>();
    nodes.forEach((n) => map.set(n.id, n));
    return map;
  }, [nodes]);

  // Filter visible edges & dynamically compute optimal source/target connection handles
  const visibleEdges = useMemo(() => {
    const visibleNodeIds = new Set(nodes.filter((n) => !n.data?.hidden).map((n) => n.id));

    return edges
      .filter((e) => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target))
      .map((edge) => {
        const sourceNode = nodeMap.get(edge.source);
        const targetNode = nodeMap.get(edge.target);

        let sourceHandle = 'source-right';
        let targetHandle = 'target-left';

        if (sourceNode && targetNode) {
          const dx = targetNode.position.x - sourceNode.position.x;
          const dy = targetNode.position.y - sourceNode.position.y;

          // If horizontal displacement is dominant
          if (Math.abs(dx) >= Math.abs(dy) * 0.8) {
            if (dx < 0) {
              // Target is to the LEFT of Source -> connect from Left to Right
              sourceHandle = 'source-left';
              targetHandle = 'target-right';
            } else {
              // Target is to the RIGHT of Source -> connect from Right to Left
              sourceHandle = 'source-right';
              targetHandle = 'target-left';
            }
          } else {
            // Vertical displacement is dominant
            if (dy < 0) {
              // Target is ABOVE Source
              sourceHandle = 'source-top';
              targetHandle = 'target-bottom';
            } else {
              // Target is BELOW Source
              sourceHandle = 'source-bottom';
              targetHandle = 'target-top';
            }
          }
        }

        return {
          ...edge,
          sourceHandle,
          targetHandle,
          type: 'smoothstep',
          style: {
            strokeWidth: settings.sketchMode ? 2 : 1.8,
            stroke: settings.sketchMode ? '#475569' : '#94a3b8',
            ...edge.style,
          },
        };
      });
  }, [edges, nodes, nodeMap, settings.sketchMode]);

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            type: 'smoothstep',
          },
          eds
        )
      );
    },
    [setEdges]
  );

  // Background Theme Config
  const bgPreset =
    CANVAS_BACKGROUND_PRESETS[settings.backgroundPreset || 'warm'] ||
    CANVAS_BACKGROUND_PRESETS.warm;
  const isDark = settings.theme === 'dark';
  const tone = isDark ? bgPreset.dark : bgPreset.light;

  return (
    <div
      className="w-full h-full relative transition-colors duration-200"
      style={{ backgroundColor: tone.bg }}
    >
      <ReactFlow
        nodes={augmentedNodes}
        edges={visibleEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={(_event, node) => onSelectNode(node)}
        onPaneClick={() => onSelectNode(null)}
        deleteKeyCode={null}
        onNodesDelete={(deleted) => {
          if (deleted && deleted.length > 0 && onDeleteNode) {
            onDeleteNode(deleted[0].id);
          }
        }}
        snapToGrid={settings.gridSnap}
        snapGrid={[settings.gridSize, settings.gridSize]}
        connectionLineType={ConnectionLineType.SmoothStep}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: false,
        }}
        fitView
        minZoom={0.1}
        maxZoom={2.5}
        attributionPosition="bottom-left"
        className="mapmind-canvas"
      >
        {settings.gridType !== 'none' && (
          <Background
            variant={
              settings.gridType === 'lines'
                ? BackgroundVariant.Lines
                : settings.gridType === 'cross'
                ? BackgroundVariant.Cross
                : BackgroundVariant.Dots
            }
            gap={settings.gridSize}
            size={settings.gridType === 'cross' ? 6 : 1.4}
            color={tone.gridColor}
          />
        )}
        <Controls
          showInteractive={false}
          className="!bg-white dark:!bg-slate-800 !border !border-slate-200 dark:!border-slate-700 !shadow-panel dark:!shadow-panel-dark !rounded-xl !overflow-hidden"
        />
        <MiniMap
          nodeColor={(node) => {
            const data = node.data as { colorTheme?: string };
            switch (data?.colorTheme) {
              case 'blue': return '#3b82f6';
              case 'emerald': return '#10b981';
              case 'amber': return '#f59e0b';
              case 'rose': return '#f43f5e';
              case 'purple': return '#8b5cf6';
              case 'cyan': return '#06b6d4';
              default: return '#94a3b8';
            }
          }}
          maskColor={tone.maskColor}
          className="!bg-white/90 dark:!bg-slate-800/90 !border !border-slate-200 dark:!border-slate-700 !rounded-xl !shadow-panel dark:!shadow-panel-dark !bottom-4 !right-4"
        />
      </ReactFlow>
    </div>
  );
};
