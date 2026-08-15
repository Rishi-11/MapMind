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
} from 'lucide-react';
import { LayoutDirection } from '@/types/graph';

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
}) => {
  const [isLayoutMenuOpen, setIsLayoutMenuOpen] = useState(false);

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 pointer-events-auto flex flex-col items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-300">
      {/* Layout Engine Flyout Menu */}
      {isLayoutMenuOpen && (
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-700 shadow-2xl rounded-2xl p-1.5 flex items-center gap-1 animate-in fade-in zoom-in-95 duration-150">
          <button
            onClick={() => {
              onApplyLayout('BALANCED_MINDMAP');
              setIsLayoutMenuOpen(false);
            }}
            disabled={isLayouting}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-950/60 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            <Network className="w-4 h-4 text-blue-500" />
            <span>Balanced Mind Map (ELK)</span>
          </button>
          <button
            onClick={() => {
              onApplyLayout('TB');
              setIsLayoutMenuOpen(false);
            }}
            disabled={isLayouting}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
          >
            <GitFork className="w-4 h-4 text-emerald-500 rotate-180" />
            <span>Top-Down Tree</span>
          </button>
          <button
            onClick={() => {
              onApplyLayout('LR');
              setIsLayoutMenuOpen(false);
            }}
            disabled={isLayouting}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-purple-50 dark:hover:bg-purple-950/60 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
          >
            <Split className="w-4 h-4 text-purple-500 rotate-90" />
            <span>Left-to-Right Flow</span>
          </button>
        </div>
      )}

      {/* Main Floating Island Dock */}
      <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-[0_12px_40px_rgba(0,0,0,0.15)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.5)] rounded-2xl p-1.5 sm:p-2 flex items-center gap-1 sm:gap-1.5 select-none">
        {/* Quick Add Node */}
        <button
          onClick={onAddNode}
          title="Add New Topic Node (or press Tab)"
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold hover:bg-slate-800 dark:hover:bg-white shadow-sm hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Node</span>
        </button>

        {/* AI Mind Map Generator */}
        <button
          onClick={onOpenAiImport}
          title="Generate Mind Map with AI (ChatGPT, Claude, Gemini, DeepSeek)"
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white text-xs font-bold shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-95 transition-all cursor-pointer group"
        >
          <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
          <span>AI Map</span>
        </button>

        <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

        {/* Layout Engines Dropdown */}
        <button
          onClick={() => setIsLayoutMenuOpen(!isLayoutMenuOpen)}
          title="Auto-Align Layout Engines (Balanced Radial, Top-Down, Left-Right)"
          className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            isLayoutMenuOpen
              ? 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
              : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
          }`}
        >
          <Network className="w-4 h-4 text-blue-500" />
          <span className="hidden sm:inline">Layout</span>
          <ChevronUp className={`w-3 h-3 text-slate-400 transition-transform ${isLayoutMenuOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Subtree Focus Spotlight Mode */}
        <button
          onClick={onToggleSpotlight}
          title={isSpotlightActive ? 'Disable Subtree Focus (Show all nodes)' : 'Enable Subtree Focus (Spotlight active branch, dim others) - press F'}
          className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            isSpotlightActive
              ? 'bg-indigo-600 text-white shadow-md'
              : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
          }`}
        >
          <Focus className="w-4 h-4" />
          <span className="hidden sm:inline">Focus</span>
        </button>

        {/* Presentation Mode Tour */}
        <button
          onClick={onOpenPresentation}
          title="Start Step-by-Step Presentation Tour (F5 or p)"
          className="flex items-center gap-1 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all cursor-pointer"
        >
          <Tv className="w-4 h-4 text-indigo-500" />
          <span className="hidden sm:inline">Present</span>
        </button>

        {/* Sketch Hand-Drawn Mode */}
        <button
          onClick={onToggleSketchMode}
          title={sketchMode ? 'Disable Hand-Drawn Sketch Mode' : 'Enable Hand-Drawn Sketch Mode (RoughJS)'}
          className={`p-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            sketchMode
              ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 shadow-xs'
              : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
          }`}
        >
          <PenTool className="w-4 h-4 text-amber-500" />
        </button>

        {/* Canvas Theme / Tone */}
        <button
          onClick={onOpenCanvasTheme}
          title="Canvas Theme Tone, Mood & Grid Presets"
          className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
        >
          <Palette className="w-4 h-4 text-blue-500" />
        </button>

        {/* Keyboard Shortcuts (?) */}
        <button
          onClick={onOpenShortcuts}
          title="Keyboard Shortcuts Cheat Sheet (? key)"
          className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
        >
          <Keyboard className="w-4 h-4 text-slate-500" />
        </button>
      </div>
    </div>
  );
};
