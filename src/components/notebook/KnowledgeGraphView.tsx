import React, { useRef, useEffect, useState, useMemo } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Filter,
  Sparkles,
  BrainCircuit,
  Search,
  BookOpen,
  Layers,
  Box,
  ArrowRight,
} from 'lucide-react';
import { Workspace, Page } from '@/types/notebook';
import { AiConnectionSuggestion } from '@/types/ai';
import { extractWikiLinks } from '@/lib/notebook/links';
import { KnowledgeGraph3DView } from './KnowledgeGraph3DView';

interface KnowledgeGraphViewProps {
  workspace: Workspace;
  allPages: Page[];
  aiSuggestions: AiConnectionSuggestion[];
  activePageId: string | null;
  onSelectPage: (pageId: string) => void;
  onOpenMindMap?: (page: Page) => void;
  isDarkMode: boolean;
}

interface GraphNodeData {
  id: string;
  title: string;
  notebookId: string;
  notebookName: string;
  color: string;
  tags: string[];
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  degree: number;
  connectedNodeIds: Set<string>;
}

interface GraphEdgeData {
  id: string;
  source: string;
  target: string;
  isAi: boolean;
  confidence?: number;
}

export const KnowledgeGraphView: React.FC<KnowledgeGraphViewProps> = ({
  workspace,
  allPages,
  aiSuggestions,
  activePageId,
  onSelectPage,
  onOpenMindMap,
  isDarkMode,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Dimension: 2D vs 3D
  const [dimension, setDimension] = useState<'2d' | '3d'>('2d');

  // Filters & State
  const [selectedNotebookId, setSelectedNotebookId] = useState<string>('all');
  const [showAiEdges, setShowAiEdges] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<GraphEdgeData | null>(null);

  // 2D Dimensions
  const [dimensions, setDimensions] = useState({ width: 900, height: 650 });

  // Pan & Zoom
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 0.95 });
  const isDraggingBackgroundRef = useRef(false);
  const dragStartPosRef = useRef({ x: 0, y: 0 });

  // Dragging a specific node
  const draggedNodeIdRef = useRef<string | null>(null);
  const dragNodeStartRef = useRef({ x: 0, y: 0 });

  // Persistent Coordinates across renders
  const persistentCoordsRef = useRef<Map<string, { x: number; y: number; vx: number; vy: number }>>(new Map());

  // Reactive node positions state for SVG rendering
  const [nodePositions, setNodePositions] = useState<GraphNodeData[]>([]);

  // Notebook Color Lookup
  const notebookColorMap = useMemo(() => {
    const map = new Map<string, { name: string; color: string }>();
    workspace.notebooks.forEach((nb) => {
      map.set(nb.id, { name: nb.name, color: nb.color || '#8b5cf6' });
    });
    return map;
  }, [workspace.notebooks]);

  // Build Graph Nodes & Edges with Wide Cluster Distribution
  const { initialNodes, edges } = useMemo(() => {
    const nMap = new Map<string, GraphNodeData>();
    const gNodes: GraphNodeData[] = [];
    const gEdges: GraphEdgeData[] = [];

    // Filter pages
    const filteredPages = allPages.filter((p) => {
      if (selectedNotebookId !== 'all' && p.notebookId !== selectedNotebookId) return false;
      if (searchQuery.trim() && !p.title.toLowerCase().includes(searchQuery.trim().toLowerCase())) return false;
      return true;
    });

    const pageTitleMap = new Map<string, Page>();
    allPages.forEach((p) => pageTitleMap.set(p.title.toLowerCase().trim(), p));

    // Calculate notebook cluster centers for clean spacing
    const notebookIds = Array.from(new Set(filteredPages.map((p) => p.notebookId)));
    const clusterCenters = new Map<string, { x: number; y: number }>();
    notebookIds.forEach((nbId, idx) => {
      const angle = (idx / Math.max(1, notebookIds.length)) * Math.PI * 2;
      const radius = notebookIds.length > 1 ? 260 : 0;
      clusterCenters.set(nbId, {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      });
    });

    filteredPages.forEach((page, i) => {
      const nb = notebookColorMap.get(page.notebookId);
      const existing = persistentCoordsRef.current.get(page.id);

      let x: number;
      let y: number;
      let vx = 0;
      let vy = 0;

      if (existing && !isNaN(existing.x) && !isNaN(existing.y)) {
        x = existing.x;
        y = existing.y;
        vx = existing.vx || 0;
        vy = existing.vy || 0;
      } else {
        const center = clusterCenters.get(page.notebookId) || { x: 0, y: 0 };
        const angle = i * 2.399; // Golden angle
        const r = 60 + Math.sqrt(i) * 55;
        x = center.x + Math.cos(angle) * r;
        y = center.y + Math.sin(angle) * r;
        persistentCoordsRef.current.set(page.id, { x, y, vx: 0, vy: 0 });
      }

      const node: GraphNodeData = {
        id: page.id,
        title: page.title,
        notebookId: page.notebookId,
        notebookName: nb?.name || 'Notebook',
        color: nb?.color || '#8b5cf6',
        tags: page.tags || [],
        x,
        y,
        vx,
        vy,
        radius: page.id === activePageId ? 18 : 12,
        degree: 0,
        connectedNodeIds: new Set<string>(),
      };

      nMap.set(page.id, node);
      gNodes.push(node);
    });

    // Add manual Wiki Link edges
    filteredPages.forEach((page) => {
      const links = extractWikiLinks(page.content);
      links.forEach((link) => {
        const targetPage = pageTitleMap.get(link.targetTitle.toLowerCase().trim());
        if (targetPage && nMap.has(targetPage.id) && targetPage.id !== page.id) {
          gEdges.push({
            id: `edge-${page.id}-${targetPage.id}`,
            source: page.id,
            target: targetPage.id,
            isAi: false,
          });
          const src = nMap.get(page.id);
          const tgt = nMap.get(targetPage.id);
          if (src && tgt) {
            src.degree++;
            tgt.degree++;
            src.connectedNodeIds.add(tgt.id);
            tgt.connectedNodeIds.add(src.id);
          }
        }
      });
    });

    // Add AI suggested edges
    if (showAiEdges) {
      aiSuggestions.forEach((sug) => {
        if (nMap.has(sug.sourcePageId) && nMap.has(sug.targetPageId)) {
          gEdges.push({
            id: `edge-ai-${sug.sourcePageId}-${sug.targetPageId}`,
            source: sug.sourcePageId,
            target: sug.targetPageId,
            isAi: true,
            confidence: sug.confidence,
          });
          const src = nMap.get(sug.sourcePageId);
          const tgt = nMap.get(sug.targetPageId);
          if (src && tgt) {
            src.degree += 0.5;
            tgt.degree += 0.5;
            src.connectedNodeIds.add(tgt.id);
            tgt.connectedNodeIds.add(src.id);
          }
        }
      });
    }

    // Dynamic node size based on degree
    gNodes.forEach((n) => {
      n.radius = Math.min(26, Math.max(11, (n.id === activePageId ? 18 : 12) + n.degree * 1.8));
    });

    return { initialNodes: gNodes, edges: gEdges };
  }, [allPages, selectedNotebookId, searchQuery, notebookColorMap, activePageId, showAiEdges, aiSuggestions]);

  // Sync initial nodes into node positions state
  useEffect(() => {
    setNodePositions(initialNodes);
  }, [initialNodes]);

  // Measure Container Dimensions with ResizeObserver
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateSize = () => {
      if (container.clientWidth > 0 && container.clientHeight > 0) {
        setDimensions({ width: container.clientWidth, height: container.clientHeight });
      }
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // 2D Force-Directed Physics Simulation (High Spacing & Stable Collision Prevention)
  useEffect(() => {
    if (dimension !== '2d') return;
    let animId: number;
    let running = true;
    let tickCount = 0;
    const maxTicks = 350;

    const tick = () => {
      if (!running) return;
      tickCount++;

      setNodePositions((currentNodes) => {
        if (currentNodes.length === 0) return currentNodes;
        const nodesCopy = currentNodes.map((n) => ({ ...n }));
        const map = new Map<string, GraphNodeData>();
        nodesCopy.forEach((n) => map.set(n.id, n));

        // 1. Strong Coulomb Repulsion between all node pairs with minimum safe distance
        const repulsionStrength = 85000;
        const minDist = 80;

        for (let i = 0; i < nodesCopy.length; i++) {
          for (let j = i + 1; j < nodesCopy.length; j++) {
            const a = nodesCopy[i];
            const b = nodesCopy[j];
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const rawDist = Math.hypot(dx, dy) || 1;
            const dist = Math.max(minDist, rawDist);

            const force = Math.min(35, repulsionStrength / (dist * dist));
            const fx = (dx / rawDist) * force;
            const fy = (dy / rawDist) * force;

            if (draggedNodeIdRef.current !== a.id) {
              a.vx -= fx;
              a.vy -= fy;
            }
            if (draggedNodeIdRef.current !== b.id) {
              b.vx += fx;
              b.vy += fy;
            }
          }
        }

        // 2. Hooke's Law Spring Attraction along edges
        for (const edge of edges) {
          const source = map.get(edge.source);
          const target = map.get(edge.target);
          if (source && target) {
            const dx = target.x - source.x;
            const dy = target.y - source.y;
            const dist = Math.hypot(dx, dy) || 1;
            const idealDist = edge.isAi ? 240 : 180;
            const displacement = dist - idealDist;
            const springK = 0.03;
            const fx = (dx / dist) * displacement * springK;
            const fy = (dy / dist) * displacement * springK;

            if (draggedNodeIdRef.current !== source.id) {
              source.vx += fx;
              source.vy += fy;
            }
            if (draggedNodeIdRef.current !== target.id) {
              target.vx -= fx;
              target.vy -= fy;
            }
          }
        }

        // 3. Friction Damping & Mild Center Gravity
        const friction = 0.86;
        const centerGravity = 0.00035;

        for (const node of nodesCopy) {
          if (draggedNodeIdRef.current === node.id) continue;

          node.vx = (node.vx - node.x * centerGravity) * friction;
          node.vy = (node.vy - node.y * centerGravity) * friction;

          node.x += node.vx;
          node.y += node.vy;

          // Persist coordinates
          const p = persistentCoordsRef.current.get(node.id);
          if (p) {
            p.x = node.x;
            p.y = node.y;
            p.vx = node.vx;
            p.vy = node.vy;
          }
        }

        return nodesCopy;
      });

      if (tickCount < maxTicks || draggedNodeIdRef.current) {
        animId = requestAnimationFrame(tick);
      }
    };

    animId = requestAnimationFrame(tick);

    return () => {
      running = false;
      cancelAnimationFrame(animId);
    };
  }, [edges, dimension]);

  // Pointer Handlers for Background Pan
  const handlePointerDownBackground = (e: React.PointerEvent<SVGSVGElement>) => {
    if ((e.target as HTMLElement).tagName === 'svg' || (e.target as HTMLElement).tagName === 'rect') {
      isDraggingBackgroundRef.current = true;
      dragStartPosRef.current = { x: e.clientX - transform.x, y: e.clientY - transform.y };
      (e.target as Element).setPointerCapture?.(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    // 1. Pan background
    if (isDraggingBackgroundRef.current) {
      setTransform((prev) => ({
        ...prev,
        x: e.clientX - dragStartPosRef.current.x,
        y: e.clientY - dragStartPosRef.current.y,
      }));
      return;
    }

    // 2. Drag node
    if (draggedNodeIdRef.current) {
      const mouseX = (e.clientX - dimensions.width / 2 - transform.x) / transform.k;
      const mouseY = (e.clientY - dimensions.height / 2 - transform.y) / transform.k;

      setNodePositions((prev) =>
        prev.map((n) => {
          if (n.id === draggedNodeIdRef.current) {
            const updated = {
              ...n,
              x: mouseX - dragNodeStartRef.current.x,
              y: mouseY - dragNodeStartRef.current.y,
              vx: 0,
              vy: 0,
            };
            const p = persistentCoordsRef.current.get(n.id);
            if (p) {
              p.x = updated.x;
              p.y = updated.y;
            }
            return updated;
          }
          return n;
        })
      );
    }
  };

  const handlePointerUp = () => {
    isDraggingBackgroundRef.current = false;
    draggedNodeIdRef.current = null;
  };

  const handleNodePointerDown = (node: GraphNodeData, e: React.PointerEvent) => {
    e.stopPropagation();
    draggedNodeIdRef.current = node.id;
    const mouseX = (e.clientX - dimensions.width / 2 - transform.x) / transform.k;
    const mouseY = (e.clientY - dimensions.height / 2 - transform.y) / transform.k;
    dragNodeStartRef.current = { x: mouseX - node.x, y: mouseY - node.y };
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.88;
    setTransform((prev) => ({
      ...prev,
      k: Math.max(0.25, Math.min(3.5, prev.k * zoomFactor)),
    }));
  };

  const activeNodeMap = useMemo(() => {
    const map = new Map<string, GraphNodeData>();
    nodePositions.forEach((n) => map.set(n.id, n));
    return map;
  }, [nodePositions]);

  // Determine highlighted neighbors on hover
  const hoveredNode = hoveredNodeId ? activeNodeMap.get(hoveredNodeId) : null;
  const connectedNodeIds = hoveredNode ? hoveredNode.connectedNodeIds : new Set<string>();

  return (
    <div
      ref={containerRef}
      className="flex-1 w-full h-full flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden relative select-none"
    >
      {/* Top Filter & Control Bar */}
      <div className="h-12 border-b border-slate-200 dark:border-slate-800 px-4 flex items-center justify-between bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800 dark:text-slate-200">
            <BrainCircuit className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span>Knowledge Graph</span>
          </div>

          {/* 2D / 3D Segmented Switcher */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setDimension('2d')}
              className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-all ${
                dimension === '2d'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100'
              }`}
              title="2D Interactive Force Graph View"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>2D Graph</span>
            </button>
            <button
              onClick={() => setDimension('3d')}
              className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-all ${
                dimension === '3d'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100'
              }`}
              title="3D Cosmic Knowledge Universe (WebGL)"
            >
              <Box className="w-3.5 h-3.5" />
              <span>3D Universe</span>
            </button>
          </div>

          {/* Notebook Filter */}
          <div className="hidden sm:flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedNotebookId}
              onChange={(e) => setSelectedNotebookId(e.target.value)}
              className="bg-transparent text-xs text-slate-700 dark:text-slate-300 font-medium focus:outline-none"
            >
              <option value="all">All Notebooks ({allPages.length} notes)</option>
              {workspace.notebooks.map((nb) => (
                <option key={nb.id} value={nb.id}>
                  {nb.icon} {nb.name}
                </option>
              ))}
            </select>
          </div>

          {/* Search Box */}
          <div className="hidden md:flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg text-xs text-slate-500">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notes in graph..."
              className="bg-transparent text-xs text-slate-800 dark:text-slate-200 focus:outline-none w-36"
            />
          </div>
        </div>

        {/* Graph Visual Toggles & Zoom Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAiEdges((prev) => !prev)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              showAiEdges
                ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
            }`}
            title="Toggle AI Suggested Connection Edges"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden md:inline">AI Edges</span>
          </button>

          {dimension === '2d' && (
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setTransform((prev) => ({ ...prev, k: Math.min(3.0, prev.k * 1.2) }))}
                className="p-1.5 rounded text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setTransform((prev) => ({ ...prev, k: Math.max(0.25, prev.k * 0.8) }))}
                className="p-1.5 rounded text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setTransform({ x: 0, y: 0, k: 1 })}
                className="p-1.5 rounded text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700"
                title="Reset View"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* RENDER VIEW: 3D Universe vs 2D Force Graph */}
      {dimension === '3d' ? (
        <KnowledgeGraph3DView
          workspace={workspace}
          allPages={allPages}
          aiSuggestions={aiSuggestions}
          activePageId={activePageId}
          onSelectPage={onSelectPage}
          onOpenMindMap={onOpenMindMap}
          isDarkMode={isDarkMode}
          searchQuery={searchQuery}
          selectedNotebookId={selectedNotebookId}
          showAiEdges={showAiEdges}
        />
      ) : (
        /* 2D SVG Canvas Area */
        <div className="flex-1 w-full h-full relative cursor-grab active:cursor-grabbing overflow-hidden">
          <svg
            className="w-full h-full block"
            onPointerDown={handlePointerDownBackground}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onWheel={handleWheel}
          >
            <defs>
              {/* Background Grid Pattern */}
              <pattern id="graph-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <circle
                  cx="20"
                  cy="20"
                  r="1.2"
                  fill={isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'}
                />
              </pattern>

              {/* Arrow Marker for Manual Links */}
              <marker
                id="link-arrow"
                viewBox="0 0 10 10"
                refX="22"
                refY="5"
                markerWidth="5"
                markerHeight="5"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill={isDarkMode ? '#94a3b8' : '#64748b'} />
              </marker>

              {/* Arrow Marker for AI Links */}
              <marker
                id="ai-arrow"
                viewBox="0 0 10 10"
                refX="22"
                refY="5"
                markerWidth="5"
                markerHeight="5"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#c084fc" />
              </marker>
            </defs>

            {/* Grid Background */}
            <rect width="100%" height="100%" fill="url(#graph-grid)" />

            {/* Main Zoom & Pan Layer */}
            <g
              transform={`translate(${dimensions.width / 2 + transform.x}, ${
                dimensions.height / 2 + transform.y
              }) scale(${transform.k})`}
            >
              {/* 1. EDGES LAYER */}
              <g className="edges-layer">
                {edges.map((edge) => {
                  const source = activeNodeMap.get(edge.source);
                  const target = activeNodeMap.get(edge.target);
                  if (
                    !source ||
                    !target ||
                    typeof source.x !== 'number' ||
                    typeof source.y !== 'number' ||
                    typeof target.x !== 'number' ||
                    typeof target.y !== 'number'
                  ) {
                    return null;
                  }

                  const isConnectedToHovered =
                    hoveredNodeId && (edge.source === hoveredNodeId || edge.target === hoveredNodeId);
                  const isDimmed = hoveredNodeId && !isConnectedToHovered;

                  if (edge.isAi) {
                    return (
                      <line
                        key={edge.id}
                        x1={source.x}
                        y1={source.y}
                        x2={target.x}
                        y2={target.y}
                        stroke={isConnectedToHovered ? '#c084fc' : isDarkMode ? '#a855f7' : '#9333ea'}
                        strokeWidth={isConnectedToHovered ? 3.5 : 2.0}
                        strokeDasharray="6,5"
                        strokeOpacity={isDimmed ? 0.12 : isConnectedToHovered ? 1.0 : 0.65}
                        markerEnd="url(#ai-arrow)"
                        className="transition-all duration-150 cursor-pointer"
                        onMouseEnter={() => setHoveredEdge(edge)}
                        onMouseLeave={() => setHoveredEdge(null)}
                      />
                    );
                  }

                  return (
                    <line
                      key={edge.id}
                      x1={source.x}
                      y1={source.y}
                      x2={target.x}
                      y2={target.y}
                      stroke={isConnectedToHovered ? '#38bdf8' : isDarkMode ? '#64748b' : '#94a3b8'}
                      strokeWidth={isConnectedToHovered ? 3.5 : 2.2}
                      strokeOpacity={isDimmed ? 0.12 : isConnectedToHovered ? 1.0 : 0.65}
                      markerEnd="url(#link-arrow)"
                      className="transition-all duration-150 cursor-pointer"
                      onMouseEnter={() => setHoveredEdge(edge)}
                      onMouseLeave={() => setHoveredEdge(null)}
                    />
                  );
                })}
              </g>

              {/* 2. NODES LAYER */}
              <g className="nodes-layer">
                {nodePositions.map((node) => {
                  if (typeof node.x !== 'number' || typeof node.y !== 'number') return null;

                  const isHovered = hoveredNodeId === node.id;
                  const isNeighborOfHovered = hoveredNodeId && connectedNodeIds.has(node.id);
                  const isDimmed = hoveredNodeId && !isHovered && !isNeighborOfHovered;
                  const isActive = activePageId === node.id;

                  const labelWidth = Math.max(64, node.title.length * 7.5 + 20);

                  return (
                    <g
                      key={node.id}
                      transform={`translate(${node.x}, ${node.y})`}
                      opacity={isDimmed ? 0.15 : 1.0}
                      className="cursor-pointer group transition-opacity duration-150"
                      onPointerDown={(e) => handleNodePointerDown(node, e)}
                      onMouseEnter={() => setHoveredNodeId(node.id)}
                      onMouseLeave={() => setHoveredNodeId(null)}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectPage(node.id);
                      }}
                    >
                      {/* Active / Hovered Multi-Ring Glowing Pulse */}
                      {(isActive || isHovered || isNeighborOfHovered) && (
                        <circle
                          r={node.radius + (isHovered ? 10 : 7)}
                          fill={
                            isHovered
                              ? 'rgba(56, 189, 248, 0.35)'
                              : isActive
                              ? 'rgba(147, 51, 234, 0.35)'
                              : 'rgba(168, 85, 247, 0.25)'
                          }
                          className="animate-pulse"
                        />
                      )}

                      {/* Node Body Circle */}
                      <circle
                        r={node.radius}
                        fill={node.color || '#8b5cf6'}
                        stroke={isDarkMode ? '#0f172a' : '#ffffff'}
                        strokeWidth={isActive || isHovered ? 3.5 : 2.5}
                        className="transition-transform duration-150 group-hover:scale-115 shadow-md"
                      />

                      {/* Label Badge with readable contrasting pill */}
                      <g transform={`translate(0, ${node.radius + 14})`}>
                        <rect
                          x={-labelWidth / 2}
                          y="-10"
                          width={labelWidth}
                          height="20"
                          rx="6"
                          fill={
                            isHovered
                              ? isDarkMode
                                ? '#1e293b'
                                : '#ffffff'
                              : isDarkMode
                              ? 'rgba(15, 23, 42, 0.94)'
                              : 'rgba(255, 255, 255, 0.95)'
                          }
                          stroke={
                            isHovered
                              ? '#38bdf8'
                              : isNeighborOfHovered
                              ? node.color
                              : isDarkMode
                              ? 'rgba(51, 65, 85, 0.8)'
                              : 'rgba(203, 213, 225, 0.9)'
                          }
                          strokeWidth={isHovered || isNeighborOfHovered ? 2 : 1}
                        />
                        <text
                          textAnchor="middle"
                          y="4"
                          fontSize="11"
                          fontWeight={isActive || isHovered ? 'bold' : '600'}
                          fill={isDarkMode ? '#f8fafc' : '#0f172a'}
                          className="pointer-events-none select-none"
                        >
                          {node.title}
                        </text>
                      </g>
                    </g>
                  );
                })}
              </g>
            </g>
          </svg>

          {/* Empty State Fallback */}
          {nodePositions.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-slate-400">
              <BookOpen className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm font-semibold">No notes match the current filter.</p>
            </div>
          )}

          {/* Legend Overlay */}
          <div className="absolute bottom-4 left-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl text-[11px] space-y-1.5 pointer-events-none">
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-slate-500" />
              <span className="text-slate-700 dark:text-slate-300 font-medium">Wiki Link (Manual)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 border-t-2 border-dashed border-purple-500" />
              <span className="text-purple-700 dark:text-purple-300 font-medium">AI Suggested Connection</span>
            </div>
            <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800 font-mono">
              {nodePositions.length} Notes • {edges.length} Connections
            </div>
          </div>

          {/* Hovered Edge Info Tooltip */}
          {hoveredEdge && (
            <div className="absolute bottom-4 right-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3 py-2 rounded-xl border border-purple-300 dark:border-purple-700 shadow-xl text-xs flex items-center gap-2 z-20 pointer-events-none">
              <span className="font-semibold text-purple-700 dark:text-purple-300">
                [[{activeNodeMap.get(hoveredEdge.source)?.title}]]
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-semibold text-purple-700 dark:text-purple-300">
                [[{activeNodeMap.get(hoveredEdge.target)?.title}]]
              </span>
              {hoveredEdge.isAi && (
                <span className="text-[10px] px-1.5 py-0.5 bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-300 rounded font-mono">
                  AI ({Math.round((hoveredEdge.confidence || 0.8) * 100)}%)
                </span>
              )}
            </div>
          )}

          {/* Hovered Node Quick Info Card */}
          {hoveredNodeId && activeNodeMap.get(hoveredNodeId) && (
            <div className="absolute top-4 right-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-3.5 rounded-2xl border border-purple-200 dark:border-purple-800 shadow-2xl text-xs max-w-xs animate-in fade-in zoom-in-95 duration-100 z-20">
              <span className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider block mb-0.5">
                {activeNodeMap.get(hoveredNodeId)?.notebookName}
              </span>
              <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                {activeNodeMap.get(hoveredNodeId)?.title}
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Connected to <strong>{activeNodeMap.get(hoveredNodeId)?.connectedNodeIds.size}</strong> notes.
              </p>
              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => onSelectPage(hoveredNodeId)}
                  className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs"
                >
                  Open Note
                </button>
                {onOpenMindMap && (
                  <button
                    onClick={() => {
                      const page = allPages.find((p) => p.id === hoveredNodeId);
                      if (page) onOpenMindMap(page);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-semibold text-xs border border-purple-200 dark:border-purple-800"
                  >
                    Mind Map
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
