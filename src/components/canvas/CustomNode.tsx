import React, { memo, useState, useCallback, useRef, useEffect } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Plus, Minus, Tag, Sparkles, Lock, Unlock, FileText } from 'lucide-react';
import { CustomNodeData, NodeColorTheme, NodeShape, NodeCardStyle } from '@/types/graph';
import { RoughNodeRenderer } from './RoughNodeRenderer';

const COLOR_CLASSES: Record<
  NodeColorTheme,
  {
    bg: string;
    border: string;
    text: string;
    accent: string;
    tagBg: string;
    tagText: string;
    gradientBg: string;
    glowShadow: string;
    bannerBg: string;
    accentBorder: string;
    glassBg: string;
  }
> = {
  slate: {
    bg: 'bg-white dark:bg-slate-800',
    border: 'border-slate-300 dark:border-slate-600',
    text: 'text-slate-950 dark:text-slate-50',
    accent: 'bg-slate-600',
    tagBg: 'bg-slate-100 dark:bg-slate-700',
    tagText: 'text-slate-800 dark:text-slate-200',
    gradientBg: 'from-slate-100 via-white to-slate-200 dark:from-slate-900 dark:via-slate-800 dark:to-slate-950',
    glowShadow: 'shadow-[0_0_25px_-3px_rgba(100,116,139,0.35)]',
    bannerBg: 'bg-slate-600',
    accentBorder: 'border-slate-600',
    glassBg: 'bg-slate-100/40 dark:bg-slate-800/40',
  },
  blue: {
    bg: 'bg-blue-50/80 dark:bg-blue-950/60',
    border: 'border-blue-300 dark:border-blue-700',
    text: 'text-slate-950 dark:text-slate-50',
    accent: 'bg-blue-600',
    tagBg: 'bg-blue-100 dark:bg-blue-900/70',
    tagText: 'text-blue-900 dark:text-blue-200',
    gradientBg: 'from-blue-500/15 via-indigo-500/10 to-sky-500/15 dark:from-blue-950/80 dark:via-indigo-950/60 dark:to-slate-900',
    glowShadow: 'shadow-[0_0_25px_-3px_rgba(59,130,246,0.4)]',
    bannerBg: 'bg-blue-600',
    accentBorder: 'border-blue-600',
    glassBg: 'bg-blue-500/10 dark:bg-blue-500/15',
  },
  emerald: {
    bg: 'bg-emerald-50/80 dark:bg-emerald-950/60',
    border: 'border-emerald-300 dark:border-emerald-700',
    text: 'text-slate-950 dark:text-slate-50',
    accent: 'bg-emerald-600',
    tagBg: 'bg-emerald-100 dark:bg-emerald-900/70',
    tagText: 'text-emerald-900 dark:text-emerald-200',
    gradientBg: 'from-emerald-500/15 via-teal-500/10 to-green-500/15 dark:from-emerald-950/80 dark:via-teal-950/60 dark:to-slate-900',
    glowShadow: 'shadow-[0_0_25px_-3px_rgba(16,185,129,0.4)]',
    bannerBg: 'bg-emerald-600',
    accentBorder: 'border-emerald-600',
    glassBg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
  },
  amber: {
    bg: 'bg-amber-50/80 dark:bg-amber-950/60',
    border: 'border-amber-300 dark:border-amber-700',
    text: 'text-slate-950 dark:text-slate-50',
    accent: 'bg-amber-600',
    tagBg: 'bg-amber-100 dark:bg-amber-900/70',
    tagText: 'text-amber-900 dark:text-amber-200',
    gradientBg: 'from-amber-500/15 via-orange-500/10 to-yellow-500/15 dark:from-amber-950/80 dark:via-orange-950/60 dark:to-slate-900',
    glowShadow: 'shadow-[0_0_25px_-3px_rgba(245,158,11,0.4)]',
    bannerBg: 'bg-amber-600',
    accentBorder: 'border-amber-600',
    glassBg: 'bg-amber-500/10 dark:bg-amber-500/15',
  },
  rose: {
    bg: 'bg-rose-50/80 dark:bg-rose-950/60',
    border: 'border-rose-300 dark:border-rose-700',
    text: 'text-slate-950 dark:text-slate-50',
    accent: 'bg-rose-600',
    tagBg: 'bg-rose-100 dark:bg-rose-900/70',
    tagText: 'text-rose-900 dark:text-rose-200',
    gradientBg: 'from-rose-500/15 via-pink-500/10 to-red-500/15 dark:from-rose-950/80 dark:via-pink-950/60 dark:to-slate-900',
    glowShadow: 'shadow-[0_0_25px_-3px_rgba(244,63,94,0.4)]',
    bannerBg: 'bg-rose-600',
    accentBorder: 'border-rose-600',
    glassBg: 'bg-rose-500/10 dark:bg-rose-500/15',
  },
  purple: {
    bg: 'bg-purple-50/80 dark:bg-purple-950/60',
    border: 'border-purple-300 dark:border-purple-700',
    text: 'text-slate-950 dark:text-slate-50',
    accent: 'bg-purple-600',
    tagBg: 'bg-purple-100 dark:bg-purple-900/70',
    tagText: 'text-purple-900 dark:text-purple-200',
    gradientBg: 'from-purple-500/15 via-indigo-500/10 to-violet-500/15 dark:from-purple-950/80 dark:via-indigo-950/60 dark:to-slate-900',
    glowShadow: 'shadow-[0_0_25px_-3px_rgba(139,92,246,0.4)]',
    bannerBg: 'bg-purple-600',
    accentBorder: 'border-purple-600',
    glassBg: 'bg-purple-500/10 dark:bg-purple-500/15',
  },
  cyan: {
    bg: 'bg-cyan-50/80 dark:bg-cyan-950/60',
    border: 'border-cyan-300 dark:border-cyan-700',
    text: 'text-slate-950 dark:text-slate-50',
    accent: 'bg-cyan-600',
    tagBg: 'bg-cyan-100 dark:bg-cyan-900/70',
    tagText: 'text-cyan-900 dark:text-cyan-200',
    gradientBg: 'from-cyan-500/15 via-sky-500/10 to-blue-500/15 dark:from-cyan-950/80 dark:via-sky-950/60 dark:to-slate-900',
    glowShadow: 'shadow-[0_0_25px_-3px_rgba(6,182,212,0.4)]',
    bannerBg: 'bg-cyan-600',
    accentBorder: 'border-cyan-600',
    glassBg: 'bg-cyan-500/10 dark:bg-cyan-500/15',
  },
};

export interface CustomNodeProps extends NodeProps {
  data: CustomNodeData & {
    sketchMode?: boolean;
    onToggleCollapse?: (nodeId: string) => void;
    onToggleLock?: (nodeId: string) => void;
    onUpdateLabel?: (nodeId: string, label: string) => void;
    onAddChild?: (nodeId: string) => void;
    onAddSibling?: (nodeId: string) => void;
    onStartEditing?: (nodeId: string) => void;
    onStopEditing?: (nodeId: string) => void;
    onSelect?: (nodeId: string) => void;
  };
}

export const CustomNode = memo(({ id, data, selected }: CustomNodeProps) => {
  const [internalEditing, setInternalEditing] = useState(Boolean(data.isEditing));
  const [labelValue, setLabelValue] = useState(data.label || 'Node');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 230, height: 95 });

  const isCollapsed = Boolean(data.collapsed);
  const isHidden = Boolean(data.hidden);
  const isLocked = Boolean(data.locked);
  const isSketch = Boolean(data.sketchMode);
  const isRoot = Boolean(data.isRoot);
  const colorTheme = (data.colorTheme || 'slate') as NodeColorTheme;
  const shape = (data.shape || 'card') as NodeShape;
  const cardStyle = (data.cardStyle || 'default') as NodeCardStyle;
  const childCount = data.childCount || 0;
  const theme = COLOR_CLASSES[colorTheme] || COLOR_CLASSES.slate;

  const isEditing = Boolean(data.isEditing) || internalEditing;

  useEffect(() => {
    setLabelValue(data.label || '');
  }, [data.label]);

  useEffect(() => {
    if (data.isEditing !== undefined) {
      setInternalEditing(Boolean(data.isEditing));
    }
  }, [data.isEditing]);

  useEffect(() => {
    if (containerRef.current) {
      setDimensions({
        width: containerRef.current.offsetWidth || 230,
        height: containerRef.current.offsetHeight || 95,
      });
    }
  }, [data.label, data.tags, isCollapsed, isEditing, isLocked, shape, cardStyle]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();

      // Multi-stage RAF and timeout to guarantee focus is not stolen by React Flow canvas
      const raf = requestAnimationFrame(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      });

      const timer = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 30);

      return () => {
        cancelAnimationFrame(raf);
        clearTimeout(timer);
      };
    }
  }, [isEditing]);

  const handleFinishEditing = useCallback(
    (action?: 'none' | 'add-child' | 'add-sibling') => {
      setInternalEditing(false);
      data.onStopEditing?.(id);

      const trimmed = labelValue.trim() || 'Untitled Node';
      if (trimmed !== data.label) {
        data.onUpdateLabel?.(id, trimmed);
      }

      if (action === 'add-child') {
        data.onAddChild?.(id);
      } else if (action === 'add-sibling') {
        data.onAddSibling?.(id);
      }
    },
    [id, labelValue, data]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      handleFinishEditing('add-sibling');
    } else if (e.key === 'Tab') {
      e.preventDefault();
      e.stopPropagation();
      handleFinishEditing('add-child');
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setLabelValue(data.label || '');
      setInternalEditing(false);
      data.onStopEditing?.(id);
    }
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    data.onToggleCollapse?.(id);
  };

  const handleToggleLock = (e: React.MouseEvent) => {
    e.stopPropagation();
    data.onToggleLock?.(id);
  };

  const handleAddChild = (e: React.MouseEvent) => {
    e.stopPropagation();
    data.onAddChild?.(id);
  };

  const handleNodeClick = () => {
    data.onSelect?.(id);
  };

  const isDimmed = Boolean(data.isDimmed);
  const isSpotlightTarget = Boolean(data.isSpotlightTarget);
  const isLOD = Boolean(data.isLOD);
  const descendantCount = typeof data.descendantCount === 'number' ? data.descendantCount : childCount;

  if (isHidden) {
    return null;
  }

  // 0. High-Performance Level of Detail (LOD) Render (< 0.55x zoom)
  if (isLOD && !isEditing) {
    return (
      <div
        ref={containerRef}
        onClick={handleNodeClick}
        className={`min-w-[130px] max-w-[240px] px-3 py-2 rounded-xl ${theme.bg} ${theme.border} border-2 shadow-sm flex items-center justify-between gap-2 select-none transition-all duration-200 ${
          isDimmed ? 'opacity-15 grayscale pointer-events-none' : 'opacity-100'
        } ${
          selected
            ? 'ring-3 ring-blue-500 scale-105 z-20'
            : isSpotlightTarget
            ? 'ring-3 ring-indigo-500 shadow-md z-20'
            : ''
        }`}
      >
        <Handle type="target" position={Position.Left} id="target-left" className="!w-2 !h-2 opacity-0" />
        <Handle type="source" position={Position.Right} id="source-right" className="!w-2 !h-2 opacity-0" />
        <Handle type="target" position={Position.Top} id="target-top" className="!w-2 !h-2 opacity-0" />
        <Handle type="source" position={Position.Bottom} id="source-bottom" className="!w-2 !h-2 opacity-0" />

        <div className="flex items-center gap-1.5 min-w-0">
          <span className={`w-2 h-2 rounded-full ${theme.accent} shrink-0`} />
          <span className={`text-xs font-bold truncate ${theme.text}`}>
            {data.label || 'Untitled'}
          </span>
        </div>

        {isCollapsed && (descendantCount > 0 || childCount > 0) && (
          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-amber-500 text-white shrink-0">
            +{descendantCount || childCount}
          </span>
        )}
      </div>
    );
  }

  // 1. Shape Geometry Computation
  let shapeClass = 'rounded-2xl';
  let paddingClass = 'p-4';

  if (shape === 'pill' || (isRoot && shape !== 'sharp' && shape !== 'card' && shape !== 'banner')) {
    shapeClass = 'rounded-full';
    paddingClass = 'px-6 py-3.5';
  } else if (shape === 'sharp') {
    shapeClass = 'rounded-none';
    paddingClass = 'p-4';
  } else if (shape === 'cloud') {
    shapeClass = 'rounded-3xl';
    paddingClass = 'p-4.5';
  } else if (shape === 'banner') {
    shapeClass = 'rounded-2xl overflow-hidden';
    paddingClass = 'pt-0 px-4 pb-4';
  } else if (shape === 'diamond') {
    shapeClass = 'rounded-xl border-2';
    paddingClass = 'p-4';
  }

  // 2. Dramatically Distinct Card Styles
  let styleClass = `${theme.bg} ${theme.border} border shadow-md`;

  if (cardStyle === 'bold') {
    // 💥 Neo-Brutalist Bold: High contrast 3px outline with solid offset sticker shadow
    styleClass = `bg-white dark:bg-slate-900 border-2.5 border-slate-950 dark:border-white shadow-[5px_5px_0px_0px_#09090b] dark:shadow-[5px_5px_0px_0px_#ffffff] font-sans`;
  } else if (cardStyle === 'classy') {
    // 🧊 True Frosted Glassmorphism: Translucent acrylic, glossy reflection, luxury depth
    styleClass = `backdrop-blur-2xl bg-white/40 dark:bg-slate-900/40 border-2 border-white/80 dark:border-slate-600/40 shadow-[0_8px_32px_0_rgba(31,38,135,0.12)] dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.4)]`;
  } else if (cardStyle === 'minimal') {
    // 🪶 Minimalist Clean: No heavy box border! Clean floating surface with a bold left accent strip
    styleClass = `bg-white/95 dark:bg-slate-900/95 border-l-4 ${theme.accentBorder} border-t-0 border-r-0 border-b-0 shadow-sm hover:shadow-md`;
  } else if (cardStyle === 'gradient') {
    // ✨ Aesthetic Glow: Rich colorful gradient wash with vibrant neon ambient halo
    styleClass = `bg-gradient-to-br ${theme.gradientBg} border-2 border-indigo-400/40 dark:border-indigo-500/40 ${theme.glowShadow}`;
  } else if (cardStyle === 'notion') {
    // 📄 Notion Clean: Classic Notion document card with structured header divider
    styleClass = `bg-[#ffffff] dark:bg-[#202020] border border-[#e3e2e0] dark:border-[#37352f] shadow-2xs font-sans`;
  }

  return (
    <div
      ref={containerRef}
      onClick={handleNodeClick}
      className={`group relative min-w-[200px] max-w-[340px] transition-all duration-200 select-none ${
        isSketch
          ? 'p-3 font-sketch text-lg'
          : `${shapeClass} ${styleClass} ${paddingClass}`
      } ${
        isDimmed ? 'opacity-15 grayscale filter contrast-50 pointer-events-none' : 'opacity-100'
      } ${
        selected && !isSketch
          ? cardStyle === 'bold'
            ? 'ring-4 ring-blue-600 ring-offset-3 dark:ring-offset-slate-950 scale-[1.03] z-30'
            : 'ring-4 ring-blue-500/90 ring-offset-3 dark:ring-offset-slate-950 shadow-2xl scale-[1.03] z-30'
          : isSpotlightTarget && !isSketch
          ? 'ring-3 ring-indigo-500 shadow-[0_0_25px_rgba(99,102,241,0.4)] z-20'
          : 'hover:scale-[1.01]'
      } ${isLocked ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'}`}
      onDoubleClick={(e) => {
        e.stopPropagation();
        setInternalEditing(true);
        data.onStartEditing?.(id);
      }}
    >
      {/* Top Banner Accent for Banner Shape */}
      {shape === 'banner' && !isSketch && (
        <div className={`h-2.5 -mx-4 mb-3 ${theme.bannerBg}`} />
      )}

      {/* Frosted Glass Top Gloss Reflection Line */}
      {cardStyle === 'classy' && !isSketch && (
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent pointer-events-none" />
      )}

      {/* Notion Style Header Strip */}
      {cardStyle === 'notion' && !isSketch && (
        <div className="flex items-center gap-1.5 pb-1.5 mb-1.5 border-b border-[#f1f1ef] dark:border-[#2f2f2f] text-[10px] font-mono text-slate-500 dark:text-slate-400">
          <FileText className="w-3.5 h-3.5 opacity-60" />
          <span>Page Document</span>
        </div>
      )}

      {/* RoughJS Sketch Mode Overlay */}
      {isSketch && (
        <RoughNodeRenderer
          width={dimensions.width}
          height={dimensions.height}
          colorTheme={colorTheme}
          selected={selected}
          shape={shape}
          isRoot={isRoot}
        />
      )}

      {/* DUAL DIRECTIONAL HANDLES */}
      <Handle
        type="target"
        position={Position.Left}
        id="target-left"
        className="!w-2.5 !h-2.5 !bg-slate-400 dark:!bg-slate-500 !border-2 !border-white dark:!border-slate-800 transition-transform group-hover:scale-125 !-left-1.5"
      />
      <Handle
        type="source"
        position={Position.Left}
        id="source-left"
        className="!w-2.5 !h-2.5 !bg-slate-400 dark:!bg-slate-500 !border-2 !border-white dark:!border-slate-800 transition-transform group-hover:scale-125 !-left-1.5 opacity-0"
      />
      <Handle
        type="target"
        position={Position.Right}
        id="target-right"
        className="!w-2.5 !h-2.5 !bg-slate-400 dark:!bg-slate-500 !border-2 !border-white dark:!border-slate-800 transition-transform group-hover:scale-125 !-right-1.5 opacity-0"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="source-right"
        className="!w-2.5 !h-2.5 !bg-slate-400 dark:!bg-slate-500 !border-2 !border-white dark:!border-slate-800 transition-transform group-hover:scale-125 !-right-1.5"
      />
      <Handle
        type="target"
        position={Position.Top}
        id="target-top"
        className="!w-2.5 !h-2.5 !bg-slate-400 dark:!bg-slate-500 !border-2 !border-white dark:!border-slate-800 transition-transform group-hover:scale-125 !-top-1.5"
      />
      <Handle
        type="source"
        position={Position.Top}
        id="source-top"
        className="!w-2.5 !h-2.5 !bg-slate-400 dark:!bg-slate-500 !border-2 !border-white dark:!border-slate-800 transition-transform group-hover:scale-125 !-top-1.5 opacity-0"
      />
      <Handle
        type="target"
        position={Position.Bottom}
        id="target-bottom"
        className="!w-2.5 !h-2.5 !bg-slate-400 dark:!bg-slate-500 !border-2 !border-white dark:!border-slate-800 transition-transform group-hover:scale-125 !-bottom-1.5 opacity-0"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="source-bottom"
        className="!w-2.5 !h-2.5 !bg-slate-400 dark:!bg-slate-500 !border-2 !border-white dark:!border-slate-800 transition-transform group-hover:scale-125 !-bottom-1.5"
      />

      {/* Node Content Header & Label */}
      <div className="relative z-10 flex flex-col gap-1.5 pointer-events-auto">
        <div className="flex items-center justify-between gap-2">
          {/* Root or category indicator */}
          <div className="flex items-center gap-1.5">
            {isRoot ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-600 text-white shadow-xs">
                <Sparkles className="w-3 h-3" />
                Root
              </span>
            ) : (
              <span className={`w-2.5 h-2.5 rounded-full ${theme.accent}`} />
            )}

            {/* Lock status badge */}
            {isLocked && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-300">
                <Lock className="w-2.5 h-2.5" />
                Stuck
              </span>
            )}
          </div>

          {/* Action Buttons: Lock, Add Child (+), Subtree (+/-) */}
          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleToggleLock}
              title={isLocked ? 'Pinned in place (Click to unlock)' : 'Free to move (Click to stick/lock)'}
              className={`p-1 rounded transition-colors ${
                isLocked
                  ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200'
                  : 'hover:bg-slate-200/70 dark:hover:bg-slate-700/70 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={handleAddChild}
              title="Add child node (or press Tab)"
              className="p-1 rounded hover:bg-slate-200/70 dark:hover:bg-slate-700/70 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>

            {(descendantCount > 0 || childCount > 0) && (
              <button
                onClick={handleToggle}
                title={
                  isCollapsed
                    ? `Expand ${descendantCount > 0 ? descendantCount : childCount} sub-nodes`
                    : 'Collapse branch'
                }
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold transition-all ${
                  isCollapsed
                    ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-xs scale-105'
                    : 'bg-slate-200/80 dark:bg-slate-700/80 text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600'
                }`}
              >
                {isCollapsed ? (
                  <>
                    <Plus className="w-3 h-3" />
                    <span>+{descendantCount > 0 ? descendantCount : childCount}</span>
                  </>
                ) : (
                  <Minus className="w-3 h-3" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Hyper-Legible Editable Node Label */}
        {isEditing ? (
          <input
            ref={inputRef}
            autoFocus
            type="text"
            value={labelValue}
            onChange={(e) => setLabelValue(e.target.value)}
            onFocus={(e) => {
              e.target.select();
            }}
            onClick={(e) => e.stopPropagation()}
            onBlur={() => handleFinishEditing('none')}
            onKeyDown={handleKeyDown}
            className="w-full bg-white dark:bg-slate-900 border-2 border-blue-500 rounded-lg px-2.5 py-1 text-[15px] font-bold text-slate-950 dark:text-slate-50 outline-none shadow-sm"
          />
        ) : (
          <div
            className={`text-[15px] font-bold tracking-tight leading-snug cursor-text break-words ${theme.text} ${
              isSketch ? 'text-lg font-bold font-sketch' : ''
            } ${cardStyle === 'bold' ? 'font-extrabold text-[16px]' : ''}`}
            title="Double-click or press Space to edit"
          >
            {data.label || 'Untitled Node'}
          </div>
        )}

        {/* High-Contrast Sublabel / description */}
        {data.sublabel && (
          <p className="text-xs font-medium text-slate-600 dark:text-slate-300 leading-normal">
            {data.sublabel}
          </p>
        )}

        {/* Tags / Pills */}
        {data.tags && data.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {data.tags.map((tag, idx) => (
              <span
                key={idx}
                className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md font-semibold ${
                  cardStyle === 'bold'
                    ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950 font-bold'
                    : cardStyle === 'notion'
                    ? 'bg-[#f1f1ef] dark:bg-[#37352f] text-slate-800 dark:text-slate-200 border border-slate-200/50 dark:border-slate-700'
                    : `${theme.tagBg} ${theme.tagText}`
                }`}
              >
                <Tag className="w-2.5 h-2.5 opacity-60" />
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

CustomNode.displayName = 'CustomNode';
