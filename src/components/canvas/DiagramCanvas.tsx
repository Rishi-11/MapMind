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
  useStore,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { MapMindNode, MapMindEdge, CanvasSettings } from '@/types/graph';
import { CustomNode } from './CustomNode';
import { CustomEdge } from './CustomEdge';
import { CANVAS_BACKGROUND_PRESETS } from '@/lib/canvasThemes';
import { resolveNodeDragCollision } from '@/lib/collision/collisionAvoidance';

interface DiagramCanvasProps {
  nodes: MapMindNode[];
  edges: MapMindEdge[];
  onNodesChange: OnNodesChange<MapMindNode>;
  onEdgesChange: OnEdgesChange<MapMindEdge>;
  setEdges: React.Dispatch<React.SetStateAction<MapMindEdge[]>>;
  setNodes: React.Dispatch<React.SetStateAction<MapMindNode[]>>;
  settings: CanvasSettings;
  selectedEdgeId?: string | null;
  onToggleCollapse: (nodeId: string) => void;
  onToggleLock: (nodeId: string) => void;
  onUpdateNodeLabel: (nodeId: string, label: string) => void;
  onAddChildNode: (nodeId: string) => void;
  onAddSiblingNode: (nodeId: string) => void;
  onStartEditingNode: (nodeId: string) => void;
  onStopEditingNode: (nodeId: string) => void;
  onSelectNode: (node: MapMindNode | null) => void;
  onSelectEdge?: (edgeId: string | null) => void;
  onUpdateEdgeLabel?: (edgeId: string, label: string) => void;
  onStartEditingEdge?: (edgeId: string) => void;
  onStopEditingEdge?: (edgeId: string) => void;
  onDeleteNode?: (nodeId: string) => void;
  onDeleteEdge?: (edgeId: string) => void;
}

const nodeTypes: NodeTypes = {
  custom: CustomNode,
};

const edgeTypes: EdgeTypes = {
  custom: CustomEdge,
};

export const DiagramCanvas: React.FC<DiagramCanvasProps> = ({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  setEdges,
  setNodes,
  settings,
  selectedEdgeId,
  onToggleCollapse,
  onToggleLock,
  onUpdateNodeLabel,
  onAddChildNode,
  onAddSiblingNode,
  onStartEditingNode,
  onStopEditingNode,
  onSelectNode,
  onSelectEdge,
  onUpdateEdgeLabel,
  onStartEditingEdge,
  onStopEditingEdge,
  onDeleteNode,
  onDeleteEdge,
}) => {
  const zoom = useStore((s) => s.transform[2]);
  const isLOD = zoom < 0.55;

  // Augment node data with handlers, sketch mode, LOD, and locking constraints
  const augmentedNodes = useMemo(() => {
    return nodes.map((node) => ({
      ...node,
      // If node is marked locked, disable dragging so it sticks firmly in place
      draggable: !node.data?.locked,
      data: {
        ...node.data,
        sketchMode: settings.sketchMode,
        isLOD: node.data?.isLOD !== undefined ? node.data.isLOD : isLOD,
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
          onSelectEdge?.(null);
        },
      },
    }));
  }, [
    nodes,
    settings.sketchMode,
    isLOD,
    onToggleCollapse,
    onToggleLock,
    onUpdateNodeLabel,
    onAddChildNode,
    onAddSiblingNode,
    onStartEditingNode,
    onStopEditingNode,
    onSelectNode,
    onSelectEdge,
  ]);

  const nodeMap = useMemo(() => {
    const map = new Map<string, MapMindNode>();
    nodes.forEach((n) => map.set(n.id, n));
    return map;
  }, [nodes]);

  // Filter visible edges & dynamically compute optimal source/target handles + dynamic routing
  const visibleEdges = useMemo(() => {
    const visibleNodeIds = new Set(nodes.filter((n) => !n.data?.hidden).map((n) => n.id));
    const globalRouting = settings.edgeRoutingStyle || 'curved';

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

        const isDimmed = Boolean(sourceNode?.data?.isDimmed || targetNode?.data?.isDimmed);
        const isSelected = edge.id === selectedEdgeId;
        const edgeRouting = edge.data?.routingStyle || globalRouting;
        const edgeLabel = edge.data?.label || (typeof edge.label === 'string' ? edge.label : undefined);

        return {
          ...edge,
          sourceHandle,
          targetHandle,
          type: 'custom',
          selected: isSelected,
          data: {
            ...edge.data,
            label: edgeLabel,
            routingStyle: edgeRouting,
            onUpdateLabel: onUpdateEdgeLabel,
            onStartEditing: onStartEditingEdge,
            onStopEditing: onStopEditingEdge,
            onDelete: onDeleteEdge,
            onSelect: onSelectEdge,
          },
          style: {
            strokeWidth: isSelected ? 2.5 : settings.sketchMode ? 2 : isDimmed ? 1 : 1.8,
            stroke: isSelected
              ? '#3b82f6'
              : isDimmed
              ? '#cbd5e1'
              : settings.sketchMode
              ? '#475569'
              : '#94a3b8',
            opacity: isDimmed ? 0.12 : 1,
            transition: 'opacity 0.3s ease, stroke 0.3s ease, stroke-width 0.2s ease',
            ...edge.style,
          },
        };
      });
  }, [
    edges,
    nodes,
    nodeMap,
    settings.sketchMode,
    settings.edgeRoutingStyle,
    selectedEdgeId,
    onUpdateEdgeLabel,
    onStartEditingEdge,
    onStopEditingEdge,
    onDeleteEdge,
    onSelectEdge,
  ]);

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            type: 'custom',
            data: {
              routingStyle: settings.edgeRoutingStyle || 'curved',
            },
          },
          eds
        )
      );
    },
    [setEdges, settings.edgeRoutingStyle]
  );

  // Handle Drag Stop with Collision Avoidance
  const handleNodeDragStop = useCallback(
    (event: MouseEvent | TouchEvent, node: MapMindNode) => {
      // Check for collision avoidance setting with manual override (Alt key)
      const isAltPressed = 'altKey' in event ? event.altKey : false;
      if (settings.collisionAvoidance && !isAltPressed) {
        setNodes((currentNodes) => {
          return resolveNodeDragCollision(node.id, currentNodes);
        });
      }
    },
    [settings.collisionAvoidance, setNodes]
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
        onNodeDragStop={handleNodeDragStop}
        onNodeClick={(_event, node) => {
          onSelectNode(node);
          onSelectEdge?.(null);
        }}
        onEdgeClick={(_event, edge) => {
          onSelectEdge?.(edge.id);
          onSelectNode(null);
        }}
        onPaneClick={() => {
          onSelectNode(null);
          onSelectEdge?.(null);
        }}
        deleteKeyCode={null}
        onNodesDelete={(deleted) => {
          if (deleted && deleted.length > 0 && onDeleteNode) {
            onDeleteNode(deleted[0].id);
          }
        }}
        snapToGrid={settings.gridSnap}
        snapGrid={[settings.gridSize, settings.gridSize]}
        connectionLineType={
          settings.edgeRoutingStyle === 'straight'
            ? ConnectionLineType.Straight
            : settings.edgeRoutingStyle === 'step'
            ? ConnectionLineType.Step
            : settings.edgeRoutingStyle === 'smoothstep'
            ? ConnectionLineType.SmoothStep
            : ConnectionLineType.Bezier
        }
        defaultEdgeOptions={{
          type: 'custom',
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
