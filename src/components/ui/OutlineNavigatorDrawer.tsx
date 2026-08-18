import React, { useState, useMemo } from 'react';
import {
  Search,
  X,
  ListTree,
  ChevronDown,
  ChevronRight,
  Maximize2,
  Minimize2,
  Tag,
  Sparkles,
  Layers,
} from 'lucide-react';
import { MapMindNode, MapMindEdge, NodeColorTheme } from '@/types/graph';

interface OutlineNavigatorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: MapMindNode[];
  edges: MapMindEdge[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
  onFoldLevel: (level: number | 'all-expand' | 'all-collapse') => void;
  onToggleCollapse?: (nodeId: string) => void;
}

interface TreeNode {
  id: string;
  label: string;
  sublabel?: string;
  tags?: string[];
  colorTheme: NodeColorTheme;
  depth: number;
  isRoot: boolean;
  collapsed?: boolean;
  children: TreeNode[];
}

export const OutlineNavigatorDrawer: React.FC<OutlineNavigatorDrawerProps> = ({
  isOpen,
  onClose,
  nodes,
  edges,
  selectedNodeId,
  onSelectNode,
  onFoldLevel,
  onToggleCollapse,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Build hierarchical tree data structure
  const treeData = useMemo(() => {
    const nodeMap = new Map<string, MapMindNode>();
    nodes.forEach((n) => nodeMap.set(n.id, n));

    const childrenMap = new Map<string, string[]>();
    edges.forEach((e) => {
      const list = childrenMap.get(e.source) || [];
      list.push(e.target);
      childrenMap.set(e.source, list);
    });

    // Identify roots or root candidates
    let root = nodes.find((n) => n.data?.isRoot);
    if (!root && nodes.length > 0) {
      const targetIds = new Set(
        edges.filter((e) => e.source !== e.target).map((e) => e.target)
      );
      root = nodes.find((n) => !targetIds.has(n.id)) || nodes[0];
    }

    if (!root) return [];

    function buildBranch(nodeId: string, depth: number, ancestors = new Set<string>()): TreeNode | null {
      const n = nodeMap.get(nodeId);
      if (!n) return null;

      const nextAncestors = new Set(ancestors);
      nextAncestors.add(nodeId);

      const rawChildIds = childrenMap.get(nodeId) || [];
      // Filter out self-loops and back-edges to ancestors to prevent cyclic stack overflow
      const childIds = Array.from(new Set(rawChildIds)).filter(
        (cid) => cid !== nodeId && !ancestors.has(cid)
      );

      const childBranches = childIds
        .map((cid) => buildBranch(cid, depth + 1, nextAncestors))
        .filter(Boolean) as TreeNode[];

      return {
        id: n.id,
        label: n.data?.label || 'Untitled Node',
        sublabel: n.data?.sublabel,
        tags: n.data?.tags,
        colorTheme: (n.data?.colorTheme as NodeColorTheme) || 'blue',
        depth,
        isRoot: Boolean(n.data?.isRoot),
        collapsed: Boolean(n.data?.collapsed),
        children: childBranches,
      };
    }

    const tree = buildBranch(root.id, 0);
    return tree ? [tree] : [];
  }, [nodes, edges]);

  // Flattened tree with search filter
  const filteredNodes = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase();
    return nodes.filter((n) => {
      const label = (n.data?.label || '').toLowerCase();
      const sublabel = (n.data?.sublabel || '').toLowerCase();
      const tags = (n.data?.tags || []).join(' ').toLowerCase();
      return label.includes(q) || sublabel.includes(q) || tags.includes(q);
    });
  }, [nodes, searchQuery]);

  if (!isOpen) return null;

  const renderTreeItem = (item: TreeNode) => {
    const isSelected = item.id === selectedNodeId;
    return (
      <div key={item.id} className="space-y-0.5">
        <div
          onClick={() => onSelectNode(item.id)}
          className={`w-full text-left p-2 rounded-xl text-xs transition-all flex items-center gap-2 group cursor-pointer ${
            isSelected
              ? 'bg-blue-500 text-white font-bold shadow-xs'
              : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
          }`}
          style={{ paddingLeft: `${Math.max(8, item.depth * 14 + 6)}px` }}
        >
          {item.children.length > 0 ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleCollapse?.(item.id);
              }}
              title={item.collapsed ? 'Expand branch (Compact layout will adjust)' : 'Collapse branch (Compact layout will adjust)'}
              className="p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            >
              {item.collapsed ? (
                <ChevronRight className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-amber-500 font-bold'}`} />
              ) : (
                <ChevronDown className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
              )}
            </button>
          ) : (
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                isSelected ? 'bg-white' : 'bg-slate-400 dark:bg-slate-500'
              }`}
            />
          )}

          <span className="truncate flex-1">{item.label}</span>

          {item.isRoot && (
            <span className={`text-[9px] uppercase px-1.5 py-0.2 rounded font-mono ${
              isSelected ? 'bg-white/20 text-white' : 'bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400'
            }`}>
              Root
            </span>
          )}

          {item.children.length > 0 && (
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              isSelected
                ? 'bg-white/20 text-white'
                : item.collapsed
                ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 font-bold'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
            }`}>
              {item.children.length}
            </span>
          )}
        </div>

        {item.children.length > 0 && !item.collapsed && (
          <div className="space-y-0.5">
            {item.children.map((child) => renderTreeItem(child))}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className="fixed top-16 left-0 bottom-0 z-30 w-80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-r border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-left duration-200">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
            <ListTree className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
              Map Outline & Navigator
            </h3>
            <span className="text-[10px] text-slate-400">
              {nodes.length} nodes • {edges.length} connections
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Search Input */}
      <div className="p-3 border-b border-slate-100 dark:border-slate-800">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search all branches or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-8 pr-7 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Quick Level Folding Buttons */}
      <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 flex items-center justify-between gap-1 text-[11px]">
        <div className="flex items-center gap-1 font-semibold text-slate-500 dark:text-slate-400">
          <Layers className="w-3 h-3" />
          <span>Levels:</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onFoldLevel(1)}
            title="Fold everything to Level 1 (Main Topics only)"
            className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-blue-950/50 text-slate-700 dark:text-slate-300 font-bold"
          >
            L1
          </button>
          <button
            onClick={() => onFoldLevel(2)}
            title="Fold to Level 2 (Subtopics)"
            className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-blue-950/50 text-slate-700 dark:text-slate-300 font-bold"
          >
            L2
          </button>
          <button
            onClick={() => onFoldLevel('all-expand')}
            title="Expand All Nodes"
            className="p-1 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-600 dark:text-slate-300"
          >
            <Maximize2 className="w-3 h-3" />
          </button>
          <button
            onClick={() => onFoldLevel('all-collapse')}
            title="Collapse All Nodes to Root"
            className="p-1 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-600 dark:text-slate-300"
          >
            <Minimize2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Tree / Search Results List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {filteredNodes ? (
          filteredNodes.length > 0 ? (
            filteredNodes.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => onSelectNode(n.id)}
                className={`w-full text-left p-2 rounded-xl text-xs transition-all flex flex-col gap-0.5 ${
                  n.id === selectedNodeId
                    ? 'bg-blue-500 text-white font-bold shadow-xs'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  {n.data?.isRoot && <Sparkles className="w-3 h-3 text-amber-400" />}
                  <span className="truncate font-semibold">{n.data?.label || 'Untitled'}</span>
                </div>
                {n.data?.tags && (
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {n.data.tags.map((t, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.2 rounded bg-black/10 dark:bg-white/10"
                      >
                        <Tag className="w-2 h-2" />
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            ))
          ) : (
            <div className="text-center py-8 text-xs text-slate-400">
              No matching branches found for "{searchQuery}"
            </div>
          )
        ) : treeData.length > 0 ? (
          treeData.map((root) => renderTreeItem(root))
        ) : (
          <div className="text-center py-8 text-xs text-slate-400">
            Empty canvas. Add a node to start!
          </div>
        )}
      </div>
    </aside>
  );
};
