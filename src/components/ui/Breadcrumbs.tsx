import React, { useMemo } from 'react';
import { ChevronRight, Home, Focus, Layers } from 'lucide-react';
import { MapMindNode, MapMindEdge, NodeColorTheme } from '@/types/graph';

interface BreadcrumbsProps {
  selectedNodeId: string | null;
  nodes: MapMindNode[];
  edges: MapMindEdge[];
  onSelectNode: (nodeId: string) => void;
  isSpotlightActive: boolean;
  onToggleSpotlight: () => void;
}

interface BreadcrumbItem {
  id: string;
  label: string;
  isRoot: boolean;
  colorTheme: NodeColorTheme;
  depth: number;
}

const COLOR_DOTS: Record<NodeColorTheme, string> = {
  slate: 'bg-slate-500',
  blue: 'bg-blue-500',
  emerald: 'bg-emerald-500',
  amber: 'bg-amber-500',
  rose: 'bg-rose-500',
  purple: 'bg-purple-500',
  cyan: 'bg-cyan-500',
};

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
  selectedNodeId,
  nodes,
  edges,
  onSelectNode,
  isSpotlightActive,
  onToggleSpotlight,
}) => {
  // Traverse upwards from selected node to root
  const breadcrumbTrail = useMemo(() => {
    if (!selectedNodeId) return [];

    const nodeMap = new Map<string, MapMindNode>();
    nodes.forEach((n) => nodeMap.set(n.id, n));

    const parentEdgeMap = new Map<string, string>();
    edges.forEach((e) => {
      parentEdgeMap.set(e.target, e.source);
    });

    const path: BreadcrumbItem[] = [];
    const visited = new Set<string>();
    let currentId: string | undefined = selectedNodeId;

    while (currentId && !visited.has(currentId)) {
      visited.add(currentId);
      const node = nodeMap.get(currentId);
      if (!node) break;

      path.unshift({
        id: node.id,
        label: node.data?.label || 'Untitled Node',
        isRoot: Boolean(node.data?.isRoot),
        colorTheme: (node.data?.colorTheme as NodeColorTheme) || 'blue',
        depth: 0, // Will recalculate below
      });

      currentId = parentEdgeMap.get(currentId);
    }

    return path.map((item, idx) => ({ ...item, depth: idx }));
  }, [selectedNodeId, nodes, edges]);

  if (breadcrumbTrail.length === 0) return null;

  return (
    <div className="absolute top-4 left-4 z-20 max-w-[calc(100vw-280px)] pointer-events-auto animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/80 dark:border-slate-700/80 shadow-md text-xs text-slate-700 dark:text-slate-200 overflow-x-auto no-scrollbar">
        {/* Spotlight / Focus Subtree Button */}
        <button
          onClick={onToggleSpotlight}
          title={isSpotlightActive ? 'Disable Subtree Focus (Show all nodes)' : 'Enable Subtree Focus (Spotlight active branch, dim others)'}
          className={`flex items-center gap-1 px-2 py-0.5 rounded-lg font-semibold transition-all mr-1 text-[11px] ${
            isSpotlightActive
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
          }`}
        >
          <Focus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Focus</span>
        </button>

        <div className="h-3.5 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />

        {/* Trail Items */}
        <div className="flex items-center gap-1 flex-nowrap">
          {breadcrumbTrail.map((crumb, idx) => {
            const isLast = idx === breadcrumbTrail.length - 1;
            const dotColor = COLOR_DOTS[crumb.colorTheme] || 'bg-blue-500';

            return (
              <React.Fragment key={crumb.id}>
                {idx > 0 && (
                  <ChevronRight className="w-3 h-3 text-slate-400 dark:text-slate-500 shrink-0" />
                )}
                <button
                  type="button"
                  onClick={() => onSelectNode(crumb.id)}
                  className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg transition-colors truncate max-w-[160px] ${
                    isLast
                      ? 'bg-slate-100 dark:bg-slate-800 font-bold text-slate-950 dark:text-slate-50'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-medium'
                  }`}
                  title={`Jump to: ${crumb.label} (Level ${crumb.depth})`}
                >
                  {crumb.isRoot ? (
                    <Home className="w-3 h-3 text-indigo-500 shrink-0" />
                  ) : (
                    <span className={`w-2 h-2 rounded-full ${dotColor} shrink-0`} />
                  )}
                  <span className="truncate">{crumb.label}</span>
                </button>
              </React.Fragment>
            );
          })}
        </div>

        {/* Depth Level Indicator */}
        <div className="hidden md:flex items-center gap-1 text-[10px] text-slate-400 font-mono pl-1">
          <Layers className="w-3 h-3" />
          <span>L{breadcrumbTrail.length - 1}</span>
        </div>
      </div>
    </div>
  );
};
