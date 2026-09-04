import React, { useRef, useEffect, useState, useMemo } from 'react';
import {
  RotateCcw,
  Play,
  Pause,
  ArrowUpRight,
  BrainCircuit,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Workspace, Page } from '@/types/notebook';
import { AiConnectionSuggestion } from '@/types/ai';
import { extractWikiLinks } from '@/lib/notebook/links';

interface KnowledgeGraph3DViewProps {
  workspace: Workspace;
  allPages: Page[];
  aiSuggestions: AiConnectionSuggestion[];
  activePageId: string | null;
  onSelectPage: (pageId: string) => void;
  onOpenMindMap?: (page: Page) => void;
  isDarkMode: boolean;
  searchQuery: string;
  selectedNotebookId: string;
  showAiEdges: boolean;
}

interface Node3DData {
  id: string;
  title: string;
  notebookId: string;
  notebookName: string;
  color: string;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  radius: number;
  degree: number;
  connectedNodeIds: Set<string>;
  // Projected screen coordinates
  projX?: number;
  projY?: number;
  projZ?: number;
  projR?: number;
  visible?: boolean;
}

interface Edge3DData {
  id: string;
  source: string;
  target: string;
  isAi: boolean;
  confidence?: number;
}

interface Star3D {
  x: number;
  y: number;
  z: number;
  size: number;
  alpha: number;
}

export const KnowledgeGraph3DView: React.FC<KnowledgeGraph3DViewProps> = ({
  workspace,
  allPages,
  aiSuggestions,
  activePageId,
  onSelectPage,
  onOpenMindMap,
  isDarkMode,
  searchQuery,
  selectedNotebookId,
  showAiEdges,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [selectedNodeData, setSelectedNodeData] = useState<Node3DData | null>(null);

  // Mutable state refs to prevent scene destruction on toggle
  const autoRotateRef = useRef(autoRotate);
  autoRotateRef.current = autoRotate;

  const showLabelsRef = useRef(showLabels);
  showLabelsRef.current = showLabels;

  const hoveredNodeIdRef = useRef<string | null>(null);
  hoveredNodeIdRef.current = hoveredNodeId;

  // Orbit & Pan State
  const isDraggingRef = useRef(false);
  const isRightClickRef = useRef(false);
  const previousMousePositionRef = useRef({ x: 0, y: 0 });
  const cameraSphericalRef = useRef({ radius: 650, theta: Math.PI / 4, phi: Math.PI / 3 });
  const cameraTargetRef = useRef({ x: 0, y: 0, z: 0 });

  // Node, Edge & Star Data
  const nodesDataRef = useRef<Node3DData[]>([]);
  const edgesDataRef = useRef<Edge3DData[]>([]);
  const starsRef = useRef<Star3D[]>([]);

  // Notebook Color Lookup
  const notebookColorMap = useMemo(() => {
    const map = new Map<string, { name: string; color: string }>();
    workspace.notebooks.forEach((nb) => {
      map.set(nb.id, { name: nb.name, color: nb.color || '#8b5cf6' });
    });
    return map;
  }, [workspace.notebooks]);

  // Generate Universe Starfield
  useEffect(() => {
    const stars: Star3D[] = [];
    const count = 350;
    for (let i = 0; i < count; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 800 + Math.random() * 1200;
      const sinPhi = Math.sin(phi);
      stars.push({
        x: r * sinPhi * Math.cos(theta),
        y: r * Math.cos(phi),
        z: r * sinPhi * Math.sin(theta),
        size: Math.random() * 1.6 + 0.6,
        alpha: Math.random() * 0.5 + 0.25,
      });
    }
    starsRef.current = stars;
  }, []);

  // Build Graph Data
  const { graphNodes, graphEdges } = useMemo(() => {
    const filteredPages = allPages.filter((p) => {
      if (selectedNotebookId !== 'all' && p.notebookId !== selectedNotebookId) return false;
      if (searchQuery.trim() && !p.title.toLowerCase().includes(searchQuery.trim().toLowerCase())) return false;
      return true;
    });

    const pageTitleMap = new Map<string, Page>();
    allPages.forEach((p) => pageTitleMap.set(p.title.toLowerCase().trim(), p));

    const nodeMap = new Map<string, Node3DData>();
    const nodes: Node3DData[] = [];
    const edges: Edge3DData[] = [];

    // Group notebooks to distribute initial clusters in 3D
    const notebookIds = Array.from(new Set(filteredPages.map((p) => p.notebookId)));
    const clusterCenters = new Map<string, { x: number; y: number; z: number }>();
    notebookIds.forEach((nbId, idx) => {
      const angle = (idx / Math.max(1, notebookIds.length)) * Math.PI * 2;
      clusterCenters.set(nbId, {
        x: Math.cos(angle) * 220,
        y: Math.sin(angle * 2) * 80,
        z: Math.sin(angle) * 220,
      });
    });

    // Distribute nodes around cluster centers
    filteredPages.forEach((page, i) => {
      const nb = notebookColorMap.get(page.notebookId);
      const center = clusterCenters.get(page.notebookId) || { x: 0, y: 0, z: 0 };
      const angle = i * 2.399;
      const r = 80 + Math.sqrt(i) * 60;

      const x = center.x + Math.cos(angle) * r;
      const y = center.y + Math.sin(angle * 1.5) * (r * 0.5);
      const z = center.z + Math.sin(angle) * r;

      const nodeData: Node3DData = {
        id: page.id,
        title: page.title,
        notebookId: page.notebookId,
        notebookName: nb?.name || 'Notebook',
        color: nb?.color || '#8b5cf6',
        x,
        y,
        z,
        vx: 0,
        vy: 0,
        vz: 0,
        radius: page.id === activePageId ? 16 : 11,
        degree: 0,
        connectedNodeIds: new Set<string>(),
      };

      nodeMap.set(page.id, nodeData);
      nodes.push(nodeData);
    });

    // Manual WikiLink Edges
    filteredPages.forEach((page) => {
      const links = extractWikiLinks(page.content);
      links.forEach((link) => {
        const targetPage = pageTitleMap.get(link.targetTitle.toLowerCase().trim());
        if (targetPage && nodeMap.has(targetPage.id) && targetPage.id !== page.id) {
          edges.push({
            id: `edge3d-${page.id}-${targetPage.id}`,
            source: page.id,
            target: targetPage.id,
            isAi: false,
          });
          const src = nodeMap.get(page.id);
          const tgt = nodeMap.get(targetPage.id);
          if (src && tgt) {
            src.degree++;
            tgt.degree++;
            src.connectedNodeIds.add(tgt.id);
            tgt.connectedNodeIds.add(src.id);
          }
        }
      });
    });

    // AI Connection Edges
    if (showAiEdges) {
      aiSuggestions.forEach((sug) => {
        if (nodeMap.has(sug.sourcePageId) && nodeMap.has(sug.targetPageId)) {
          edges.push({
            id: `edge3d-ai-${sug.sourcePageId}-${sug.targetPageId}`,
            source: sug.sourcePageId,
            target: sug.targetPageId,
            isAi: true,
            confidence: sug.confidence,
          });
          const src = nodeMap.get(sug.sourcePageId);
          const tgt = nodeMap.get(sug.targetPageId);
          if (src && tgt) {
            src.degree += 0.5;
            tgt.degree += 0.5;
            src.connectedNodeIds.add(tgt.id);
            tgt.connectedNodeIds.add(src.id);
          }
        }
      });
    }

    // Dynamic radius scaled by degree
    nodes.forEach((n) => {
      n.radius = Math.min(22, Math.max(10, (n.id === activePageId ? 16 : 10) + n.degree * 2));
    });

    nodesDataRef.current = nodes;
    edgesDataRef.current = edges;

    return { graphNodes: nodes, graphEdges: edges };
  }, [allPages, selectedNotebookId, searchQuery, notebookColorMap, activePageId, showAiEdges, aiSuggestions]);

  // Main 3D Canvas Projection & Render Engine
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let physicsTick = 0;

    const render = () => {
      animationFrameId = requestAnimationFrame(render);

      const width = container.clientWidth || 900;
      const height = container.clientHeight || 650;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      const nodes = nodesDataRef.current;
      const edges = edgesDataRef.current;
      const stars = starsRef.current;
      const hoveredId = hoveredNodeIdRef.current;
      const hoveredNode = hoveredId ? nodes.find((n) => n.id === hoveredId) : null;
      const connectedSet = hoveredNode ? hoveredNode.connectedNodeIds : null;

      // 1. 3D Force Physics Simulation
      if (physicsTick < 350) {
        physicsTick++;
        const nMap = new Map<string, Node3DData>();
        nodes.forEach((n) => nMap.set(n.id, n));

        const repulsionStrength = 75000;
        const minDist = 60;

        // Coulomb repulsion
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const a = nodes[i];
            const b = nodes[j];
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const dz = b.z - a.z;
            const dist = Math.max(minDist, Math.hypot(dx, dy, dz));
            const force = Math.min(40, repulsionStrength / (dist * dist));

            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            const fz = (dz / dist) * force;

            a.vx -= fx;
            a.vy -= fy;
            a.vz -= fz;
            b.vx += fx;
            b.vy += fy;
            b.vz += fz;
          }
        }

        // Spring attraction
        for (const edge of edges) {
          const src = nMap.get(edge.source);
          const tgt = nMap.get(edge.target);
          if (src && tgt) {
            const dx = tgt.x - src.x;
            const dy = tgt.y - src.y;
            const dz = tgt.z - src.z;
            const dist = Math.hypot(dx, dy, dz) || 1;
            const ideal = edge.isAi ? 260 : 190;
            const displacement = dist - ideal;
            const springK = 0.025;

            const fx = (dx / dist) * displacement * springK;
            const fy = (dy / dist) * displacement * springK;
            const fz = (dz / dist) * displacement * springK;

            src.vx += fx;
            src.vy += fy;
            src.vz += fz;
            tgt.vx -= fx;
            tgt.vy -= fy;
            tgt.vz -= fz;
          }
        }

        // Centering gravity & damping
        const damping = 0.88;
        const centerGravity = 0.0004;
        for (const node of nodes) {
          node.vx = (node.vx - node.x * centerGravity) * damping;
          node.vy = (node.vy - node.y * centerGravity) * damping;
          node.vz = (node.vz - node.z * centerGravity) * damping;
          node.x += node.vx;
          node.y += node.vy;
          node.z += node.vz;
        }
      }

      // 2. Auto-Orbit
      if (autoRotateRef.current && !isDraggingRef.current) {
        cameraSphericalRef.current.theta += 0.0016;
      }

      // 3. Clear Background
      ctx.clearRect(0, 0, width, height);
      if (isDarkMode) {
        const bgGrad = ctx.createRadialGradient(
          width / 2,
          height / 2,
          10,
          width / 2,
          height / 2,
          Math.max(width, height) * 0.75
        );
        bgGrad.addColorStop(0, '#0f172a');
        bgGrad.addColorStop(1, '#020617');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);
      } else {
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, 0, width, height);
      }

      // Camera Matrix Calculation
      const { radius, theta, phi } = cameraSphericalRef.current;
      const target = cameraTargetRef.current;
      const cx = width / 2;
      const cy = height / 2;
      const fov = 750;

      const cosT = Math.cos(theta);
      const sinT = Math.sin(theta);
      const cosP = Math.cos(phi);
      const sinP = Math.sin(phi);

      const project3D = (
        wx: number,
        wy: number,
        wz: number
      ): { sx: number; sy: number; sz: number; scale: number; visible: boolean } => {
        // Translate relative to target
        const rx = wx - target.x;
        const ry = wy - target.y;
        const rz = wz - target.z;

        // Yaw rotation around Y (theta)
        const x1 = rx * cosT - rz * sinT;
        const z1 = rx * sinT + rz * cosT;
        const y1 = ry;

        // Pitch rotation around X (phi)
        const y2 = y1 * sinP - z1 * cosP;
        const z2 = y1 * cosP + z1 * sinP;
        const x2 = x1;

        const camZ = z2 + radius;
        if (camZ <= 30) {
          return { sx: 0, sy: 0, sz: camZ, scale: 0, visible: false };
        }

        const scale = fov / camZ;
        const sx = cx + x2 * scale;
        const sy = cy - y2 * scale;

        return { sx, sy, sz: camZ, scale, visible: true };
      };

      // 4. Render Starfield (Dark mode only)
      if (isDarkMode) {
        for (const star of stars) {
          const p = project3D(star.x, star.y, star.z);
          if (p.visible && p.sx >= -20 && p.sx <= width + 20 && p.sy >= -20 && p.sy <= height + 20) {
            ctx.fillStyle = `rgba(196, 181, 253, ${star.alpha * Math.min(1, p.scale * 1.5)})`;
            ctx.beginPath();
            ctx.arc(p.sx, p.sy, Math.max(0.6, star.size * Math.min(2, p.scale)), 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // 5. Project Nodes
      const nMap = new Map<string, Node3DData>();
      for (const node of nodes) {
        const p = project3D(node.x, node.y, node.z);
        node.projX = p.sx;
        node.projY = p.sy;
        node.projZ = p.sz;
        node.projR = Math.max(3, node.radius * p.scale);
        node.visible = p.visible;
        nMap.set(node.id, node);
      }

      // 6. Draw 3D Edges (Beams)
      for (const edge of edges) {
        const src = nMap.get(edge.source);
        const tgt = nMap.get(edge.target);
        if (!src || !tgt || !src.visible || !tgt.visible) continue;

        const isEdgeHighlighted =
          hoveredId && (edge.source === hoveredId || edge.target === hoveredId);
        const isDimmed = hoveredId && !isEdgeHighlighted;

        const avgZ = (src.projZ! + tgt.projZ!) / 2;
        const depthAlpha = Math.max(0.12, Math.min(0.95, 1 - (avgZ - 300) / 1800));

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(src.projX!, src.projY!);
        ctx.lineTo(tgt.projX!, tgt.projY!);

        if (edge.isAi) {
          // AI Connection Beam
          ctx.strokeStyle = isDimmed
            ? 'rgba(168, 85, 247, 0.1)'
            : isEdgeHighlighted
            ? '#38bdf8'
            : `rgba(192, 132, 252, ${depthAlpha * 0.9})`;
          ctx.lineWidth = Math.max(1, (isEdgeHighlighted ? 3.5 : 2) * (fov / avgZ));
          ctx.setLineDash([5, 4]);
        } else {
          // WikiLink Beam
          ctx.strokeStyle = isDimmed
            ? isDarkMode
              ? 'rgba(100, 116, 139, 0.08)'
              : 'rgba(148, 163, 184, 0.12)'
            : isEdgeHighlighted
            ? '#38bdf8'
            : isDarkMode
            ? `rgba(148, 163, 184, ${depthAlpha * 0.75})`
            : `rgba(100, 116, 139, ${depthAlpha * 0.7})`;
          ctx.lineWidth = Math.max(1, (isEdgeHighlighted ? 3 : 1.5) * (fov / avgZ));
        }

        ctx.stroke();
        ctx.restore();
      }

      // 7. Sort Nodes by Depth (Painter's algorithm: farthest first)
      const sortedNodes = [...nodes].sort((a, b) => (b.projZ || 0) - (a.projZ || 0));

      // 8. Draw 3D Spheres & Labels
      for (const node of sortedNodes) {
        if (!node.visible || node.projX === undefined || node.projY === undefined) continue;

        const sx = node.projX;
        const sy = node.projY;
        const sr = node.projR || 10;
        const isActive = node.id === activePageId;
        const isHovered = node.id === hoveredId;
        const isConnected = connectedSet ? connectedSet.has(node.id) : false;
        const isDimmed = hoveredId && !isHovered && !isConnected;

        ctx.save();

        if (isDimmed) {
          ctx.globalAlpha = 0.2;
        }

        // Active / Hover Pulsing Halo Ring
        if (isActive || isHovered) {
          ctx.beginPath();
          ctx.arc(sx, sy, sr * 1.5, 0, Math.PI * 2);
          ctx.strokeStyle = isHovered ? '#38bdf8' : node.color || '#a855f7';
          ctx.lineWidth = Math.max(2, 2.5 * (fov / (node.projZ || 600)));
          ctx.stroke();
        }

        // 3D Sphere Shading with Radial Gradient
        const grad = ctx.createRadialGradient(
          sx - sr * 0.35,
          sy - sr * 0.35,
          sr * 0.1,
          sx,
          sy,
          sr
        );

        const baseColor = node.color || '#8b5cf6';
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.3, baseColor);
        grad.addColorStop(1, isDarkMode ? '#090d16' : '#1e293b');

        ctx.beginPath();
        ctx.arc(sx, sy, sr, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // Node Border
        ctx.strokeStyle = isHovered ? '#38bdf8' : baseColor;
        ctx.lineWidth = Math.max(1, 1.5 * (fov / (node.projZ || 600)));
        ctx.stroke();

        // Node Title Labels
        if (showLabelsRef.current || isHovered || isActive) {
          const fontSize = Math.max(9, Math.min(13, 11 * (fov / (node.projZ || 600))));
          ctx.font = `600 ${fontSize}px system-ui, -apple-system, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          const text = node.title || 'Untitled Note';
          const textMetrics = ctx.measureText(text);
          const paddingX = 8;
          const paddingY = 4;
          const pillW = textMetrics.width + paddingX * 2;
          const pillH = fontSize + paddingY * 2;
          const pillX = sx - pillW / 2;
          const pillY = sy + sr + 6;

          // Glass pill background
          ctx.beginPath();
          ctx.roundRect(pillX, pillY, pillW, pillH, 6);
          ctx.fillStyle = isDarkMode ? 'rgba(15, 23, 42, 0.92)' : 'rgba(255, 255, 255, 0.94)';
          ctx.fill();

          ctx.strokeStyle = isHovered ? '#38bdf8' : isDarkMode ? 'rgba(51, 65, 85, 0.8)' : 'rgba(203, 213, 225, 0.8)';
          ctx.lineWidth = 1;
          ctx.stroke();

          // Text content
          ctx.fillStyle = isDarkMode ? '#f8fafc' : '#0f172a';
          ctx.fillText(text, sx, pillY + pillH / 2);
        }

        ctx.restore();
      }

      ctx.restore();
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isDarkMode, graphNodes, graphEdges]);

  // Pointer & Drag Handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    isRightClickRef.current = e.button === 2 || e.shiftKey;
    previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (isDraggingRef.current) {
      const deltaX = e.clientX - previousMousePositionRef.current.x;
      const deltaY = e.clientY - previousMousePositionRef.current.y;

      if (isRightClickRef.current) {
        // Pan Target
        const panSpeed = 0.65;
        cameraTargetRef.current.x -= deltaX * panSpeed;
        cameraTargetRef.current.y += deltaY * panSpeed;
      } else {
        // Orbit Angles
        cameraSphericalRef.current.theta -= deltaX * 0.006;
        cameraSphericalRef.current.phi = Math.max(
          0.05,
          Math.min(Math.PI - 0.05, cameraSphericalRef.current.phi - deltaY * 0.006)
        );
      }

      previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
      return;
    }

    // Raycast / Hit-test 2D projected node positions (front to back)
    const nodes = nodesDataRef.current;
    let hitNode: Node3DData | null = null;
    let closestZ = Infinity;

    for (const node of nodes) {
      if (!node.visible || node.projX === undefined || node.projY === undefined) continue;
      const hitRadius = Math.max(14, (node.projR || 10) + 4);
      const dist = Math.hypot(mouseX - node.projX, mouseY - node.projY);

      if (dist <= hitRadius && (node.projZ || 0) < closestZ) {
        closestZ = node.projZ || 0;
        hitNode = node;
      }
    }

    if (hitNode) {
      setHoveredNodeId(hitNode.id);
      canvas.style.cursor = 'pointer';
    } else {
      setHoveredNodeId(null);
      canvas.style.cursor = isDraggingRef.current ? 'grabbing' : 'grab';
    }
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 0.9 : 1.1;
    cameraSphericalRef.current.radius = Math.max(
      150,
      Math.min(2000, cameraSphericalRef.current.radius * zoomFactor)
    );
  };

  const handleClick = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const nodes = nodesDataRef.current;
    let hitNode: Node3DData | null = null;
    let closestZ = Infinity;

    for (const node of nodes) {
      if (!node.visible || node.projX === undefined || node.projY === undefined) continue;
      const hitRadius = Math.max(14, (node.projR || 10) + 4);
      const dist = Math.hypot(mouseX - node.projX, mouseY - node.projY);

      if (dist <= hitRadius && (node.projZ || 0) < closestZ) {
        closestZ = node.projZ || 0;
        hitNode = node;
      }
    }

    if (hitNode) {
      setSelectedNodeData(hitNode);
    } else {
      setSelectedNodeData(null);
    }
  };

  const handleResetCamera = () => {
    cameraSphericalRef.current = { radius: 650, theta: Math.PI / 4, phi: Math.PI / 3 };
    cameraTargetRef.current = { x: 0, y: 0, z: 0 };
  };

  return (
    <div
      ref={containerRef}
      className="flex-1 w-full h-full relative overflow-hidden select-none bg-slate-950"
    >
      {/* 3D Canvas Viewport */}
      <canvas
        ref={canvasRef}
        className="w-full h-full block cursor-grab active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
        onClick={handleClick}
        onContextMenu={(e) => e.preventDefault()}
      />

      {/* Floating 3D Control Overlay */}
      <div className="absolute top-4 left-4 z-20 flex flex-wrap items-center gap-2 bg-slate-900/90 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-800 text-xs shadow-2xl">
        <button
          onClick={() => setAutoRotate((prev) => !prev)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-all ${
            autoRotate
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
          title="Toggle 3D Cinematic Auto-Orbit"
        >
          {autoRotate ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          <span>{autoRotate ? 'Orbiting' : 'Orbit'}</span>
        </button>

        <button
          onClick={() => setShowLabels((prev) => !prev)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-all ${
            showLabels
              ? 'bg-slate-800 text-purple-300'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
          title="Toggle 3D Note Title Labels"
        >
          {showLabels ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          <span>Labels</span>
        </button>

        <button
          onClick={handleResetCamera}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          title="Reset 3D Camera View"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 3D Navigation Guide Tip */}
      <div className="absolute bottom-4 left-4 z-20 bg-slate-900/85 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-800 text-[11px] text-slate-300 space-y-1 pointer-events-none shadow-xl">
        <div className="flex items-center gap-3 font-medium">
          <span>🖱️ <strong>Left Drag</strong>: Rotate 360°</span>
          <span>•</span>
          <span>🖱️ <strong>Right Drag</strong>: Pan</span>
          <span>•</span>
          <span>🔍 <strong>Scroll</strong>: Zoom</span>
        </div>
        <div className="text-[10px] text-purple-400 font-mono">
          {graphNodes.length} 3D Nodes • {graphEdges.length} 3D Beams • Hover node to highlight connections
        </div>
      </div>

      {/* Selected Node Details Modal / Floating Card */}
      {selectedNodeData && (
        <div className="absolute top-4 right-4 z-30 w-80 bg-slate-900/95 backdrop-blur-md p-4 rounded-2xl border border-purple-800/80 shadow-2xl text-xs text-slate-200 animate-in fade-in zoom-in-95 duration-150 space-y-3">
          <div className="flex items-center justify-between">
            <span
              className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider"
              style={{
                backgroundColor: `${selectedNodeData.color}25`,
                color: selectedNodeData.color,
                border: `1px solid ${selectedNodeData.color}60`,
              }}
            >
              {selectedNodeData.notebookName}
            </span>
            <button
              onClick={() => setSelectedNodeData(null)}
              className="text-slate-400 hover:text-white p-1"
            >
              ✕
            </button>
          </div>

          <div>
            <h3 className="text-sm font-bold text-white leading-snug">{selectedNodeData.title}</h3>
            <p className="text-[11px] text-slate-400 mt-1">
              Connected to <strong>{selectedNodeData.connectedNodeIds.size}</strong> notes in your knowledge graph.
            </p>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
            <button
              onClick={() => {
                onSelectPage(selectedNodeData.id);
                setSelectedNodeData(null);
              }}
              className="flex-1 py-1.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs"
            >
              <span>Open Note</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>

            {onOpenMindMap && (
              <button
                onClick={() => {
                  const page = allPages.find((p) => p.id === selectedNodeData.id);
                  if (page) onOpenMindMap(page);
                  setSelectedNodeData(null);
                }}
                className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-purple-300 font-semibold text-xs flex items-center gap-1.5 border border-slate-700 transition-colors"
                title="Generate Mind Map for this Note"
              >
                <BrainCircuit className="w-3.5 h-3.5 text-purple-400" />
                <span>Mind Map</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
