import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  X,
  Tag,
  ArrowRight,
  Home,
  FileText,
  Compass,
} from 'lucide-react';
import { MapMindNode, MapMindEdge, NodeColorTheme } from '@/types/graph';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: MapMindNode[];
  edges: MapMindEdge[];
  onSelectNode: (nodeId: string) => void;
}

interface SearchItem {
  id: string;
  label: string;
  sublabel?: string;
  tags?: string[];
  notes?: string;
  colorTheme: NodeColorTheme;
  isRoot: boolean;
  parentLabel?: string;
  depth: number;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  nodes,
  edges,
  onSelectNode,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filterType, setFilterType] = useState<'all' | 'tags' | 'pillars' | 'notes'>('all');
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Build indexed search items with depth and parent labels
  const indexedNodes = useMemo(() => {
    const nodeMap = new Map<string, MapMindNode>();
    nodes.forEach((n) => nodeMap.set(n.id, n));

    const parentMap = new Map<string, string>();
    edges.forEach((e) => {
      parentMap.set(e.target, e.source);
    });

    let root = nodes.find((n) => n.data?.isRoot);
    if (!root && nodes.length > 0) {
      const targetIds = new Set(edges.map((e) => e.target));
      root = nodes.find((n) => !targetIds.has(n.id)) || nodes[0];
    }

    // Depth calculator
    const depthMap = new Map<string, number>();
    if (root) {
      const queue: { id: string; depth: number }[] = [{ id: root.id, depth: 0 }];
      depthMap.set(root.id, 0);
      while (queue.length > 0) {
        const { id, depth } = queue.shift()!;
        const children = edges.filter((e) => e.source === id).map((e) => e.target);
        for (const cid of children) {
          if (!depthMap.has(cid)) {
            depthMap.set(cid, depth + 1);
            queue.push({ id: cid, depth: depth + 1 });
          }
        }
      }
    }

    return nodes.map((node): SearchItem => {
      const parentId = parentMap.get(node.id);
      const parentNode = parentId ? nodeMap.get(parentId) : undefined;
      return {
        id: node.id,
        label: node.data?.label || 'Untitled Node',
        sublabel: node.data?.sublabel,
        tags: node.data?.tags,
        notes: node.data?.notes,
        colorTheme: (node.data?.colorTheme as NodeColorTheme) || 'blue',
        isRoot: Boolean(node.data?.isRoot),
        parentLabel: parentNode?.data?.label,
        depth: depthMap.get(node.id) ?? 1,
      };
    });
  }, [nodes, edges]);

  // Filtered search results with fuzzy matching
  const results = useMemo(() => {
    let list = indexedNodes;

    if (filterType === 'tags') {
      list = list.filter((n) => n.tags && n.tags.length > 0);
    } else if (filterType === 'pillars') {
      list = list.filter((n) => n.depth === 1);
    } else if (filterType === 'notes') {
      list = list.filter((n) => Boolean(n.notes));
    }

    if (!query.trim()) {
      return list.slice(0, 30);
    }

    const q = query.toLowerCase().trim();
    return list
      .filter((n) => {
        const matchLabel = n.label.toLowerCase().includes(q);
        const matchSub = n.sublabel?.toLowerCase().includes(q);
        const matchTags = n.tags?.some((t) => t.toLowerCase().includes(q));
        const matchNotes = n.notes?.toLowerCase().includes(q);
        const matchParent = n.parentLabel?.toLowerCase().includes(q);
        return matchLabel || matchSub || matchTags || matchNotes || matchParent;
      })
      .slice(0, 40);
  }, [indexedNodes, query, filterType]);

  // Reset index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query, filterType]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    } else {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const handleSelect = (nodeId: string) => {
    onSelectNode(nodeId);
    onClose();
  };

  // Keyboard navigation inside modal
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) {
        handleSelect(results[selectedIndex].id);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-800">
          <Search className="w-5 h-5 text-blue-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search across all nodes, subtopics, tags, or notes... (Ctrl+K)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none font-medium"
          />
          {query ? (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <kbd className="px-2 py-0.5 text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-500 rounded border border-slate-200 dark:border-slate-700">
              ESC
            </kbd>
          )}
        </div>

        {/* Filter Chips Bar */}
        <div className="flex items-center gap-1.5 px-4 py-2 bg-slate-50 dark:bg-slate-850/60 border-b border-slate-100 dark:border-slate-800 text-[11px] font-medium overflow-x-auto no-scrollbar">
          <button
            onClick={() => setFilterType('all')}
            className={`px-2.5 py-1 rounded-lg transition-colors ${
              filterType === 'all'
                ? 'bg-blue-600 text-white font-bold'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
            }`}
          >
            All Nodes ({indexedNodes.length})
          </button>
          <button
            onClick={() => setFilterType('pillars')}
            className={`px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 ${
              filterType === 'pillars'
                ? 'bg-blue-600 text-white font-bold'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
            }`}
          >
            <Compass className="w-3 h-3" />
            Level 1 Pillars
          </button>
          <button
            onClick={() => setFilterType('tags')}
            className={`px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 ${
              filterType === 'tags'
                ? 'bg-blue-600 text-white font-bold'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
            }`}
          >
            <Tag className="w-3 h-3" />
            Tagged
          </button>
          <button
            onClick={() => setFilterType('notes')}
            className={`px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 ${
              filterType === 'notes'
                ? 'bg-blue-600 text-white font-bold'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-3 h-3" />
            With Notes
          </button>
        </div>

        {/* Results List */}
        <div ref={listRef} className="max-h-[50vh] overflow-y-auto p-2 space-y-1">
          {results.length > 0 ? (
            results.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelect(item.id)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full text-left p-2.5 rounded-xl text-xs transition-all flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className="mt-0.5">
                      {item.isRoot ? (
                        <Home className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-indigo-500'}`} />
                      ) : (
                        <span
                          className={`w-2.5 h-2.5 rounded-full inline-block mt-1 ${
                            isSelected ? 'bg-white' : 'bg-blue-500'
                          }`}
                        />
                      )}
                    </div>

                    <div className="min-w-0">
                      {item.parentLabel && (
                        <div
                          className={`text-[10px] truncate mb-0.5 ${
                            isSelected ? 'text-blue-100' : 'text-slate-400 dark:text-slate-500'
                          }`}
                        >
                          ↳ {item.parentLabel}
                        </div>
                      )}
                      <div className="font-bold text-sm tracking-tight truncate">
                        {item.label}
                      </div>
                      {item.sublabel && (
                        <div
                          className={`text-[11px] truncate mt-0.5 ${
                            isSelected ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {item.sublabel}
                        </div>
                      )}
                      {item.tags && item.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {item.tags.map((t, tIdx) => (
                            <span
                              key={tIdx}
                              className={`inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.2 rounded font-mono ${
                                isSelected
                                  ? 'bg-white/20 text-white'
                                  : 'bg-slate-200/70 dark:bg-slate-700/70 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              <Tag className="w-2 h-2" />
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                      }`}
                    >
                      L{item.depth}
                    </span>
                    <ArrowRight className={`w-3.5 h-3.5 opacity-60 ${isSelected ? 'text-white' : ''}`} />
                  </div>
                </button>
              );
            })
          ) : (
            <div className="text-center py-10 text-xs text-slate-400">
              No matching nodes found for "{query}"
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-850/80 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <div className="flex items-center gap-2">
            <span><kbd className="px-1 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">↑↓</kbd> Navigate</span>
            <span><kbd className="px-1 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">↵</kbd> Fly to Node</span>
          </div>
          <span>{results.length} results</span>
        </div>
      </div>
    </div>
  );
};
