import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  EdgeProps,
  getBezierPath,
  getSmoothStepPath,
  getStraightPath,
  EdgeLabelRenderer,
  BaseEdge,
} from '@xyflow/react';
import { Plus, Check, X, MessageSquare } from 'lucide-react';
import { MapMindEdge, EdgeRoutingStyle } from '@/types/graph';

export const CustomEdge: React.FC<EdgeProps<MapMindEdge>> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
  selected,
}) => {
  const [internalEditing, setInternalEditing] = useState(Boolean(data?.isEditing));
  const [labelText, setLabelText] = useState(data?.label || '');
  const inputRef = useRef<HTMLInputElement>(null);

  const routingStyle = (data?.routingStyle || 'curved') as EdgeRoutingStyle;
  const isEditing = Boolean(data?.isEditing) || internalEditing;

  useEffect(() => {
    setLabelText(data?.label || '');
  }, [data?.label]);

  useEffect(() => {
    if (data?.isEditing !== undefined) {
      setInternalEditing(Boolean(data.isEditing));
    }
  }, [data?.isEditing]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();

      const raf = requestAnimationFrame(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [isEditing]);

  // Compute SVG Path and center label coordinates based on dynamic routing style
  let edgePath = '';
  let labelX = 0;
  let labelY = 0;

  if (routingStyle === 'curved') {
    [edgePath, labelX, labelY] = getBezierPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
      curvature: 0.28,
    });
  } else if (routingStyle === 'straight') {
    [edgePath, labelX, labelY] = getStraightPath({
      sourceX,
      sourceY,
      targetX,
      targetY,
    });
  } else if (routingStyle === 'step') {
    [edgePath, labelX, labelY] = getSmoothStepPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
      borderRadius: 0,
    });
  } else {
    // Default / smoothstep
    [edgePath, labelX, labelY] = getSmoothStepPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
      borderRadius: 16,
    });
  }

  const handleFinishEditing = useCallback(() => {
    setInternalEditing(false);
    data?.onStopEditing?.(id);

    const trimmed = labelText.trim();
    if (trimmed !== data?.label) {
      data?.onUpdateLabel?.(id, trimmed);
    }
  }, [id, labelText, data]);

  const handleCancelEditing = useCallback(() => {
    setLabelText(data?.label || '');
    setInternalEditing(false);
    data?.onStopEditing?.(id);
  }, [id, data]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation(); // Never trigger global canvas shortcuts while typing edge label
    if (e.key === 'Enter') {
      e.preventDefault();
      handleFinishEditing();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelEditing();
    }
  };

  const handleStartEditing = (e: React.MouseEvent) => {
    e.stopPropagation();
    setInternalEditing(true);
    data?.onStartEditing?.(id);
  };

  const hasLabel = Boolean(data?.label && data.label.trim().length > 0);

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: selected ? '#3b82f6' : style.stroke,
          strokeWidth: selected ? 2.5 : style.strokeWidth || 1.8,
        }}
      />

      {/* Interactive Edge Label & Comment Renderer */}
      <EdgeLabelRenderer>
        <div
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
          }}
          className={`absolute pointer-events-auto group z-20 transition-all duration-150 ${
            isEditing ? 'scale-105' : 'hover:scale-105'
          }`}
          onClick={(e) => {
            e.stopPropagation();
            data?.onSelect?.(id);
          }}
          onDoubleClick={handleStartEditing}
        >
          {isEditing ? (
            /* Inline Edge Comment Editor */
            <div
              className="flex items-center gap-1 px-2 py-1 rounded-xl bg-white dark:bg-slate-900 border-2 border-blue-500 shadow-xl backdrop-blur-md animate-in zoom-in-95 duration-100"
              onClick={(e) => e.stopPropagation()}
            >
              <MessageSquare className="w-3 h-3 text-blue-500 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={labelText}
                onChange={(e) => setLabelText(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleFinishEditing}
                placeholder="Condition / label..."
                className="text-[11px] font-semibold text-slate-900 dark:text-slate-100 bg-transparent border-none outline-none min-w-[90px] max-w-[180px] p-0"
              />
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleFinishEditing();
                }}
                className="p-0.5 rounded text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                title="Save label (Enter)"
              >
                <Check className="w-3 h-3" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleCancelEditing();
                }}
                className="p-0.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                title="Cancel (Esc)"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : hasLabel ? (
            /* Displayed Label Chip */
            <div
              className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border shadow-xs transition-all select-none cursor-pointer ${
                selected
                  ? 'bg-blue-600 text-white border-blue-700 ring-2 ring-blue-300 dark:ring-blue-900'
                  : 'bg-white/95 dark:bg-slate-800/95 text-slate-800 dark:text-slate-200 border-slate-200/90 dark:border-slate-700/90 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 hover:shadow-md'
              }`}
              title="Double click or press F2 / Enter to edit connection label"
            >
              <span className="truncate max-w-[160px]">{data?.label}</span>
            </div>
          ) : (
            /* Subtle + Label pill on hover / selection */
            <button
              type="button"
              data-export-ignore="true"
              onClick={handleStartEditing}
              title="Add connection comment / condition (Press 'e' or click)"
              className={`opacity-0 group-hover:opacity-100 ${
                selected ? '!opacity-100 ring-2 ring-blue-400' : ''
              } flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/95 dark:bg-slate-850/95 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-400 shadow-sm transition-all cursor-pointer`}
            >
              <Plus className="w-2.5 h-2.5" />
              <span>Label</span>
            </button>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
};
