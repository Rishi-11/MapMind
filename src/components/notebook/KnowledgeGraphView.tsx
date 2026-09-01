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
} from 'lucide-react';
import { Workspace, Page } from '@/types/notebook';
import { AiConnectionSuggestion } from '@/types/ai';
import { extractWikiLinks } from '@/lib/notebook/links';

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

  // Filters & State
  const [selectedNotebookId, setSelectedNotebookId] = useState<string>('all');
  const [showAiEdges, setShowAiEdges] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Dimensions
  const [dimensions, setDimensions] = useState({ width: 900, height: 650 });

  // Pan & Zoom
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
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

  // Build Graph Nodes & Edges
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

    const count = filteredPages.length;
    const goldenAngle = Math.PI * (3 - Math.sqrt(5)); // ~137.5 degrees

    filteredPages.forEach((page, i) => {
      const nb = notebookColorMap.get(page.notebookId);
      const existing = persistentCoordsRef.current.get(page.id);

      let x: number;
      let y: number;
      let vx = 0;
      let vy = 0;

      if (existing) {
        x = existing.x;
        y = existing.y;
        vx = existing.vx;
        vy = existing.vy;
      } else {
        // Sunflower spiral initial placement with spacious distribution
        const angle = i * goldenAngle;
        const radius = count > 1 ? 160 + Math.sqrt(i) * 75 : 0;
        x = Math.cos(angle) * radius;
        y = Math.sin(angle) * radius;
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
        radius: page.id === activePageId ? 18 : 13,
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
        }
      });
    }

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

  // Force-Directed Physics Simulation Loop (Coulomb Repulsion + Hooke Spring Attraction)
  useEffect(() => {
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

        // 1. Coulomb Repulsion between all node pairs
        for (let i = 0; i < nodesCopy.length; i++) {
          for (let j = i + 1; j < nodesCopy.length; j++) {
            const a = nodesCopy[i];
            const b = nodesCopy[j];
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const dist = Math.hypot(dx, dy) || 0.1;

            // Repulsion force inversely proportional to distance squared
            const repulsionStrength = 2200;
            const force = Math.min(25, repulsionStrength / (dist * dist));
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;

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
            const dist = Math.hypot(dx, dy) || 0.1;
            const idealDist = edge.isAi ? 180 : 130;
            const springK = 0.025;
            const displacement = dist - idealDist;
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
        const friction = 0.88;
        const centerGravity = 0.0006;

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

      // Keep animation running while settling or dragging
      if (tickCount < maxTicks || draggedNodeIdRef.current) {
        animId = requestAnimationFrame(tick);
      }
    };

    animId = requestAnimationFrame(tick);

    return () => {
      running = false;
      cancelAnimationFrame(animId);
    };
  }, [edges]);

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

  // Node Pointer Down to start node drag
  const handleNodePointerDown = (node: GraphNodeData, e: React.PointerEvent) => {
    e.stopPropagation();
    draggedNodeIdRef.current = node.id;
    const mouseX = (e.clientX - dimensions.width / 2 - transform.x) / transform.k;
    const mouseY = (e.clientY - dimensions.height / 2 - transform.y) / transform.k;
    dragNodeStartRef.current = { x: mouseX - node.x, y: mouseY - node.y };
  };

  // Wheel Zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.88;
    setTransform((prev) => ({
      ...prev,
      k: Math.max(0.25, Math.min(3.5, prev.k * zoomFactor)),
    }));
  };

  // Node Lookup map for fast edge rendering
  const activeNodeMap = useMemo(() => {
    const map = new Map<string, GraphNodeData>();
    nodePositions.forEach((n) => map.set(n.id, n));
    return map;
  }, [nodePositions]);

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
            <span>Interactive Knowledge Graph</span>
          </div>

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
        </div>
      </div>

      {/* SVG Canvas Area */}
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
            <pattern id="graph-grid" width="36" height="36" patternUnits="userSpaceOnUse">
              <circle
                cx="18"
                cy="18"
                r="1.2"
                fill={isDarkMode ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.08)'}
              />
            </pattern>
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
                if (!source || !target) return null;

                const isHovered = hoveredNodeId && (edge.source === hoveredNodeId || edge.target === hoveredNodeId);

                if (edge.isAi) {
                  return (
                    <line
                      key={edge.id}
                      x1={source.x}
                      y1={source.y}
                      x2={target.x}
                      y2={target.y}
                      stroke={isHovered ? '#c084fc' : isDarkMode ? 'rgba(168, 85, 247, 0.55)' : 'rgba(147, 51, 234, 0.5)'}
                      strokeWidth={isHovered ? 2.5 : 1.6}
                      strokeDasharray="6,6"
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
                    stroke={
                      isHovered
                        ? isDarkMode
                          ? '#38bdf8'
                          : '#0284c7'
                        : isDarkMode
                        ? 'rgba(148, 163, 184, 0.45)'
                        : 'rgba(100, 116, 139, 0.4)'
                    }
                    strokeWidth={isHovered ? 2.8 : 2}
                  />
                );
              })}
            </g>

            {/* 2. NODES LAYER */}
            <g className="nodes-layer">
              {nodePositions.map((node) => {
                const isHovered = hoveredNodeId === node.id;
                const isActive = activePageId === node.id;

                const labelWidth = Math.max(60, node.title.length * 7 + 16);

                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x}, ${node.y})`}
                    className="cursor-pointer group"
                    onPointerDown={(e) => handleNodePointerDown(node, e)}
                    onMouseEnter={() => setHoveredNodeId(node.id)}
                    onMouseLeave={() => setHoveredNodeId(null)}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectPage(node.id);
                    }}
                  >
                    {/* Outer Glowing Halo for Active or Hovered node */}
                    {(isActive || isHovered) && (
                      <circle
                        r={node.radius + 8}
                        fill={isActive ? 'rgba(147, 51, 234, 0.35)' : 'rgba(59, 130, 246, 0.3)'}
                        className="animate-pulse"
                      />
                    )}

                    {/* Node Body Circle */}
                    <circle
                      r={node.radius}
                      fill={node.color || '#8b5cf6'}
                      stroke={isDarkMode ? '#0f172a' : '#ffffff'}
                      strokeWidth={isActive ? 3.5 : 2}
                      className="transition-transform duration-150 group-hover:scale-115"
                    />

                    {/* Label Badge with readable contrasting pill */}
                    <g transform={`translate(0, ${node.radius + 14})`}>
                      <rect
                        x={-labelWidth / 2}
                        y="-10"
                        width={labelWidth}
                        height="18"
                        rx="5"
                        fill={isDarkMode ? 'rgba(15, 23, 42, 0.92)' : 'rgba(255, 255, 255, 0.95)'}
                        stroke={isDarkMode ? 'rgba(51, 65, 85, 0.8)' : 'rgba(203, 213, 225, 0.9)'}
                        strokeWidth="1"
                      />
                      <text
                        textAnchor="middle"
                        y="3"
                        fontSize="11"
                        fontWeight={isActive || isHovered ? 'bold' : '500'}
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
        <div className="absolute bottom-4 left-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl text-[11px] space-y-1.5 pointer-events-none">
          <div className="flex items-center gap-2">
            <div className="w-3.5 h-0.5 bg-slate-500" />
            <span className="text-slate-700 dark:text-slate-300 font-medium">Wiki Link (Manual)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3.5 h-0.5 border-t-2 border-dashed border-purple-500" />
            <span className="text-purple-700 dark:text-purple-300 font-medium">AI Suggested (Multi-Signal)</span>
          </div>
          <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800 font-mono">
            {nodePositions.length} Notes • {edges.length} Connections
          </div>
        </div>

        {/* Hovered Node Quick Info Card */}
        {hoveredNodeId && activeNodeMap.get(hoveredNodeId) && (
          <div className="absolute top-4 right-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-3 rounded-xl border border-purple-200 dark:border-purple-800 shadow-xl text-xs max-w-xs animate-in fade-in zoom-in-95 duration-100 z-20">
            <span className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider block mb-0.5">
              {activeNodeMap.get(hoveredNodeId)?.notebookName}
            </span>
            <h4 className="font-bold text-slate-900 dark:text-slate-100">
              {activeNodeMap.get(hoveredNodeId)?.title}
            </h4>
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => onSelectPage(hoveredNodeId)}
                className="px-2.5 py-1 rounded bg-purple-600 hover:bg-purple-700 text-white font-medium text-[10px]"
              >
                Open Note
              </button>
              {onOpenMindMap && (
                <button
                  onClick={() => {
                    const page = allPages.find((p) => p.id === hoveredNodeId);
                    if (page) onOpenMindMap(page);
                  }}
                  className="px-2.5 py-1 rounded bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-medium text-[10px] border border-purple-200 dark:border-purple-800"
                >
                  Mind Map
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
