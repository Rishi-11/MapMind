import React, { useState } from 'react';
import {
  Sparkles,
  Network,
  GitFork,
  Split,
  ChevronUp,
  Palette,
  Spline,
  CornerDownRight,
  Minus,
  Wand2,
  GitBranch,
  CornerDownLeft,
  Edit3,
  Trash2,
  Layers,
} from 'lucide-react';
import { LayoutDirection, EdgeRoutingStyle, LayoutDensity } from '@/types/graph';

interface FloatingActionDockProps {
  onAddNode: () => void;
  onAddChild?: () => void;
  onAddSibling?: () => void;
  onStartEditing?: () => void;
  onDeleteNode?: () => void;
  onOpenAiImport: () => void;
  onOpenPresentation?: () => void;
  isSpotlightActive?: boolean;
  onToggleSpotlight?: () => void;
  sketchMode: boolean;
  onToggleSketchMode: () => void;
  onApplyLayout: (layout: LayoutDirection) => void;
  isLayouting: boolean;
  onOpenCanvasTheme: () => void;
  onOpenShortcuts?: () => void;
  edgeRoutingStyle: EdgeRoutingStyle;
  onChangeEdgeRoutingStyle: (style: EdgeRoutingStyle) => void;
  collisionAvoidance: boolean;
  onToggleCollisionAvoidance: () => void;
  layoutDensity: LayoutDensity;
  onChangeLayoutDensity: (density: LayoutDensity) => void;
  selectedNodeId?: string | null;
  onOpenNodeExpansion?: (nodeId: string) => void;
}

export const FloatingActionDock: React.FC<FloatingActionDockProps> = ({
  onAddNode,
  onAddChild,
  onAddSibling,
  onStartEditing,
  onDeleteNode,
  onOpenAiImport,
  sketchMode,
  onToggleSketchMode,
  onApplyLayout,
  isLayouting,
  onOpenCanvasTheme,
  edgeRoutingStyle,
  onChangeEdgeRoutingStyle,
  collisionAvoidance,
  onToggleCollisionAvoidance,
  layoutDensity,
  onChangeLayoutDensity,
  selectedNodeId,
  onOpenNodeExpansion,
}) => {
  const [isLayoutMenuOpen, setIsLayoutMenuOpen] = useState(false);
  const [isRoutingMenuOpen, setIsRoutingMenuOpen] = useState(false);

  const ROUTING_ICONS: Record<EdgeRoutingStyle, React.ComponentType<{ className?: string }>> = {
    curved: Spline,
    smoothstep: CornerDownRight,
    straight: Minus,
    step: CornerDownRight,
  };

  const CurrentRoutingIcon = ROUTING_ICONS[edgeRoutingStyle] || Spline;

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 pointer-events-auto flex flex-col items-center gap-1.5 animate-in fade-in slide-in-from-bottom-2 duration-200">
      {/* Edge Routing Style Flyout Menu */}
      {isRoutingMenuOpen && (
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-800 shadow-xl rounded-xl p-1 flex items-center gap-0.5 animate-in fade-in zoom-in-95 duration-150">
          <button
            onClick={() => {
              onChangeEdgeRoutingStyle('curved');
              setIsRoutingMenuOpen(false);
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
              edgeRoutingStyle === 'curved'
                ? 'bg-blue-600 text-white'
                : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Spline className="w-3 h-3" />
            <span>Curved</span>
          </button>
          <button
            onClick={() => {
              onChangeEdgeRoutingStyle('smoothstep');
              setIsRoutingMenuOpen(false);
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
              edgeRoutingStyle === 'smoothstep'
                ? 'bg-blue-600 text-white'
                : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <CornerDownRight className="w-3 h-3" />
            <span>Smooth</span>
          </button>
          <button
            onClick={() => {
              onChangeEdgeRoutingStyle('straight');
              setIsRoutingMenuOpen(false);
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
              edgeRoutingStyle === 'straight'
                ? 'bg-blue-600 text-white'
                : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Minus className="w-3 h-3" />
            <span>Straight</span>
          </button>
        </div>
      )}

      {/* Layout Engine Structure & Density Popup Menu */}
      {isLayoutMenuOpen && (
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl p-2.5 flex flex-col gap-2 w-64 animate-in fade-in zoom-in-95 duration-150">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1 px-1">
              Mind Map Structure
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  onApplyLayout('BALANCED_MINDMAP');
                  setIsLayoutMenuOpen(false);
                }}
                disabled={isLayouting}
                className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-950/60 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                <Network className="w-3 h-3 text-blue-500" />
                <span>Radial</span>
              </button>
              <button
                onClick={() => {
                  onApplyLayout('TB');
                  setIsLayoutMenuOpen(false);
                }}
                disabled={isLayouting}
                className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
              >
                <GitFork className="w-3 h-3 text-emerald-500 rotate-180" />
                <span>Top-Down</span>
              </button>
              <button
                onClick={() => {
                  onApplyLayout('LR');
                  setIsLayoutMenuOpen(false);
                }}
                disabled={isLayouting}
                className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-purple-50 dark:hover:bg-purple-950/60 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
              >
                <Split className="w-3 h-3 text-purple-500 rotate-90" />
                <span>Left-Right</span>
              </button>
            </div>
          </div>

          <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1 px-1 flex items-center justify-between">
              <span>Density</span>
              <span className="text-blue-500 font-bold capitalize text-[10px]">{layoutDensity}</span>
            </div>
            <div className="grid grid-cols-3 gap-1">
              {(['compact', 'balanced', 'spacious'] as LayoutDensity[]).map((d) => (
                <button
                  key={d}
                  onClick={() => onChangeLayoutDensity(d)}
                  className={`px-1.5 py-1 rounded-md text-[10px] font-semibold capitalize transition-colors ${
                    layoutDensity === d
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between px-1">
            <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">Auto Collision</span>
            <button
              onClick={onToggleCollisionAvoidance}
              className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase transition-colors ${
                collisionAvoidance
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              {collisionAvoidance ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>
      )}

      {/* Main Floating Island Dock */}
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/90 dark:border-slate-800 shadow-[0_8px_30px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.45)] rounded-xl p-1 flex items-center gap-1 select-none">
        {/* ➕ Add Child (Tab) */}
        <button
          onClick={onAddChild || onAddNode}
          title="Add Child Node to selected topic (Hotkey: Tab)"
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold shadow-xs hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
        >
          <GitBranch className="w-3.5 h-3.5" />
          <span>Add Child <span className="opacity-70 text-[9px] font-mono hidden sm:inline">(Tab)</span></span>
        </button>

        {/* ➕ Add Sibling (Enter) */}
        <button
          onClick={onAddSibling || onAddNode}
          title="Add Sibling Node (Hotkey: Enter)"
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-[11px] font-bold hover:bg-slate-800 dark:hover:bg-white shadow-xs hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
        >
          <CornerDownLeft className="w-3.5 h-3.5" />
          <span>Add Sibling <span className="opacity-70 text-[9px] font-mono hidden sm:inline">(Enter)</span></span>
        </button>

        {/* ✏️ Edit Node */}
        {selectedNodeId && onStartEditing && (
          <button
            onClick={onStartEditing}
            title="Edit selected node text (Hotkey: Space / F2)"
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-[11px] font-semibold transition-all cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5 text-blue-500" />
            <span className="hidden md:inline">Edit</span>
          </button>
        )}

        {/* ✨ Contextual AI Node Expansion */}
        {selectedNodeId && onOpenNodeExpansion && (
          <button
            onClick={() => onOpenNodeExpansion(selectedNodeId)}
            title="Expand Selected Node with AI (Context-Aware)"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-[11px] font-bold shadow-xs hover:scale-[1.02] active:scale-95 transition-all cursor-pointer animate-in fade-in zoom-in-95 duration-150"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            <span>AI Expand</span>
          </button>
        )}

        {/* 🗑️ Delete Selected Node */}
        {selectedNodeId && onDeleteNode && (
          <button
            onClick={onDeleteNode}
            title="Delete Selected Node (Hotkey: Del / Backspace)"
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-0.5" />

        {/* AI Mind Map Generator */}
        <button
          onClick={onOpenAiImport}
          title="Generate Full Mind Map with AI"
          className="flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-[11px] font-semibold transition-all cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
          <span className="hidden md:inline">AI Map</span>
        </button>

        {/* 🪄 1-Click Auto Rearrange & Layout Engine */}
        <div className="flex items-center">
          <button
            onClick={() => onApplyLayout('BALANCED_MINDMAP')}
            disabled={isLayouting}
            title="Auto Rearrange & Tidy All Nodes (1-Click Clean Layout)"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-l-lg bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-r-0 border-blue-200 dark:border-blue-800 text-[11px] font-bold transition-all cursor-pointer hover:scale-[1.02] active:scale-95 disabled:opacity-50"
          >
            <Wand2 className={`w-3.5 h-3.5 text-blue-600 dark:text-blue-400 ${isLayouting ? 'animate-spin' : ''}`} />
            <span>Tidy</span>
          </button>
          <button
            onClick={() => {
              setIsLayoutMenuOpen(!isLayoutMenuOpen);
              setIsRoutingMenuOpen(false);
            }}
            title="Choose Layout Structure & Density"
            className={`p-1.5 rounded-r-lg border border-blue-200 dark:border-blue-800 text-[11px] font-bold transition-all cursor-pointer ${
              isLayoutMenuOpen
                ? 'bg-blue-600 text-white'
                : 'bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300'
            }`}
          >
            <ChevronUp className={`w-3 h-3 transition-transform ${isLayoutMenuOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Dynamic Routing Style Switcher */}
        <button
          onClick={() => {
            setIsRoutingMenuOpen(!isRoutingMenuOpen);
            setIsLayoutMenuOpen(false);
          }}
          title="Connection Line Style (Curved, Straight, Smooth, Step)"
          className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
            isRoutingMenuOpen
              ? 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
              : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
          }`}
        >
          <CurrentRoutingIcon className="w-3.5 h-3.5 text-indigo-500" />
          <ChevronUp className={`w-2.5 h-2.5 text-slate-400 transition-transform ${isRoutingMenuOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Canvas Theme / Customizer */}
        <button
          onClick={onOpenCanvasTheme}
          title="Canvas Themes & Backgrounds"
          className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <Palette className="w-4 h-4 text-purple-500" />
        </button>

        {/* Sketch Mode */}
        <button
          onClick={onToggleSketchMode}
          title="Hand-Drawn Sketch Mode"
          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
            sketchMode
              ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
