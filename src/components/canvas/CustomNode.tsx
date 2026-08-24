import React, { memo, useState, useCallback, useRef, useEffect } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Plus, Minus, Tag, Sparkles, Lock, Unlock, FileText } from 'lucide-react';
import { CustomNodeData, NodeColorTheme, NodeShape, NodeCardStyle } from '@/types/graph';

const RoughNodeRenderer = React.lazy(() =>
  import('./RoughNodeRenderer').then((m) => ({ default: m.RoughNodeRenderer }))
);

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

const THEME_COLORS: Record<
  NodeColorTheme,
  {
    fillLight: string;
    strokeLight: string;
    fillDark: string;
    strokeDark: string;
  }
> = {
  slate: { fillLight: '#ffffff', strokeLight: '#94a3b8', fillDark: '#1e293b', strokeDark: '#64748b' },
  blue: { fillLight: '#eff6ff', strokeLight: '#3b82f6', fillDark: '#0f172a', strokeDark: '#3b82f6' },
  emerald: { fillLight: '#ecfdf5', strokeLight: '#10b981', fillDark: '#064e3b', strokeDark: '#34d399' },
  amber: { fillLight: '#fffbeb', strokeLight: '#f59e0b', fillDark: '#451a03', strokeDark: '#fbbf24' },
  rose: { fillLight: '#fff1f2', strokeLight: '#f43f5e', fillDark: '#4c0519', strokeDark: '#fb7185' },
  purple: { fillLight: '#faf5ff', strokeLight: '#a855f7', fillDark: '#2e1065', strokeDark: '#c084fc' },
  cyan: { fillLight: '#ecfeff', strokeLight: '#06b6d4', fillDark: '#083344', strokeDark: '#22d3ee' },
};

const THEME_GRADIENTS: Record<
  NodeColorTheme,
  {
    fromLight: string;
    toLight: string;
    fromDark: string;
    toDark: string;
    glow: string;
    strokeLight: string;
    strokeDark: string;
  }
> = {
  slate: {
    fromLight: '#f8fafc',
    toLight: '#e2e8f0',
    fromDark: '#0f172a',
    toDark: '#1e293b',
    glow: 'rgba(100, 116, 139, 0.4)',
    strokeLight: '#94a3b8',
    strokeDark: '#64748b',
  },
  blue: {
    fromLight: '#eff6ff',
    toLight: '#dbeafe',
    fromDark: '#0f172a',
    toDark: '#1e3a8a',
    glow: 'rgba(59, 130, 246, 0.45)',
    strokeLight: '#60a5fa',
    strokeDark: '#3b82f6',
  },
  emerald: {
    fromLight: '#ecfdf5',
    toLight: '#d1fae5',
    fromDark: '#022c22',
    toDark: '#064e3b',
    glow: 'rgba(16, 185, 129, 0.45)',
    strokeLight: '#34d399',
    strokeDark: '#10b981',
  },
  amber: {
    fromLight: '#fffbeb',
    toLight: '#fef3c7',
    fromDark: '#291002',
    toDark: '#451a03',
    glow: 'rgba(245, 158, 11, 0.45)',
    strokeLight: '#fbbf24',
    strokeDark: '#f59e0b',
  },
  rose: {
    fromLight: '#fff1f2',
    toLight: '#ffe4e6',
    fromDark: '#2c0410',
    toDark: '#4c0519',
    glow: 'rgba(244, 63, 94, 0.45)',
    strokeLight: '#fb7185',
    strokeDark: '#f43f5e',
  },
  purple: {
    fromLight: '#faf5ff',
    toLight: '#f3e8ff',
    fromDark: '#1d073f',
    toDark: '#2e1065',
    glow: 'rgba(168, 85, 247, 0.45)',
    strokeLight: '#c084fc',
    strokeDark: '#a855f7',
  },
  cyan: {
    fromLight: '#ecfeff',
    toLight: '#cffafe',
    fromDark: '#04202c',
    toDark: '#083344',
    glow: 'rgba(6, 182, 212, 0.45)',
    strokeLight: '#22d3ee',
    strokeDark: '#06b6d4',
  },
};

function getSvgStyleForCard(
  cardStyle: NodeCardStyle,
  colorTheme: NodeColorTheme,
  isDark: boolean,
  selected: boolean,
  id: string
) {
  const theme = THEME_COLORS[colorTheme] || THEME_COLORS.slate;
  const gradient = THEME_GRADIENTS[colorTheme] || THEME_GRADIENTS.slate;

  let fill = isDark ? theme.fillDark : theme.fillLight;
  let stroke = selected ? '#3b82f6' : isDark ? theme.strokeDark : theme.strokeLight;
  let strokeWidth = selected ? 3 : 2;
  let filter = selected
    ? 'drop-shadow(0 0 10px rgba(59, 130, 246, 0.8))'
    : 'drop-shadow(0 2px 6px rgba(0, 0, 0, 0.08))';

  if (cardStyle === 'bold') {
    fill = isDark ? '#0f172a' : '#ffffff';
    stroke = selected ? '#3b82f6' : isDark ? '#ffffff' : '#09090b';
    strokeWidth = selected ? 3.5 : 2.5;
    filter = selected
      ? 'drop-shadow(0 0 10px rgba(59, 130, 246, 0.8))'
      : isDark
      ? 'drop-shadow(4px 4px 0px #ffffff)'
      : 'drop-shadow(4px 4px 0px #09090b)';
  } else if (cardStyle === 'classy') {
    fill = isDark ? 'rgba(15, 23, 42, 0.55)' : 'rgba(255, 255, 255, 0.55)';
    stroke = selected ? '#3b82f6' : isDark ? 'rgba(148, 163, 184, 0.5)' : 'rgba(255, 255, 255, 0.9)';
    strokeWidth = selected ? 3 : 1.75;
    filter = selected
      ? 'drop-shadow(0 0 12px rgba(59, 130, 246, 0.8))'
      : isDark
      ? 'drop-shadow(0 8px 32px rgba(0, 0, 0, 0.4))'
      : 'drop-shadow(0 8px 32px rgba(31, 38, 135, 0.12))';
  } else if (cardStyle === 'gradient') {
    fill = `url(#node-grad-${id})`;
    stroke = selected ? '#3b82f6' : isDark ? gradient.strokeDark : gradient.strokeLight;
    strokeWidth = selected ? 3 : 2;
    filter = selected
      ? 'drop-shadow(0 0 14px rgba(59, 130, 246, 0.9))'
      : `drop-shadow(0 0 16px ${gradient.glow})`;
  } else if (cardStyle === 'minimal') {
    fill = isDark ? '#0f172a' : '#ffffff';
    stroke = selected ? '#3b82f6' : isDark ? theme.strokeDark : theme.strokeLight;
    strokeWidth = selected ? 3 : 1.5;
    filter = selected
      ? 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.8))'
      : 'drop-shadow(0 1px 3px rgba(0, 0, 0, 0.05))';
  } else if (cardStyle === 'notion') {
    fill = isDark ? '#202020' : '#ffffff';
    stroke = selected ? '#3b82f6' : isDark ? '#37352f' : '#e3e2e0';
    strokeWidth = selected ? 3 : 1.5;
    filter = selected
      ? 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.8))'
      : 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.04))';
  }

  return { fill, stroke, strokeWidth, filter, gradient };
}

function getCloudSvgPath(w: number, h: number): string {
  const pad = 6;
  const width = Math.max(w - pad * 2, 80);
  const height = Math.max(h - pad * 2, 50);
  const x = pad;
  const y = pad;

  const x0 = x;
  const x1 = x + width * 0.25;
  const x2 = x + width * 0.5;
  const x3 = x + width * 0.75;
  const x4 = x + width;

  const y0 = y;
  const y1 = y + height * 0.5;
  const y2 = y + height;

  return `
    M ${x1},${y0 + 2}
    C ${x1 - 15},${y0 - 12} ${x0 + 10},${y0 - 8} ${x0 + 12},${y0 + 14}
    C ${x0 - 14},${y0 + 16} ${x0 - 14},${y1 + 4} ${x0 + 10},${y1 + 10}
    C ${x0 - 12},${y1 + 16} ${x0 - 6},${y2 + 8} ${x1 - 6},${y2 - 2}
    C ${x1},${y2 + 14} ${x2 - 10},${y2 + 14} ${x2},${y2 - 2}
    C ${x2 + 10},${y2 + 14} ${x3},${y2 + 14} ${x3 + 6},${y2 - 2}
    C ${x4 - 4},${y2 + 10} ${x4 + 14},${y2 + 2} ${x4 - 6},${y1 + 12}
    C ${x4 + 14},${y1 + 4} ${x4 + 14},${y0 + 16} ${x4 - 10},${y0 + 12}
    C ${x4 - 8},${y0 - 10} ${x3 + 12},${y0 - 12} ${x3},${y0 + 2}
    C ${x3 - 10},${y0 - 14} ${x2 + 10},${y0 - 14} ${x2},${y0 + 2}
    C ${x2 - 10},${y0 - 14} ${x1 + 10},${y0 - 14} ${x1},${y0 + 2}
    Z
  `.replace(/\s+/g, ' ').trim();
}

export interface CustomNodeProps extends NodeProps {
  data: CustomNodeData & {
    sketchMode?: boolean;
    onToggleCollapse?: (nodeId: string) => void;
    onToggleLock?: (nodeId: string) => void;
    onUpdateLabel?: (nodeId: string, label: string) => void;
    onCommitLabel?: (nodeId: string, label: string, action?: 'none' | 'add-child' | 'add-sibling') => void;
    onAddChild?: (nodeId: string, labelToCommit?: string) => void;
    onAddSibling?: (nodeId: string, labelToCommit?: string) => void;
    onStartEditing?: (nodeId: string) => void;
    onStopEditing?: (nodeId: string) => void;
    onSelect?: (nodeId: string) => void;
    onExpandWithAi?: (nodeId: string) => void;
  };
}

const CustomNodeComponent = ({ id, data, selected }: CustomNodeProps) => {
  const [internalEditing, setInternalEditing] = useState(Boolean(data.isEditing));
  const [labelValue, setLabelValue] = useState(data.label || data.title || '');
  const labelValueRef = useRef(data.label || data.title || '');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dataRef = useRef(data);
  dataRef.current = data;
  const isCommittingRef = useRef(false);
  const [dimensions, setDimensions] = useState({ width: 190, height: 75 });

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
  const prevIsEditingRef = useRef(isEditing);
  const isCustomSvgShape = (shape === 'diamond' || shape === 'cloud') && !isSketch;

  // Track dark theme reactively
  const [isDark, setIsDark] = useState(() =>
    typeof document !== 'undefined' ? document.documentElement.classList.contains('dark') : false
  );

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (data.isEditing !== undefined) {
      setInternalEditing(Boolean(data.isEditing));
    }
  }, [data.isEditing]);

  // Synchronize local input state only when not actively editing or when entering editing mode
  useEffect(() => {
    if (!isEditing || (!prevIsEditingRef.current && isEditing)) {
      const initial = data.label || data.title || '';
      setLabelValue(initial);
      labelValueRef.current = initial;
    }
    prevIsEditingRef.current = isEditing;
  }, [data.label, data.title, isEditing]);

  useEffect(() => {
    if (containerRef.current) {
      const el = containerRef.current;
      setDimensions({
        width: Math.max(el.offsetWidth, shape === 'diamond' ? 195 : shape === 'cloud' ? 190 : 175),
        height: Math.max(el.offsetHeight, shape === 'diamond' ? 90 : shape === 'cloud' ? 80 : 65),
      });
    }
  }, [data.label, data.title, data.sublabel, data.tags, isCollapsed, isEditing, isLocked, shape, cardStyle]);

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
    (action: 'none' | 'add-child' | 'add-sibling' = 'none') => {
      if (isCommittingRef.current) return;
      isCommittingRef.current = true;

      setInternalEditing(false);

      const currentData = dataRef.current;
      const currentVal = inputRef.current ? inputRef.current.value : (labelValueRef.current ?? labelValue);
      const trimmed = currentVal.trim() || currentData.label || currentData.title || 'Untitled Node';

      if (currentData.onCommitLabel) {
        currentData.onCommitLabel(id, trimmed, action);
      } else {
        currentData.onStopEditing?.(id);
        if (trimmed !== currentData.label) {
          currentData.onUpdateLabel?.(id, trimmed);
        }
        if (action === 'add-child') {
          currentData.onAddChild?.(id, trimmed);
        } else if (action === 'add-sibling') {
          currentData.onAddSibling?.(id, trimmed);
        }
      }

      setTimeout(() => {
        isCommittingRef.current = false;
      }, 60);
    },
    [id, labelValue]
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
      setLabelValue(dataRef.current.label || dataRef.current.title || '');
      setInternalEditing(false);
      dataRef.current.onStopEditing?.(id);
    }
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isEditing) {
      handleFinishEditing('none');
    }
    dataRef.current.onToggleCollapse?.(id);
  };

  const handleToggleLock = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isEditing) {
      handleFinishEditing('none');
    }
    dataRef.current.onToggleLock?.(id);
  };

  const handleAddChild = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isEditing) {
      handleFinishEditing('add-child');
    } else {
      dataRef.current.onAddChild?.(id);
    }
  };

  const handleNodeClick = () => {
    dataRef.current.onSelect?.(id);
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
        tabIndex={0}
        onClick={handleNodeClick}
        onKeyDown={(e) => {
          const isSpace =
            e.key === ' ' ||
            e.key === 'Spacebar' ||
            e.key === 'Space' ||
            e.code === 'Space' ||
            e.keyCode === 32;
          const isF2 = e.key === 'F2' || e.code === 'F2' || e.keyCode === 113;
          if (isSpace || isF2) {
            e.preventDefault();
            e.stopPropagation();
            setInternalEditing(true);
            dataRef.current.onStartEditing?.(id);
          }
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          setInternalEditing(true);
          dataRef.current.onStartEditing?.(id);
        }}
        className={`min-w-[130px] max-w-[240px] px-3 py-2 rounded-xl outline-none ${theme.bg} ${theme.border} border-2 shadow-sm flex items-center justify-between gap-2 select-none transition-all duration-200 cursor-pointer ${
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
        <Handle type="source" position={Position.Left} id="source-left" className="!w-2 !h-2 opacity-0" />
        <Handle type="target" position={Position.Right} id="target-right" className="!w-2 !h-2 opacity-0" />
        <Handle type="source" position={Position.Right} id="source-right" className="!w-2 !h-2 opacity-0" />
        <Handle type="target" position={Position.Top} id="target-top" className="!w-2 !h-2 opacity-0" />
        <Handle type="source" position={Position.Top} id="source-top" className="!w-2 !h-2 opacity-0" />
        <Handle type="target" position={Position.Bottom} id="target-bottom" className="!w-2 !h-2 opacity-0" />
        <Handle type="source" position={Position.Bottom} id="source-bottom" className="!w-2 !h-2 opacity-0" />

        <div className="flex items-center gap-1.5 min-w-0">
          <span className={`w-2 h-2 rounded-full ${theme.accent} shrink-0`} />
          <span className={`text-xs font-bold truncate ${theme.text}`}>
            {data.label || data.title || 'Untitled'}
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
  let shapeClass = 'rounded-xl';
  let paddingClass = 'p-2.5';

  if (shape === 'pill' || (isRoot && shape !== 'sharp' && shape !== 'card' && shape !== 'banner' && shape !== 'cloud' && shape !== 'diamond')) {
    shapeClass = 'rounded-full';
    paddingClass = 'px-3.5 py-1.5';
  } else if (shape === 'sharp') {
    shapeClass = 'rounded-none border-2';
    paddingClass = 'p-2.5';
  } else if (shape === 'cloud') {
    // ☁️ Authentic Thought Cloud
    shapeClass = 'border-0 bg-transparent shadow-none';
    paddingClass = 'px-6 py-3.5 text-center';
  } else if (shape === 'banner') {
    shapeClass = 'rounded-xl overflow-hidden border';
    paddingClass = 'pt-0 px-2.5 pb-2';
  } else if (shape === 'diamond') {
    // 💎 Authentic 4-Point Rhombus Diamond
    shapeClass = 'border-0 bg-transparent shadow-none';
    paddingClass = 'px-7 py-4.5 text-center';
  }

  // 2. Dramatically Distinct Card Styles
  const svgStyle = getSvgStyleForCard(cardStyle, colorTheme, isDark, selected, id);
  let styleClass = `${theme.bg} ${theme.border} border shadow-xs`;

  if (isCustomSvgShape) {
    styleClass = cardStyle === 'classy' ? 'bg-transparent border-0 shadow-none backdrop-blur-xl' : 'bg-transparent border-0 shadow-none';
  } else if (cardStyle === 'bold') {
    // 💥 Neo-Brutalist Bold: High contrast 2.5px outline with compact 3px offset sticker shadow
    styleClass = `bg-white dark:bg-slate-900 border-2 border-slate-950 dark:border-white shadow-[3px_3px_0px_0px_#09090b] dark:shadow-[3px_3px_0px_0px_#ffffff] font-sans`;
  } else if (cardStyle === 'classy') {
    // 🧊 True Frosted Glassmorphism: Translucent acrylic, glossy reflection, luxury depth
    styleClass = `backdrop-blur-2xl bg-white/40 dark:bg-slate-900/40 border border-white/80 dark:border-slate-600/40 shadow-[0_4px_20px_0_rgba(31,38,135,0.1)] dark:shadow-[0_4px_20px_0_rgba(0,0,0,0.35)]`;
  } else if (cardStyle === 'minimal') {
    // 🪶 Minimalist Clean: No heavy box border! Clean floating surface with a bold left accent strip
    styleClass = `bg-white/95 dark:bg-slate-900/95 border-l-3 ${theme.accentBorder} border-t-0 border-r-0 border-b-0 shadow-xs hover:shadow-sm`;
  } else if (cardStyle === 'gradient') {
    // ✨ Aesthetic Glow: Rich colorful gradient wash with vibrant neon ambient halo
    styleClass = `bg-gradient-to-br ${theme.gradientBg} border border-indigo-400/40 dark:border-indigo-500/40 ${theme.glowShadow}`;
  } else if (cardStyle === 'notion') {
    // 📄 Notion Clean: Classic Notion document card with structured header divider
    styleClass = `bg-[#ffffff] dark:bg-[#202020] border border-[#e3e2e0] dark:border-[#37352f] shadow-2xs font-sans`;
  }

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onClick={handleNodeClick}
      className={`group relative ${
        shape === 'diamond'
          ? 'w-[195px] min-h-[90px]'
          : shape === 'cloud'
          ? 'w-[190px] min-h-[80px]'
          : 'w-[185px] max-w-[210px]'
      } transition-all duration-200 select-none outline-none ${
        isCustomSvgShape ? 'overflow-visible' : 'overflow-hidden'
      } ${
        isSketch
          ? 'p-2 font-sketch text-sm'
          : `${shapeClass} ${styleClass} ${paddingClass}`
      } ${
        isDimmed ? 'opacity-15 grayscale filter contrast-50 pointer-events-none' : 'opacity-100'
      } ${
        selected && !isSketch && !isCustomSvgShape
          ? cardStyle === 'bold'
            ? 'ring-3 ring-blue-600 ring-offset-2 dark:ring-offset-slate-950 scale-[1.02] z-30'
            : 'ring-3 ring-blue-500/90 ring-offset-2 dark:ring-offset-slate-950 shadow-xl scale-[1.02] z-30'
          : selected && !isSketch && isCustomSvgShape
          ? 'scale-[1.02] z-30'
          : isSpotlightTarget && !isSketch
          ? 'ring-2 ring-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.35)] z-20'
          : 'hover:scale-[1.01]'
      } ${isLocked ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'}`}
      onKeyDown={(e) => {
        if (!isEditing) {
          const isSpace =
            e.key === ' ' ||
            e.key === 'Spacebar' ||
            e.key === 'Space' ||
            e.code === 'Space' ||
            e.keyCode === 32;
          const isF2 = e.key === 'F2' || e.code === 'F2' || e.keyCode === 113;
          if (isSpace || isF2) {
            e.preventDefault();
            e.stopPropagation();
            setInternalEditing(true);
            dataRef.current.onStartEditing?.(id);
          }
        }
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        setInternalEditing(true);
        dataRef.current.onStartEditing?.(id);
      }}
    >
      {/* 💎 Authentic 4-Point Diamond (Rhombus) Background */}
      {shape === 'diamond' && !isSketch && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-0"
          style={{ filter: svgStyle.filter }}
        >
          {cardStyle === 'gradient' && (
            <defs>
              <linearGradient id={`node-grad-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={isDark ? svgStyle.gradient.fromDark : svgStyle.gradient.fromLight} />
                <stop offset="100%" stopColor={isDark ? svgStyle.gradient.toDark : svgStyle.gradient.toLight} />
              </linearGradient>
            </defs>
          )}
          <polygon
            points={`${dimensions.width / 2},3 ${dimensions.width - 3},${dimensions.height / 2} ${dimensions.width / 2},${dimensions.height - 3} 3,${dimensions.height / 2}`}
            fill={svgStyle.fill}
            stroke={svgStyle.stroke}
            strokeWidth={svgStyle.strokeWidth}
            strokeLinejoin="round"
          />
        </svg>
      )}

      {/* ☁️ Authentic Scalloped Thought Cloud Background */}
      {shape === 'cloud' && !isSketch && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-0"
          style={{ filter: svgStyle.filter }}
        >
          {cardStyle === 'gradient' && (
            <defs>
              <linearGradient id={`node-grad-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={isDark ? svgStyle.gradient.fromDark : svgStyle.gradient.fromLight} />
                <stop offset="100%" stopColor={isDark ? svgStyle.gradient.toDark : svgStyle.gradient.toLight} />
              </linearGradient>
            </defs>
          )}
          <path
            d={getCloudSvgPath(dimensions.width, dimensions.height)}
            fill={svgStyle.fill}
            stroke={svgStyle.stroke}
            strokeWidth={svgStyle.strokeWidth}
            strokeLinejoin="round"
          />
        </svg>
      )}

      {/* Top Banner Accent for Banner Shape */}
      {shape === 'banner' && !isSketch && (
        <div className={`h-2 -mx-3 mb-2 ${theme.bannerBg}`} />
      )}

      {/* Frosted Glass Top Gloss Reflection Line */}
      {cardStyle === 'classy' && !isSketch && !isCustomSvgShape && (
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent pointer-events-none" />
      )}

      {/* Notion Style Header Strip */}
      {cardStyle === 'notion' && !isSketch && (
        <div className={`flex items-center gap-1 pb-1 mb-1 border-b border-[#f1f1ef] dark:border-[#2f2f2f] text-[9px] font-mono text-slate-500 dark:text-slate-400 ${isCustomSvgShape ? 'justify-center w-full' : ''}`}>
          <FileText className="w-3 h-3 opacity-60" />
          <span>Page</span>
        </div>
      )}

      {/* RoughJS Sketch Mode Overlay (Lazy Loaded) */}
      {isSketch && (
        <React.Suspense fallback={null}>
          <RoughNodeRenderer
            width={dimensions.width}
            height={dimensions.height}
            colorTheme={colorTheme}
            selected={selected}
            shape={shape}
            isRoot={isRoot}
          />
        </React.Suspense>
      )}

      {/* DUAL DIRECTIONAL HANDLES */}
      <Handle
        type="target"
        position={Position.Left}
        id="target-left"
        className="!w-2 !h-2 !bg-slate-400 dark:!bg-slate-500 !border-[1.5px] !border-white dark:!border-slate-800 transition-transform group-hover:scale-125 !-left-1"
      />
      <Handle
        type="source"
        position={Position.Left}
        id="source-left"
        className="!w-2 !h-2 !bg-slate-400 dark:!bg-slate-500 !border-[1.5px] !border-white dark:!border-slate-800 transition-transform group-hover:scale-125 !-left-1 opacity-0"
      />
      <Handle
        type="target"
        position={Position.Right}
        id="target-right"
        className="!w-2 !h-2 !bg-slate-400 dark:!bg-slate-500 !border-[1.5px] !border-white dark:!border-slate-800 transition-transform group-hover:scale-125 !-right-1 opacity-0"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="source-right"
        className="!w-2 !h-2 !bg-slate-400 dark:!bg-slate-500 !border-[1.5px] !border-white dark:!border-slate-800 transition-transform group-hover:scale-125 !-right-1"
      />
      <Handle
        type="target"
        position={Position.Top}
        id="target-top"
        className="!w-2 !h-2 !bg-slate-400 dark:!bg-slate-500 !border-[1.5px] !border-white dark:!border-slate-800 transition-transform group-hover:scale-125 !-top-1"
      />
      <Handle
        type="source"
        position={Position.Top}
        id="source-top"
        className="!w-2 !h-2 !bg-slate-400 dark:!bg-slate-500 !border-[1.5px] !border-white dark:!border-slate-800 transition-transform group-hover:scale-125 !-top-1 opacity-0"
      />
      <Handle
        type="target"
        position={Position.Bottom}
        id="target-bottom"
        className="!w-2 !h-2 !bg-slate-400 dark:!bg-slate-500 !border-[1.5px] !border-white dark:!border-slate-800 transition-transform group-hover:scale-125 !-bottom-1 opacity-0"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="source-bottom"
        className="!w-2 !h-2 !bg-slate-400 dark:!bg-slate-500 !border-[1.5px] !border-white dark:!border-slate-800 transition-transform group-hover:scale-125 !-bottom-1"
      />

      {/* Node Content Header & Label */}
      <div className={`relative z-10 flex flex-col gap-1 pointer-events-auto ${shape === 'diamond' || shape === 'cloud' ? 'items-center text-center' : ''}`}>
        <div className={`flex items-center gap-1.5 ${shape === 'diamond' || shape === 'cloud' ? 'justify-center w-full' : 'justify-between'}`}>
          {/* Root or category indicator */}
          <div className="flex items-center gap-1">
            {isRoot ? (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.2 rounded-full bg-blue-600 text-white shadow-2xs">
                <Sparkles className="w-2.5 h-2.5" />
                Root
              </span>
            ) : (
              <span className={`w-2 h-2 rounded-full ${theme.accent}`} />
            )}

            {/* Lock status badge */}
            {isLocked && (
              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1 py-0.2 rounded bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-300">
                <Lock className="w-2 h-2" />
                Stuck
              </span>
            )}
          </div>

          {/* Action Buttons: Lock, Add Child (+), Subtree (+/-) */}
          <div className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleToggleLock}
              title={isLocked ? 'Pinned in place (Click to unlock)' : 'Free to move (Click to stick/lock)'}
              className={`p-0.5 rounded transition-colors ${
                isLocked
                  ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200'
                  : 'hover:bg-slate-200/70 dark:hover:bg-slate-700/70 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
            </button>

            <button
              onClick={handleAddChild}
              title="Add child node (or press Tab)"
              className="p-0.5 rounded hover:bg-slate-200/70 dark:hover:bg-slate-700/70 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors"
            >
              <Plus className="w-3 h-3" />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                data.onExpandWithAi?.(id);
              }}
              title="Expand with AI (Context-Aware)"
              className="p-0.5 rounded hover:bg-purple-100 dark:hover:bg-purple-950/70 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
            >
              <Sparkles className="w-3 h-3" />
            </button>

            {(descendantCount > 0 || childCount > 0) && (
              <button
                onClick={handleToggle}
                title={
                  isCollapsed
                    ? `Expand ${descendantCount > 0 ? descendantCount : childCount} sub-nodes`
                    : 'Collapse branch'
                }
                className={`flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold transition-all ${
                  isCollapsed
                    ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-2xs scale-105'
                    : 'bg-slate-200/80 dark:bg-slate-700/80 text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600'
                }`}
              >
                {isCollapsed ? (
                  <>
                    <Plus className="w-2.5 h-2.5" />
                    <span>+{descendantCount > 0 ? descendantCount : childCount}</span>
                  </>
                ) : (
                  <Minus className="w-2.5 h-2.5" />
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
            onChange={(e) => {
              const val = e.target.value;
              setLabelValue(val);
              labelValueRef.current = val;
              dataRef.current.onUpdateLabel?.(id, val);
            }}
            onFocus={(e) => {
              e.target.select();
            }}
            onClick={(e) => e.stopPropagation()}
            onBlur={() => handleFinishEditing('none')}
            onKeyDown={handleKeyDown}
            className="w-full bg-white dark:bg-slate-900 border-2 border-blue-500 rounded-md px-2 py-0.5 text-[13.5px] font-bold text-slate-950 dark:text-slate-50 outline-none shadow-xs text-center"
          />
        ) : (
          <div
            className={`text-[13.5px] font-bold tracking-tight leading-snug cursor-text break-words ${theme.text} ${
              isSketch ? 'text-base font-bold font-sketch' : ''
            } ${cardStyle === 'bold' ? 'font-extrabold text-[14px]' : ''} ${shape === 'diamond' || shape === 'cloud' ? 'text-center' : ''}`}
            title="Double-click or press Space / F2 to edit"
            onClick={(e) => {
              e.stopPropagation();
              handleNodeClick();
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              setInternalEditing(true);
              dataRef.current.onStartEditing?.(id);
            }}
          >
            {data.label || data.title || 'Untitled Node'}
          </div>
        )}

        {/* High-Contrast Sublabel / description */}
        {data.sublabel && (
          <p className={`text-[11px] font-medium text-slate-500 dark:text-slate-400 leading-snug ${shape === 'diamond' || shape === 'cloud' ? 'text-center' : ''}`}>
            {data.sublabel}
          </p>
        )}

        {/* Tags / Pills */}
        {data.tags && data.tags.length > 0 && (
          <div className={`flex flex-wrap gap-1 mt-1 max-w-full overflow-hidden ${shape === 'diamond' || shape === 'cloud' ? 'justify-center' : ''}`}>
            {data.tags.slice(0, 4).map((tag, idx) => (
              <span
                key={idx}
                title={tag}
                className={`inline-flex items-center gap-0.5 text-[9.5px] px-1.5 py-0.2 rounded font-semibold max-w-[85px] truncate shrink-0 ${
                  cardStyle === 'bold'
                    ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950 font-bold'
                    : cardStyle === 'notion'
                    ? 'bg-[#f1f1ef] dark:bg-[#37352f] text-slate-800 dark:text-slate-200 border border-slate-200/50 dark:border-slate-700'
                    : `${theme.tagBg} ${theme.tagText}`
                }`}
              >
                <Tag className="w-2 h-2 opacity-60 shrink-0" />
                <span className="truncate">{tag}</span>
              </span>
            ))}
            {data.tags.length > 4 && (
              <span
                title={data.tags.slice(4).join(', ')}
                className="inline-flex items-center text-[9.5px] px-1 py-0.2 rounded font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 shrink-0"
              >
                +{data.tags.length - 4}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

function areNodesEqual(prev: CustomNodeProps, next: CustomNodeProps): boolean {
  if (prev.id !== next.id) return false;
  if (prev.selected !== next.selected) return false;

  const p = prev.data;
  const n = next.data;
  if (p === n) return true;
  if (!p || !n) return false;

  if (
    p.label !== n.label ||
    p.title !== n.title ||
    p.sublabel !== n.sublabel ||
    p.colorTheme !== n.colorTheme ||
    p.shape !== n.shape ||
    p.cardStyle !== n.cardStyle ||
    p.collapsed !== n.collapsed ||
    p.hidden !== n.hidden ||
    p.locked !== n.locked ||
    p.isEditing !== n.isEditing ||
    p.isDimmed !== n.isDimmed ||
    p.isSpotlightTarget !== n.isSpotlightTarget ||
    p.isLOD !== n.isLOD ||
    p.sketchMode !== n.sketchMode ||
    p.descendantCount !== n.descendantCount ||
    p.childCount !== n.childCount
  ) {
    return false;
  }

  // Shallow compare tags array
  if (p.tags !== n.tags) {
    if (!p.tags || !n.tags) return false;
    if (p.tags.length !== n.tags.length) return false;
    for (let i = 0; i < p.tags.length; i++) {
      if (p.tags[i] !== n.tags[i]) return false;
    }
  }

  return true;
}

export const CustomNode = memo(CustomNodeComponent, areNodesEqual);
CustomNode.displayName = 'CustomNode';
