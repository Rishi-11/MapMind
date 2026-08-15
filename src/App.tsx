import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';

import { MapMindNode, MapMindEdge, CanvasSettings, LayoutDirection } from '@/types/graph';
import { DiagramCanvas } from '@/components/canvas/DiagramCanvas';
import { HeaderToolbar } from '@/components/ui/HeaderToolbar';
import { ExportMenu } from '@/components/ui/ExportMenu';
import { TimeMachineModal } from '@/components/ui/TimeMachineModal';
import { NodeInspector } from '@/components/ui/NodeInspector';
import { KeyboardShortcutsModal } from '@/components/ui/KeyboardShortcutsModal';
import { CanvasThemeModal } from '@/components/ui/CanvasThemeModal';
import { CleanBoardModal } from '@/components/ui/CleanBoardModal';
import { AiChatMindMapModal } from '@/components/ui/AiChatMindMapModal';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { useAutoSaveHistory } from '@/hooks/useAutoSaveHistory';
import { useFileSystem } from '@/hooks/useFileSystem';
import { getDagreLayout } from '@/lib/layouts/dagreLayout';
import { getElkLayout } from '@/lib/layouts/elkLayout';

// Initial Starter Mind Map Template
const INITIAL_NODES: MapMindNode[] = [
  {
    id: 'root-1',
    type: 'custom',
    position: { x: 0, y: 0 },
    selected: true,
    data: {
      label: 'MapMind Architecture',
      sublabel: 'Client-Side Interactive Canvas',
      isRoot: true,
      colorTheme: 'blue',
      shape: 'pill',
      tags: ['Core', 'React 18'],
    },
  },
  {
    id: 'node-storage',
    type: 'custom',
    position: { x: 300, y: -100 },
    data: {
      label: 'Storage & Persistence',
      sublabel: 'Local File & IDB Engine',
      colorTheme: 'emerald',
      tags: ['Storage'],
    },
  },
  {
    id: 'node-storage-fs',
    type: 'custom',
    position: { x: 580, y: -150 },
    data: {
      label: 'browser-fs-access',
      sublabel: 'Silent Ctrl+S Overwrite',
      colorTheme: 'emerald',
      tags: ['File System'],
    },
  },
  {
    id: 'node-storage-idb',
    type: 'custom',
    position: { x: 580, y: -50 },
    data: {
      label: 'IndexedDB Time Machine',
      sublabel: '3-Min Auto Snapshots',
      colorTheme: 'emerald',
      tags: ['Revisions'],
    },
  },
  {
    id: 'node-layouts',
    type: 'custom',
    position: { x: -300, y: -100 },
    data: {
      label: 'Layout Engines',
      sublabel: 'Automatic Graph Math',
      colorTheme: 'purple',
      tags: ['Algorithms'],
    },
  },
  {
    id: 'node-layouts-dagre',
    type: 'custom',
    position: { x: -580, y: -150 },
    data: {
      label: 'Dagre Layouts',
      sublabel: 'Top-Down & Left-Right DAG',
      colorTheme: 'purple',
      tags: ['Dagre'],
    },
  },
  {
    id: 'node-layouts-elk',
    type: 'custom',
    position: { x: -580, y: -50 },
    data: {
      label: 'ELK.js Radial Map',
      sublabel: 'Balanced Left/Right Tree',
      colorTheme: 'purple',
      tags: ['ELK'],
    },
  },
  {
    id: 'node-export',
    type: 'custom',
    position: { x: 300, y: 120 },
    data: {
      label: 'Rendering & Aesthetics',
      sublabel: 'RoughJS & Multi-Format',
      colorTheme: 'amber',
      tags: ['Export'],
    },
  },
  {
    id: 'node-export-rough',
    type: 'custom',
    position: { x: 580, y: 80 },
    data: {
      label: 'Sketch Mode',
      sublabel: 'Hand-Drawn RoughJS SVG',
      colorTheme: 'amber',
      tags: ['Aesthetics'],
    },
  },
  {
    id: 'node-export-pdf',
    type: 'custom',
    position: { x: 580, y: 170 },
    data: {
      label: 'jsPDF & Clipboard PNG',
      sublabel: 'Vector & Raster Exports',
      colorTheme: 'amber',
      tags: ['PDF', 'PNG'],
    },
  },
];

const INITIAL_EDGES: MapMindEdge[] = [
  { id: 'e-root-storage', source: 'root-1', target: 'node-storage', type: 'smoothstep' },
  { id: 'e-storage-fs', source: 'node-storage', target: 'node-storage-fs', type: 'smoothstep' },
  { id: 'e-storage-idb', source: 'node-storage', target: 'node-storage-idb', type: 'smoothstep' },
  { id: 'e-root-layouts', source: 'root-1', target: 'node-layouts', type: 'smoothstep' },
  { id: 'e-layouts-dagre', source: 'node-layouts', target: 'node-layouts-dagre', type: 'smoothstep' },
  { id: 'e-layouts-elk', source: 'node-layouts', target: 'node-layouts-elk', type: 'smoothstep' },
  { id: 'e-root-export', source: 'root-1', target: 'node-export', type: 'smoothstep' },
  { id: 'e-export-rough', source: 'node-export', target: 'node-export-rough', type: 'smoothstep' },
  { id: 'e-export-pdf', source: 'node-export', target: 'node-export-pdf', type: 'smoothstep' },
];

export function AppContent() {
  const [nodes, setNodes, onNodesChange] = useNodesState<MapMindNode>(INITIAL_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState<MapMindEdge>(INITIAL_EDGES);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>('root-1');
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isCanvasThemeOpen, setIsCanvasThemeOpen] = useState(false);
  const [isCleanBoardOpen, setIsCleanBoardOpen] = useState(false);
  const [isAiImportOpen, setIsAiImportOpen] = useState(false);
  const [isTimeMachineOpen, setIsTimeMachineOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isLayouting, setIsLayouting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const [settings, setSettings] = useState<CanvasSettings>({
    sketchMode: false,
    gridSnap: true,
    gridSize: 20,
    gridType: 'dots',
    theme: 'light',
    backgroundPreset: 'warm',
  });

  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  const selectedNodeIdRef = useRef(selectedNodeId);

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  useEffect(() => {
    selectedNodeIdRef.current = selectedNodeId;
  }, [selectedNodeId]);

  const showNotification = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Sync dark theme with HTML element
  useEffect(() => {
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.theme]);

  // Dynamic child count calculation for every node
  const nodesWithChildCounts = useMemo(() => {
    const childCountMap = new Map<string, number>();
    edges.forEach((edge) => {
      childCountMap.set(edge.source, (childCountMap.get(edge.source) || 0) + 1);
    });

    return nodes.map((node) => ({
      ...node,
      selected: node.id === selectedNodeId,
      data: {
        ...node.data,
        childCount: childCountMap.get(node.id) || 0,
      },
    }));
  }, [nodes, edges, selectedNodeId]);

  const selectedNode = useMemo(() => {
    return nodes.find((n) => n.id === selectedNodeId) || null;
  }, [nodes, selectedNodeId]);

  const { setCenter, getZoom, fitView } = useReactFlow();

  const centerOnNode = useCallback(
    (nodeId: string, duration = 300) => {
      const target = nodesRef.current.find((n) => n.id === nodeId);
      if (target) {
        const currentZoom = getZoom();
        const zoom = Math.max(currentZoom, 1.0);
        setCenter(target.position.x + 115, target.position.y + 48, { zoom, duration });
      }
    },
    [setCenter, getZoom]
  );

  // Restore state from File or Time Machine
  const handleRestoreState = useCallback(
    (newNodes: MapMindNode[], newEdges: MapMindEdge[]) => {
      setNodes(newNodes);
      setEdges(newEdges);
      if (newNodes.length > 0) {
        setSelectedNodeId(newNodes[0].id);
        setTimeout(() => centerOnNode(newNodes[0].id), 50);
      } else {
        setSelectedNodeId(null);
      }
      showNotification('Canvas restored successfully', 'success');
    },
    [setNodes, setEdges, centerOnNode, showNotification]
  );

  // Time Machine Hook (Auto-saves every 3 minutes to IndexedDB)
  const {
    snapshots,
    secondsUntilNextSave,
    deleteSnapshot,
    clearHistory,
    triggerSave,
  } = useAutoSaveHistory(nodes, edges, handleRestoreState, 3 * 60 * 1000);

  // File System Hook (Save / Silent Ctrl+S / Open)
  const {
    activeFileName,
    isSaving,
    handleSave,
    handleOpen,
    handleNew,
  } = useFileSystem(
    nodes,
    edges,
    (graph, fileName) => {
      handleRestoreState(graph.nodes, graph.edges);
      triggerSave('import', `Imported: ${fileName}`);
    },
    showNotification
  );

  // Clean / Clear Whiteboard (with automatic Time Machine safety snapshot)
  const handleCleanBoard = useCallback(
    (mode: 'fresh-root' | 'empty') => {
      // 1. Take safety snapshot in Time Machine
      triggerSave('manual-save', 'Before cleaning canvas');

      if (mode === 'fresh-root') {
        const rootId = `root_${Date.now()}`;
        const freshRoot: MapMindNode = {
          id: rootId,
          type: 'custom',
          position: { x: 0, y: 0 },
          selected: true,
          data: {
            label: 'Central Topic',
            colorTheme: 'blue',
            isRoot: true,
            tags: ['Main'],
            isEditing: true,
          },
        };
        setNodes([freshRoot]);
        setEdges([]);
        setSelectedNodeId(rootId);
        setTimeout(() => centerOnNode(rootId, 300), 50);
        showNotification(
          'Whiteboard reset with fresh topic. Backup saved to Time Machine.',
          'success'
        );
      } else {
        setNodes([]);
        setEdges([]);
        setSelectedNodeId(null);
        showNotification(
          'Whiteboard wiped completely blank. Backup saved to Time Machine.',
          'info'
        );
      }
    },
    [triggerSave, setNodes, setEdges, centerOnNode, showNotification]
  );

  // Apply AI Generated Mind Map
  const handleApplyAiMindMap = useCallback(
    (newNodes: MapMindNode[], newEdges: MapMindEdge[], replaceAll: boolean) => {
      if (replaceAll) {
        triggerSave('manual-save', 'Before AI Mind Map import');
        setNodes(newNodes);
        setEdges(newEdges);
        if (newNodes.length > 0) {
          setSelectedNodeId(newNodes[0].id);
          setTimeout(() => centerOnNode(newNodes[0].id, 400), 50);
        }
        showNotification(
          `Generated mind map with ${newNodes.length} nodes!`,
          'success'
        );
      } else {
        triggerSave('manual-save', 'Before AI Mind Map branch append');
        setNodes(newNodes);
        setEdges(newEdges);
        showNotification(
          `Appended AI branch to selected node!`,
          'success'
        );
      }
    },
    [triggerSave, setNodes, setEdges, centerOnNode, showNotification]
  );

  // Start & Stop Inline Editing
  const handleStartEditingNode = useCallback((nodeId: string) => {
    setNodes((current) =>
      current.map((n) => ({
        ...n,
        data: {
          ...n.data,
          isEditing: n.id === nodeId,
        },
      }))
    );
  }, [setNodes]);

  const handleStopEditingNode = useCallback((_nodeId: string) => {
    setNodes((current) =>
      current.map((n) => ({
        ...n,
        data: {
          ...n.data,
          isEditing: false,
        },
      }))
    );
  }, [setNodes]);

  // Subtree Collapse/Expand Toggle Logic
  const handleToggleCollapse = useCallback(
    (targetNodeId: string) => {
      setNodes((currentNodes) => {
        const targetNode = currentNodes.find((n) => n.id === targetNodeId);
        if (!targetNode) return currentNodes;

        const nextCollapsed = !targetNode.data?.collapsed;

        // Traverse descendants using BFS
        const descendants = new Set<string>();
        const queue = [targetNodeId];

        while (queue.length > 0) {
          const parentId = queue.shift()!;
          const childEdges = edgesRef.current.filter((e) => e.source === parentId);
          for (const edge of childEdges) {
            if (!descendants.has(edge.target)) {
              descendants.add(edge.target);
              queue.push(edge.target);
            }
          }
        }

        return currentNodes.map((node) => {
          if (node.id === targetNodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                collapsed: nextCollapsed,
              },
            };
          }

          if (descendants.has(node.id)) {
            return {
              ...node,
              data: {
                ...node.data,
                hidden: nextCollapsed,
              },
            };
          }

          return node;
        });
      });
    },
    [setNodes]
  );

  // Update node label directly
  const handleUpdateNodeLabel = useCallback(
    (nodeId: string, label: string) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, label } } : n))
      );
    },
    [setNodes]
  );

  // Update arbitrary node properties
  const handleUpdateNode = useCallback(
    (nodeId: string, updates: Partial<MapMindNode['data']>) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...updates } } : n))
      );
    },
    [setNodes]
  );

  // Delete node and auto-select parent/sibling
  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      const currentNodes = nodesRef.current;
      const currentEdges = edgesRef.current;

      const incoming = currentEdges.find((e) => e.target === nodeId);
      const parentId = incoming ? incoming.source : null;

      // Find next node to select
      let nextSelectedId: string | null = null;
      if (parentId) {
        const siblings = currentEdges
          .filter((e) => e.source === parentId && e.target !== nodeId)
          .map((e) => e.target);
        if (siblings.length > 0) {
          nextSelectedId = siblings[0];
        } else {
          nextSelectedId = parentId;
        }
      } else {
        const remaining = currentNodes.filter((n) => n.id !== nodeId);
        if (remaining.length > 0) {
          nextSelectedId = remaining[0].id;
        }
      }

      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
      setSelectedNodeId(nextSelectedId);
      showNotification('Node deleted', 'info');
    },
    [setNodes, setEdges, showNotification]
  );

  // Add Child Node (Tab) with immediate edit mode
  const handleAddChildNode = useCallback(
    (parentId: string) => {
      const currentNodes = nodesRef.current;
      const currentEdges = edgesRef.current;
      const parentNode = currentNodes.find((n) => n.id === parentId);
      if (!parentNode) return;

      const newId = `node_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      // Existing children for Y positioning
      const existingChildEdges = currentEdges.filter((e) => e.source === parentId);
      const childCount = existingChildEdges.length;

      // Position logic: if parent is left of center, branch left; else right
      const isLeft = parentNode.position.x < -50;
      const xOffset = isLeft ? -250 : 250;
      const yOffset = (childCount - Math.floor(childCount / 2)) * 80 * (childCount % 2 === 0 ? 1 : -1);

      const newNode: MapMindNode = {
        id: newId,
        type: 'custom',
        selected: true,
        position: {
          x: parentNode.position.x + xOffset,
          y: parentNode.position.y + yOffset,
        },
        data: {
          label: 'New Child',
          colorTheme: parentNode.data?.colorTheme || 'blue',
          tags: ['Idea'],
          isEditing: true, // Immediately start typing!
        },
      };

      const newEdge: MapMindEdge = {
        id: `e_${parentId}_${newId}`,
        source: parentId,
        target: newId,
        type: 'smoothstep',
      };

      // Unselect all other nodes and set new node
      setNodes((nds) => [
        ...nds.map((n) => ({ ...n, selected: false, data: { ...n.data, isEditing: false } })),
        newNode,
      ]);
      setEdges((eds) => [...eds, newEdge]);
      setSelectedNodeId(newId);
      setTimeout(() => centerOnNode(newId, 300), 50);
    },
    [setNodes, setEdges, centerOnNode]
  );

  // Add Sibling Node (Enter) with immediate edit mode
  const handleAddSiblingNode = useCallback(
    (nodeId: string) => {
      const currentNodes = nodesRef.current;
      const currentEdges = edgesRef.current;
      const currentNode = currentNodes.find((n) => n.id === nodeId);
      if (!currentNode) return;

      const incomingEdge = currentEdges.find((e) => e.target === nodeId);

      if (!incomingEdge || currentNode.data?.isRoot) {
        // If root node, adding sibling means adding a new main branch
        handleAddChildNode(nodeId);
        return;
      }

      const parentId = incomingEdge.source;
      const parentNode = currentNodes.find((n) => n.id === parentId);
      const newId = `node_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      const newNode: MapMindNode = {
        id: newId,
        type: 'custom',
        selected: true,
        position: {
          x: currentNode.position.x,
          y: currentNode.position.y + 85,
        },
        data: {
          label: 'New Idea',
          colorTheme: parentNode?.data?.colorTheme || currentNode.data?.colorTheme || 'blue',
          tags: ['Idea'],
          isEditing: true, // Immediately start typing!
        },
      };

      const newEdge: MapMindEdge = {
        id: `e_${parentId}_${newId}`,
        source: parentId,
        target: newId,
        type: 'smoothstep',
      };

      setNodes((nds) => [
        ...nds.map((n) => ({ ...n, selected: false, data: { ...n.data, isEditing: false } })),
        newNode,
      ]);
      setEdges((eds) => [...eds, newEdge]);
      setSelectedNodeId(newId);
      setTimeout(() => centerOnNode(newId, 300), 50);
    },
    [handleAddChildNode, setNodes, setEdges, centerOnNode]
  );

  // Add root / free node
  const handleAddNode = useCallback(() => {
    const newId = `node_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newNode: MapMindNode = {
      id: newId,
      type: 'custom',
      selected: true,
      position: {
        x: 100 + Math.random() * 80,
        y: 100 + Math.random() * 80,
      },
      data: {
        label: 'Topic Branch',
        colorTheme: 'blue',
        tags: ['Draft'],
        isEditing: true,
      },
    };

    setNodes((nds) => [
      ...nds.map((n) => ({ ...n, selected: false, data: { ...n.data, isEditing: false } })),
      newNode,
    ]);
    setSelectedNodeId(newId);
    showNotification('Created new node', 'success');
  }, [setNodes, showNotification]);

  // Spatial Keyboard Navigation (Arrows)
  const handleNavigate = useCallback(
    (direction: 'up' | 'down' | 'left' | 'right') => {
      const currentNodes = nodesRef.current;
      const currentEdges = edgesRef.current;
      const currentId = selectedNodeIdRef.current;

      const visibleNodes = currentNodes.filter((n) => !n.data?.hidden);
      if (visibleNodes.length === 0) return;

      if (!currentId) {
        // Select root or first node
        const first = visibleNodes.find((n) => n.data?.isRoot) || visibleNodes[0];
        setSelectedNodeId(first.id);
        return;
      }

      const current = visibleNodes.find((n) => n.id === currentId);
      if (!current) {
        setSelectedNodeId(visibleNodes[0].id);
        return;
      }

      const incoming = currentEdges.find((e) => e.target === current.id);
      const parentId = incoming ? incoming.source : null;
      const children = currentEdges
        .filter((e) => e.source === current.id)
        .map((e) => visibleNodes.find((n) => n.id === e.target))
        .filter(Boolean) as MapMindNode[];

      let nextTarget: MapMindNode | null = null;

      if (direction === 'up' || direction === 'down') {
        if (parentId) {
          // Sibling navigation
          const siblings = currentEdges
            .filter((e) => e.source === parentId)
            .map((e) => visibleNodes.find((n) => n.id === e.target))
            .filter(Boolean) as MapMindNode[];

          const idx = siblings.findIndex((s) => s.id === current.id);
          if (direction === 'up' && idx > 0) {
            nextTarget = siblings[idx - 1];
          } else if (direction === 'down' && idx >= 0 && idx < siblings.length - 1) {
            nextTarget = siblings[idx + 1];
          }
        }

        // Geometric fallback
        if (!nextTarget) {
          const candidates = visibleNodes
            .filter((n) => n.id !== current.id)
            .filter((n) => (direction === 'up' ? n.position.y < current.position.y : n.position.y > current.position.y))
            .sort((a, b) => {
              const distA = Math.hypot(a.position.x - current.position.x, a.position.y - current.position.y);
              const distB = Math.hypot(b.position.x - current.position.x, b.position.y - current.position.y);
              return distA - distB;
            });
          if (candidates.length > 0) {
            nextTarget = candidates[0];
          }
        }
      } else if (direction === 'right') {
        if (current.position.x < -50 && parentId) {
          // On left side of map: moving right means moving to parent
          nextTarget = visibleNodes.find((n) => n.id === parentId) || null;
        } else if (children.length > 0) {
          // Moving right to first child
          nextTarget = children[0];
        } else {
          // Geometric right candidate
          const candidates = visibleNodes
            .filter((n) => n.position.x > current.position.x + 30)
            .sort((a, b) => Math.hypot(a.position.x - current.position.x, a.position.y - current.position.y) -
                             Math.hypot(b.position.x - current.position.x, b.position.y - current.position.y));
          if (candidates.length > 0) nextTarget = candidates[0];
        }
      } else if (direction === 'left') {
        if (current.position.x >= -50 && parentId) {
          // On right side of map: moving left means moving to parent
          nextTarget = visibleNodes.find((n) => n.id === parentId) || null;
        } else if (children.length > 0) {
          // Moving left to first child
          nextTarget = children[0];
        } else {
          // Geometric left candidate
          const candidates = visibleNodes
            .filter((n) => n.position.x < current.position.x - 30)
            .sort((a, b) => Math.hypot(a.position.x - current.position.x, a.position.y - current.position.y) -
                             Math.hypot(b.position.x - current.position.x, b.position.y - current.position.y));
          if (candidates.length > 0) nextTarget = candidates[0];
        }
      }

      if (nextTarget) {
        setSelectedNodeId(nextTarget.id);
        // Ensure not in edit mode during navigation
        setNodes((nds) =>
          nds.map((n) => ({
            ...n,
            selected: n.id === nextTarget!.id,
            data: { ...n.data, isEditing: false },
          }))
        );
        centerOnNode(nextTarget.id, 250);
      }
    },
    [setNodes, centerOnNode]
  );

  // Global Keyboard Shortcuts Listener
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in an input or textarea
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      // If user is inside an input, only handle Escape or let input's own onKeyDown handle Tab/Enter
      if (isInput) {
        return;
      }

      const activeId = selectedNodeIdRef.current;

      // 1. Tab -> Add Child Node
      if (e.key === 'Tab') {
        e.preventDefault();
        if (activeId) {
          handleAddChildNode(activeId);
        } else if (nodesRef.current.length > 0) {
          handleAddChildNode(nodesRef.current[0].id);
        }
        return;
      }

      // 2. Enter -> Add Sibling Node
      if (e.key === 'Enter') {
        e.preventDefault();
        if (activeId) {
          handleAddSiblingNode(activeId);
        }
        return;
      }

      // 3. Space or F2 -> Start Editing Selected Node
      if (e.key === ' ' || e.key === 'F2') {
        if (activeId) {
          e.preventDefault();
          handleStartEditingNode(activeId);
        }
        return;
      }

      // 4. 'f' -> Center / Focus Selected Node; 'Shift+F' -> Fit View
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        if (e.shiftKey) {
          fitView({ duration: 400 });
        } else if (activeId) {
          centerOnNode(activeId, 400);
        }
        return;
      }

      // 5. Arrow Keys -> Spatial Navigation
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        handleNavigate('up');
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        handleNavigate('down');
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNavigate('right');
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleNavigate('left');
        return;
      }

      // 6. Delete or Backspace -> Delete Selected Node
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (activeId) {
          e.preventDefault();
          handleDeleteNode(activeId);
        }
        return;
      }

      // 7. 'c' or '/' or '.' -> Toggle Collapse Subtree
      if (e.key === 'c' || e.key === '/' || e.key === '.') {
        if (activeId) {
          e.preventDefault();
          handleToggleCollapse(activeId);
        }
        return;
      }

      // 8. '?' -> Open Keyboard Shortcuts Guide
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setIsShortcutsOpen((prev) => !prev);
        return;
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [
    handleAddChildNode,
    handleAddSiblingNode,
    handleStartEditingNode,
    handleNavigate,
    handleDeleteNode,
    handleToggleCollapse,
    centerOnNode,
    fitView,
  ]);

  // Apply Layout Engine (Dagre or ELK)
  const handleApplyLayout = useCallback(
    async (layoutType: LayoutDirection) => {
      setIsLayouting(true);
      try {
        if (layoutType === 'BALANCED_MINDMAP') {
          const result = await getElkLayout(nodesWithChildCounts, edges);
          setNodes(result.nodes);
          setEdges(result.edges);
          showNotification('Applied Balanced Mind Map (ELK Engine)', 'success');
        } else {
          const result = getDagreLayout(nodesWithChildCounts, edges, {
            direction: layoutType as 'TB' | 'LR' | 'BT' | 'RL',
          });
          setNodes(result.nodes);
          setEdges(result.edges);
          showNotification(
            `Applied ${layoutType === 'TB' ? 'Top-Down' : 'Left-to-Right'} Layout (Dagre Engine)`,
            'success'
          );
        }
      } catch (err) {
        console.error('Layout failed:', err);
        showNotification('Layout calculation failed', 'error');
      } finally {
        setIsLayouting(false);
      }
    },
    [nodesWithChildCounts, edges, setNodes, setEdges, showNotification]
  );

  // Toggle Node Lock / Pin in place
  const handleToggleLock = useCallback(
    (nodeId: string) => {
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id === nodeId) {
            const nextLocked = !n.data?.locked;
            showNotification(
              nextLocked ? 'Node stuck in place (Locked)' : 'Node unlocked (Free to move)',
              'info'
            );
            return {
              ...n,
              data: {
                ...n.data,
                locked: nextLocked,
              },
            };
          }
          return n;
        })
      );
    },
    [setNodes, showNotification]
  );

  return (
    <div className="w-screen h-screen flex flex-col bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 overflow-hidden font-sans">
      {/* Top Header Toolbar */}
      <HeaderToolbar
        fileName={activeFileName}
        isSaving={isSaving}
        onNew={() => {
          handleNew();
          setNodes(INITIAL_NODES);
          setEdges(INITIAL_EDGES);
          setSelectedNodeId('root-1');
          showNotification('Created new whiteboard', 'info');
        }}
        onOpen={handleOpen}
        onSave={(forceSaveAs) => handleSave(forceSaveAs)}
        onOpenCleanBoard={() => setIsCleanBoardOpen(true)}
        onOpenAiImport={() => setIsAiImportOpen(true)}
        onAddNode={handleAddNode}
        onApplyLayout={handleApplyLayout}
        isLayouting={isLayouting}
        settings={settings}
        onToggleSketchMode={() =>
          setSettings((s) => ({ ...s, sketchMode: !s.sketchMode }))
        }
        onToggleTheme={() =>
          setSettings((s) => ({
            ...s,
            theme: s.theme === 'dark' ? 'light' : 'dark',
          }))
        }
        onOpenCanvasTheme={() => setIsCanvasThemeOpen(true)}
        onOpenTimeMachine={() => setIsTimeMachineOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        snapshotCount={snapshots.length}
        secondsUntilNextSave={secondsUntilNextSave}
      />

      {/* Main Diagramming Canvas */}
      <main className="flex-1 relative overflow-hidden">
        <DiagramCanvas
          nodes={nodesWithChildCounts}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          setEdges={setEdges}
          settings={settings}
          onToggleCollapse={handleToggleCollapse}
          onToggleLock={handleToggleLock}
          onUpdateNodeLabel={handleUpdateNodeLabel}
          onAddChildNode={handleAddChildNode}
          onAddSiblingNode={handleAddSiblingNode}
          onStartEditingNode={handleStartEditingNode}
          onStopEditingNode={handleStopEditingNode}
          onSelectNode={(node) => setSelectedNodeId(node ? node.id : null)}
        />

        {/* Selected Node Properties Inspector */}
        <NodeInspector
          selectedNode={selectedNode}
          onUpdateNode={handleUpdateNode}
          onDeleteNode={handleDeleteNode}
          onClose={() => setSelectedNodeId(null)}
        />

        {/* Floating Quick Keyboard Hint Pill */}
        <div className="absolute bottom-4 left-4 z-20 hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-700/80 text-[11px] text-slate-600 dark:text-slate-300 shadow-sm">
          <span><kbd className="font-mono font-bold text-blue-600 dark:text-blue-400">Tab</kbd> Child</span>
          <span>•</span>
          <span><kbd className="font-mono font-bold text-emerald-600 dark:text-emerald-400">Enter</kbd> Sibling</span>
          <span>•</span>
          <span><kbd className="font-mono font-bold text-purple-600 dark:text-purple-400">Space</kbd> Edit</span>
          <span>•</span>
          <span><kbd className="font-mono font-bold text-amber-600 dark:text-amber-400">Arrows</kbd> Move</span>
          <span>•</span>
          <button
            onClick={() => setIsShortcutsOpen(true)}
            className="font-bold underline text-blue-600 dark:text-blue-400 hover:opacity-80 ml-1"
          >
            ? Help
          </button>
        </div>
      </main>

      {/* AI Chatbot to Mind Map Generator Modal */}
      <ErrorBoundary fallbackTitle="AI Mind Map Generator">
        <AiChatMindMapModal
          isOpen={isAiImportOpen}
          onClose={() => setIsAiImportOpen(false)}
          selectedNodeId={selectedNodeId}
          currentNodes={nodes}
          currentEdges={edges}
          onApplyMindMap={handleApplyAiMindMap}
          onNotify={showNotification}
        />
      </ErrorBoundary>

      {/* Clean Whiteboard Modal */}
      <CleanBoardModal
        isOpen={isCleanBoardOpen}
        onClose={() => setIsCleanBoardOpen(false)}
        onConfirmClean={handleCleanBoard}
        nodeCount={nodes.length}
      />

      {/* Canvas Background & Mood Modal */}
      <CanvasThemeModal
        isOpen={isCanvasThemeOpen}
        onClose={() => setIsCanvasThemeOpen(false)}
        settings={settings}
        onUpdateSettings={(updates) => setSettings((s) => ({ ...s, ...updates }))}
      />

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      {/* Time Machine Modal */}
      <TimeMachineModal
        isOpen={isTimeMachineOpen}
        onClose={() => setIsTimeMachineOpen(false)}
        snapshots={snapshots}
        onRestore={(snapshot) =>
          handleRestoreState(snapshot.state.nodes, snapshot.state.edges)
        }
        onDeleteSnapshot={deleteSnapshot}
        onClearHistory={clearHistory}
        secondsUntilNextSave={secondsUntilNextSave}
      />

      {/* Export Menu Modal */}
      {isExportOpen && (
        <ExportMenu
          onClose={() => setIsExportOpen(false)}
          settings={settings}
          onNotify={showNotification}
        />
      )}

      {/* Notification Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl text-xs font-semibold shadow-lg backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-150 flex items-center gap-2 ${
            toast.type === 'success'
              ? 'bg-emerald-600/95 text-white'
              : toast.type === 'error'
              ? 'bg-red-600/95 text-white'
              : 'bg-slate-800/95 text-white'
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary fallbackTitle="MapMind Application">
      <ReactFlowProvider>
        <AppContent />
      </ReactFlowProvider>
    </ErrorBoundary>
  );
}
