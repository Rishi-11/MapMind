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
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { MapMindNode, MapMindEdge, CanvasSettings, NodeColorTheme } from '@/types/graph';
import { CustomNode } from './CustomNode';
import { CustomEdge } from './CustomEdge';
import { CANVAS_BACKGROUND_PRESETS } from '@/lib/canvasThemes';
import { getNodeBoundingBox, resolveNodeDragCollision } from '@/lib/collision/collisionAvoidance';

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
  onExpandWithAi?: (nodeId: string) => void;
}

const nodeTypes: NodeTypes = {
  custom: CustomNode,
};

const edgeTypes: EdgeTypes = {
  custom: CustomEdge,
};

const BRANCH_STROKE_COLORS: Record<string, { light: string; dark: string }> = {
  blue: { light: '#3b82f6', dark: '#60a5fa' },
  emerald: { light: '#10b981', dark: '#34d399' },
  purple: { light: '#8b5cf6', dark: '#a78bfa' },
  amber: { light: '#f59e0b', dark: '#fbbf24' },
  rose: { light: '#f43f5e', dark: '#fb7185' },
  cyan: { light: '#06b6d4', dark: '#22d3ee' },
  slate: { light: '#64748b', dark: '#94a3b8' },
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
  onExpandWithAi,
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
        onExpandWithAi,
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
    onExpandWithAi,
    onSelectNode,
    onSelectEdge,
  ]);

  const nodeMap = useMemo(() => {
    const map = new Map<string, MapMindNode>();
    nodes.forEach((n) => map.set(n.id, n));
    return map;
  }, [nodes]);

  // Extract obstacle bounding boxes from all visible cards for collision-avoiding edge routing
  const obstacleBoxes = useMemo(() => {
    return nodes
      .filter((n) => !n.data?.hidden)
      .map((n) => getNodeBoundingBox(n));
  }, [nodes]);

  // Background Theme Config
  const bgPreset =
    CANVAS_BACKGROUND_PRESETS[settings.backgroundPreset || 'warm'] ||
    CANVAS_BACKGROUND_PRESETS.warm;
  const isDark = settings.theme === 'dark';
  const tone = isDark ? bgPreset.dark : bgPreset.light;

  // Filter visible edges, group multi-edges and self-loops, and compute obstacle avoidance routing
  const visibleEdges = useMemo(() => {
    const visibleNodeIds = new Set(nodes.filter((n) => !n.data?.hidden).map((n) => n.id));
    const globalRouting = settings.edgeRoutingStyle || 'curved';

    const rawVisible = edges.filter(
      (e) => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target)
    );

    // Build approximate center segments for all raw visible edges for line jump detection
    const allSegments = rawVisible.map((e) => {
      const s = nodeMap.get(e.source);
      const t = nodeMap.get(e.target);
      return {
        edgeId: e.id,
        sourceId: e.source,
        targetId: e.target,
        p1: {
          x: (s?.position.x || 0) + (s?.measured?.width || 190) / 2,
          y: (s?.position.y || 0) + (s?.measured?.height || 75) / 2,
        },
        p2: {
          x: (t?.position.x || 0) + (t?.measured?.width || 190) / 2,
          y: (t?.position.y || 0) + (t?.measured?.height || 75) / 2,
        },
      };
    });

    // Group parallel edges by node pair and self-loops by node id
    const pairGroups = new Map<string, string[]>();
    const selfLoopGroups = new Map<string, string[]>();

    rawVisible.forEach((e) => {
      if (e.source === e.target) {
        const list = selfLoopGroups.get(e.source) || [];
        list.push(e.id);
        selfLoopGroups.set(e.source, list);
      } else {
        const pairKey = [e.source, e.target].sort().join(':::');
        const list = pairGroups.get(pairKey) || [];
        list.push(e.id);
        pairGroups.set(pairKey, list);
      }
    });

    return rawVisible.map((edge) => {
      const sourceNode = nodeMap.get(edge.source);
      const targetNode = nodeMap.get(edge.target);
      const isSelfLoop = edge.source === edge.target;

      let sourceHandle = 'source-right';
      let targetHandle = 'target-left';
      let parallelIndex = 0;
      let parallelCount = 1;
      let selfLoopIndex = 0;

      if (isSelfLoop) {
        // Self-loop handle placement (Top-to-Top or Top-to-Right)
        sourceHandle = 'source-top';
        targetHandle = 'target-top';
        const loopList = selfLoopGroups.get(edge.source) || [];
        selfLoopIndex = loopList.indexOf(edge.id);
      } else if (sourceNode && targetNode) {
        const pairKey = [edge.source, edge.target].sort().join(':::');
        const pairList = pairGroups.get(pairKey) || [];
        parallelIndex = pairList.indexOf(edge.id);
        parallelCount = pairList.length;

        const dx = targetNode.position.x - sourceNode.position.x;
        const dy = targetNode.position.y - sourceNode.position.y;

        // If horizontal displacement is dominant
        if (Math.abs(dx) >= Math.abs(dy) * 0.8) {
          if (dx < 0) {
            // Target is to the LEFT of Source
            sourceHandle = 'source-left';
            targetHandle = 'target-right';
          } else {
            // Target is to the RIGHT of Source
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

      // Dynamic branch color inheritance:
      // Edge inherits branch color from target (child branch) or source, or explicit edge color
      const branchColorKey: NodeColorTheme =
        (edge.data?.colorTheme as NodeColorTheme) ||
        (targetNode?.data?.colorTheme as NodeColorTheme) ||
        (sourceNode?.data?.colorTheme as NodeColorTheme) ||
        'blue';

      const branchColorPalette = BRANCH_STROKE_COLORS[branchColorKey] || BRANCH_STROKE_COLORS.blue;
      const branchColor = isDark ? branchColorPalette.dark : branchColorPalette.light;

      const edgeStroke = isSelected
        ? isDark ? '#60a5fa' : '#2563eb'
        : isDimmed
        ? isDark ? '#334155' : '#cbd5e1'
        : branchColor;

      const markerEnd = {
        type: MarkerType.ArrowClosed,
        color: edgeStroke,
        width: 15,
        height: 15,
      };

      // Crossing candidate segments for line jump hops
      const crossingSegments = allSegments
        .filter((seg) => seg.edgeId !== edge.id && seg.sourceId !== edge.source && seg.targetId !== edge.target)
        .map((seg) => ({ p1: seg.p1, p2: seg.p2, edgeId: seg.edgeId }));

      return {
        ...edge,
        sourceHandle,
        targetHandle,
        type: 'custom',
        selected: isSelected,
        markerEnd,
        data: {
          ...edge.data,
          colorTheme: branchColorKey,
          label: edgeLabel,
          routingStyle: edgeRouting,
          isSelfLoop,
          selfLoopIndex,
          parallelIndex,
          parallelCount,
          obstacleBoxes,
          canvasBg: tone.bg,
          crossingSegments,
          onUpdateLabel: onUpdateEdgeLabel,
          onStartEditing: onStartEditingEdge,
          onStopEditing: onStopEditingEdge,
          onDelete: onDeleteEdge,
          onSelect: onSelectEdge,
        },
        style: {
          strokeWidth: isSelected ? 2.8 : settings.sketchMode ? 2.2 : isDimmed ? 1.2 : 2.0,
          stroke: edgeStroke,
          opacity: isDimmed ? 0.15 : 1,
          transition: 'opacity 0.3s ease, stroke 0.3s ease, stroke-width 0.2s ease',
          ...edge.style,
        },
      };
    });
  }, [
    edges,
    nodes,
    nodeMap,
    obstacleBoxes,
    settings.sketchMode,
    settings.edgeRoutingStyle,
    settings.theme,
    settings.backgroundPreset,
    tone.bg,
    isDark,
    selectedEdgeId,
    onUpdateEdgeLabel,
    onStartEditingEdge,
    onStopEditingEdge,
    onDeleteEdge,
    onSelectEdge,
  ]);

  const onConnect = useCallback(
    (connection: Connection) => {
      const newEdgeId = `e_${connection.source}_${connection.target}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            id: newEdgeId,
            type: 'custom',
            data: {
              routingStyle: settings.edgeRoutingStyle || 'curved',
              isSelfLoop: connection.source === connection.target,
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
      const isAltPressed = 'altKey' in event ? event.altKey : false;
      // When anti-collision is ON: strictly prevent any card overlap even if user tried to place on top!
      // Only when anti-collision is OFF (or Alt pressed): allow cards to overlap.
      if (settings.collisionAvoidance && !isAltPressed) {
        setNodes((currentNodes) => {
          return resolveNodeDragCollision(node.id, currentNodes);
        });
      }
    },
    [settings.collisionAvoidance, setNodes]
  );

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
        onlyRenderVisibleElements={nodes.length > 25}
        elevateNodesOnSelect={false}
        nodesFocusable={false}
        edgesFocusable={false}
        fitView
        minZoom={0.06}
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
