import React from 'react';
import {
  FilePlus,
  FolderOpen,
  Save,
  PenTool,
  History,
  Download,
  Plus,
  Moon,
  Sun,
  FileCode,
  Keyboard,
  Palette,
  Eraser,
  Sparkles,
} from 'lucide-react';
import { LayoutControls } from './LayoutControls';
import { LayoutDirection, CanvasSettings } from '@/types/graph';

interface HeaderToolbarProps {
  fileName: string | null;
  isSaving: boolean;
  onNew: () => void;
  onOpen: () => void;
  onSave: (forceSaveAs?: boolean) => void;
  onOpenCleanBoard: () => void;
  onOpenAiImport: () => void;
  onAddNode: () => void;
  onApplyLayout: (layout: LayoutDirection) => void;
  isLayouting: boolean;
  settings: CanvasSettings;
  onToggleSketchMode: () => void;
  onToggleTheme: () => void;
  onOpenCanvasTheme: () => void;
  onOpenTimeMachine: () => void;
  onOpenExport: () => void;
  onOpenShortcuts: () => void;
  snapshotCount: number;
  secondsUntilNextSave: number;
}

export const HeaderToolbar: React.FC<HeaderToolbarProps> = ({
  fileName,
  isSaving,
  onNew,
  onOpen,
  onSave,
  onOpenCleanBoard,
  onOpenAiImport,
  onAddNode,
  onApplyLayout,
  isLayouting,
  settings,
  onToggleSketchMode,
  onToggleTheme,
  onOpenCanvasTheme,
  onOpenTimeMachine,
  onOpenExport,
  onOpenShortcuts,
  snapshotCount,
  secondsUntilNextSave,
}) => {
  const minLeft = Math.floor(secondsUntilNextSave / 60);
  const secLeft = secondsUntilNextSave % 60;

  return (
    <header className="h-16 px-4 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md flex items-center justify-between z-30 shrink-0 select-none shadow-xs">
      {/* Left: Brand & File Operations */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-sm font-bold text-base">
            M
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-slate-900 dark:text-slate-100 tracking-tight">
                MapMind
              </span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-semibold border border-blue-200 dark:border-blue-800">
                v1.0
              </span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 truncate max-w-[160px]">
              <FileCode className="w-3 h-3 text-slate-400" />
              <span className="truncate">{fileName || 'Untitled Diagram'}</span>
            </div>
          </div>
        </div>

        {/* File Action Buttons */}
        <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />

        <div className="flex items-center gap-1">
          <button
            onClick={onNew}
            title="New Diagram"
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <FilePlus className="w-4 h-4" />
          </button>
          <button
            onClick={onOpen}
            title="Open File (Ctrl+O)"
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <FolderOpen className="w-4 h-4" />
          </button>
          <button
            onClick={() => onSave(false)}
            disabled={isSaving}
            title="Save to Disk (Ctrl+S silent overwrite)"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900 border border-blue-200 dark:border-blue-800 transition-colors text-xs font-semibold"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Saving...' : 'Save'}</span>
          </button>
          <button
            onClick={onOpenCleanBoard}
            title="Clean Whiteboard / Reset Canvas"
            className="p-2 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
          >
            <Eraser className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Center: Quick Add, AI Generator & Layout Engines */}
      <div className="hidden lg:flex items-center gap-2.5">
        <button
          onClick={onAddNode}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold hover:bg-slate-800 dark:hover:bg-white shadow-xs transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Node
        </button>

        {/* AI Chat to Mind Map Generator Button */}
        <button
          onClick={onOpenAiImport}
          title="Generate Mind Map from ChatGPT, Claude, Gemini, DeepSeek chat"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold shadow-xs hover:shadow-md transition-all group"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
          <span>AI Mind Map</span>
        </button>

        <LayoutControls onApplyLayout={onApplyLayout} isLayouting={isLayouting} />
      </div>

      {/* Right: Canvas Theme, Sketch Mode, Time Machine, Export, Theme */}
      <div className="flex items-center gap-2">
        {/* Canvas Background Theme & Mood Button */}
        <button
          onClick={onOpenCanvasTheme}
          title="Canvas Background Tone, Mood & Grid Pattern"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium transition-colors"
        >
          <Palette className="w-3.5 h-3.5 text-blue-500" />
          <span className="hidden sm:inline">Canvas Theme</span>
        </button>

        {/* Sketch Mode Toggle */}
        <button
          onClick={onToggleSketchMode}
          title={settings.sketchMode ? 'Disable Hand-Drawn Sketch Mode' : 'Enable Hand-Drawn Sketch Mode (RoughJS)'}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-all ${
            settings.sketchMode
              ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-400 text-amber-800 dark:text-amber-300 shadow-xs font-sketch font-bold text-sm'
              : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <PenTool className="w-3.5 h-3.5 text-amber-500" />
          <span className="hidden md:inline">Sketch Mode</span>
        </button>

        {/* Time Machine History Button */}
        <button
          onClick={onOpenTimeMachine}
          title={`Time Machine: ${snapshotCount} IndexedDB snapshots recorded. Auto-save in ${minLeft}m ${secLeft}s`}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium transition-colors relative"
        >
          <History className="w-3.5 h-3.5 text-indigo-500" />
          <span className="hidden sm:inline">Time Machine</span>
          {snapshotCount > 0 && (
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          )}
        </button>

        {/* Export Menu Button */}
        <button
          onClick={onOpenExport}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export</span>
        </button>

        {/* Keyboard Shortcuts Button */}
        <button
          onClick={onOpenShortcuts}
          title="Keyboard Shortcuts Guide (? key)"
          className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
        >
          <Keyboard className="w-4 h-4 text-slate-600 dark:text-slate-300" />
        </button>

        {/* Theme Toggle */}
        <button
          onClick={onToggleTheme}
          title="Toggle Light/Dark Theme"
          className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
        >
          {settings.theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>
      </div>
    </header>
  );
};
