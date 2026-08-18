import React, { useState } from 'react';
import {
  Plus,
  Sparkles,
  Tv,
  Focus,
  PenTool,
  Network,
  GitFork,
  Split,
  ChevronUp,
  Keyboard,
  Palette,
  Spline,
  CornerDownRight,
  Minus,
  Wand2,
} from 'lucide-react';
import { LayoutDirection, EdgeRoutingStyle, LayoutDensity } from '@/types/graph';

interface FloatingActionDockProps {
  onAddNode: () => void;
  onOpenAiImport: () => void;
  onOpenPresentation: () => void;
  isSpotlightActive: boolean;
  onToggleSpotlight: () => void;
  sketchMode: boolean;
  onToggleSketchMode: () => void;
  onApplyLayout: (layout: LayoutDirection) => void;
  isLayouting: boolean;
  onOpenCanvasTheme: () => void;
  onOpenShortcuts: () => void;
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
  onOpenAiImport,
  onOpenPresentation,
  isSpotlightActive,
  onToggleSpotlight,
  sketchMode,
  onToggleSketchMode,
  onApplyLayout,
  isLayouting,
  onOpenCanvasTheme,
  onOpenShortcuts,
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
          <button
            onClick={() => {
              onChangeEdgeRoutingStyle('step');
              setIsRoutingMenuOpen(false);
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
              edgeRoutingStyle === 'step'
                ? 'bg-blue-600 text-white'
                : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <CornerDownRight className="w-3 h-3 rotate-90" />
            <span>Step</span>
          </button>
        </div>
      )}

      {/* Layout Engine & Density Flyout Menu */}
      {isLayoutMenuOpen && (
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-800 shadow-xl rounded-xl p-2 flex flex-col gap-1.5 animate-in fade-in zoom-in-95 duration-150 min-w-[260px]">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1 px-1">
              Structure
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
        {/* Quick Add Node */}
        <button
          onClick={onAddNode}
          title="Add New Topic Node (or press Tab)"
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-[11px] font-bold hover:bg-slate-800 dark:hover:bg-white shadow-xs hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add</span>
        </button>

        {/* AI Mind Map Generator */}
        <button
          onClick={onOpenAiImport}
          title="Generate Mind Map with AI"
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white text-[11px] font-bold shadow-xs hover:scale-[1.02] active:scale-95 transition-all cursor-pointer group"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
          <span>AI Map</span>
        </button>

        {/* Contextual AI Node Expansion (When Node Selected) */}
        {selectedNodeId && onOpenNodeExpansion && (
          <button
            onClick={() => onOpenNodeExpansion(selectedNodeId)}
            title="Expand Selected Node with AI (Context-Aware)"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-[11px] font-bold shadow-xs hover:scale-[1.02] active:scale-95 transition-all cursor-pointer animate-in fade-in zoom-in-95 duration-150"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            <span>Expand</span>
          </button>
        )}

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-0.5" />

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
          <span className="hidden sm:inline capitalize">{edgeRoutingStyle}</span>
          <ChevronUp className={`w-2.5 h-2.5 text-slate-400 transition-transform ${isRoutingMenuOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* 🪄 Prioritized 1-Click Rearrange & Layout Engine */}
        <div className="flex items-center">
          <button
            onClick={() => onApplyLayout('BALANCED_MINDMAP')}
            disabled={isLayouting}
            title="Auto Rearrange & Tidy All Nodes (1-Click Clean Layout)"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-l-lg bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-r-0 border-blue-200 dark:border-blue-800 text-[11px] font-bold transition-all cursor-pointer hover:scale-[1.02] active:scale-95 disabled:opacity-50"
          >
            <Wand2 className={`w-3.5 h-3.5 text-blue-600 dark:text-blue-400 ${isLayouting ? 'animate-spin' : ''}`} />
            <span>Rearrange</span>
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

        {/* Subtree Focus Spotlight Mode */}
        <button
          onClick={onToggleSpotlight}
          title={isSpotlightActive ? 'Disable Subtree Focus' : 'Enable Subtree Focus (F)'}
          className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
            isSpotlightActive
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
          }`}
        >
          <Focus className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Focus</span>
        </button>

        {/* Presentation Mode Tour */}
        <button
          onClick={onOpenPresentation}
          title="Presentation Tour (F5 or p)"
          className="flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-[11px] font-medium transition-all cursor-pointer"
        >
          <Tv className="w-3.5 h-3.5 text-indigo-500" />
          <span className="hidden md:inline">Present</span>
        </button>

        {/* Sketch Hand-Drawn Mode */}
        <button
          onClick={onToggleSketchMode}
          title={sketchMode ? 'Disable Sketch Mode' : 'Enable Hand-Drawn Sketch Mode'}
          className={`p-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            sketchMode
              ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 shadow-xs'
              : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
          }`}
        >
          <PenTool className="w-3.5 h-3.5 text-amber-500" />
        </button>

        {/* Canvas Theme / Tone */}
        <button
          onClick={onOpenCanvasTheme}
          title="Canvas Themes & Backgrounds"
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
        >
          <Palette className="w-3.5 h-3.5 text-blue-500" />
        </button>

        {/* Keyboard Shortcuts (?) */}
        <button
          onClick={onOpenShortcuts}
          title="Keyboard Shortcuts (?)"
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
        >
          <Keyboard className="w-3.5 h-3.5 text-slate-500" />
        </button>
      </div>
    </div>
  );
};
