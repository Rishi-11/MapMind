import React from 'react';
import {
  FilePlus,
  FolderOpen,
  Save,
  FileDown,
  History,
  Download,
  Moon,
  Sun,
  FileCode,
  Eraser,
  ListTree,
  Search,
  Layers,
} from 'lucide-react';

interface HeaderToolbarProps {
  fileName: string | null;
  isSaving: boolean;
  onNew: () => void;
  onOpen: () => void;
  onSave: (forceSaveAs?: boolean) => void;
  onOpenCleanBoard: () => void;
  onOpenSearch: () => void;
  onToggleOutline: () => void;
  isOutlineOpen: boolean;
  onFoldLevel: (level: number | 'all-expand' | 'all-collapse') => void;
  onToggleTheme: () => void;
  isDarkTheme: boolean;
  onOpenTimeMachine: () => void;
  onOpenExport: () => void;
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
  onOpenSearch,
  onToggleOutline,
  isOutlineOpen,
  onFoldLevel,
  onToggleTheme,
  isDarkTheme,
  onOpenTimeMachine,
  onOpenExport,
  snapshotCount,
  secondsUntilNextSave,
}) => {
  const minLeft = Math.floor(secondsUntilNextSave / 60);
  const secLeft = secondsUntilNextSave % 60;

  return (
    <header className="h-14 px-3 sm:px-5 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl flex items-center justify-between z-30 shrink-0 select-none shadow-xs">
      {/* Left: Outline Drawer, Brand Logo, Diagram Title & File Capsule */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Toggle Outline Drawer */}
        <button
          onClick={onToggleOutline}
          title={isOutlineOpen ? 'Close Outline Navigator' : 'Open Outline Navigator & Search (o key)'}
          className={`p-2 rounded-xl border transition-all cursor-pointer ${
            isOutlineOpen
              ? 'bg-blue-50 dark:bg-blue-950/80 border-blue-400 text-blue-700 dark:text-blue-300 shadow-xs'
              : 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
          }`}
        >
          <ListTree className="w-4 h-4 text-blue-500" />
        </button>

        {/* Brand & File Title */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-sm font-bold text-sm">
            M
          </div>
          <div className="hidden sm:block">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm text-slate-900 dark:text-slate-100 tracking-tight">
                MapMind
              </span>
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 truncate max-w-[130px]">
              <FileCode className="w-2.5 h-2.5 text-slate-400" />
              <span className="truncate">{fileName || 'Untitled Board'}</span>
            </div>
          </div>
        </div>

        {/* File Actions Capsule */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
          <button
            onClick={onNew}
            title="New Diagram"
            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 hover:shadow-2xs transition-all cursor-pointer"
          >
            <FilePlus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onOpen}
            title="Open Diagram (Ctrl+O)"
            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 hover:shadow-2xs transition-all cursor-pointer"
          >
            <FolderOpen className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onSave(false)}
            disabled={isSaving}
            title="Save to File (Ctrl+S)"
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-blue-700 dark:text-blue-300 hover:bg-white dark:hover:bg-slate-700 hover:shadow-2xs transition-all cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? '...' : 'Save'}</span>
          </button>
          <button
            onClick={() => onSave(true)}
            disabled={isSaving}
            title="Save As New File (Ctrl+Shift+S)"
            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 hover:shadow-2xs transition-all cursor-pointer"
          >
            <FileDown className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onOpenCleanBoard}
            title="Clean Whiteboard / Reset Canvas"
            className="p-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-white dark:hover:bg-slate-700 hover:shadow-2xs transition-all cursor-pointer"
          >
            <Eraser className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Center: Search Command Capsule & Depth Selector */}
      <div className="flex items-center gap-2">
        {/* Search Command Trigger (Ctrl+K) */}
        <button
          onClick={onOpenSearch}
          title="Search all nodes, tags, subtopics (Ctrl+K)"
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs transition-all cursor-pointer shadow-2xs group"
        >
          <Search className="w-3.5 h-3.5 text-blue-500 group-hover:scale-110 transition-transform" />
          <span className="hidden sm:inline font-medium text-slate-600 dark:text-slate-300">
            Search branches...
          </span>
          <kbd className="text-[10px] font-mono px-1.5 py-0.2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-slate-500">
            Ctrl+K
          </kbd>
        </button>

        {/* Global Depth Level Selector (L1 | L2 | L3 | All) */}
        <div className="hidden md:flex items-center gap-0.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
          <div className="flex items-center px-1 text-slate-400">
            <Layers className="w-3 h-3" />
          </div>
          <button
            onClick={() => onFoldLevel(1)}
            title="Collapse to Level 1 (Main Topics only)"
            className="px-2 py-0.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 font-bold text-slate-700 dark:text-slate-200 transition-colors text-[11px] cursor-pointer"
          >
            L1
          </button>
          <button
            onClick={() => onFoldLevel(2)}
            title="Collapse to Level 2 (Subtopics)"
            className="px-2 py-0.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 font-bold text-slate-700 dark:text-slate-200 transition-colors text-[11px] cursor-pointer"
          >
            L2
          </button>
          <button
            onClick={() => onFoldLevel(3)}
            title="Collapse to Level 3"
            className="px-2 py-0.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 font-bold text-slate-700 dark:text-slate-200 transition-colors text-[11px] cursor-pointer"
          >
            L3
          </button>
          <button
            onClick={() => onFoldLevel('all-expand')}
            title="Expand All Branches"
            className="px-2 py-0.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 font-bold text-slate-700 dark:text-slate-200 transition-colors text-[11px] cursor-pointer"
          >
            All
          </button>
        </div>
      </div>

      {/* Right: Time Machine History, Export & Theme Toggle */}
      <div className="flex items-center gap-2">
        {/* Time Machine History Button */}
        <button
          onClick={onOpenTimeMachine}
          title={`Time Machine: ${snapshotCount} IndexedDB snapshots recorded. Auto-save in ${minLeft}m ${secLeft}s`}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-all cursor-pointer relative"
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
          title="Export diagram to PNG, SVG, PDF, JSON, Markdown, Mermaid, or Rough Sketch"
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export</span>
        </button>

        {/* Dark / Light Theme Toggle Button */}
        <button
          onClick={onToggleTheme}
          title="Toggle Light/Dark Theme"
          className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
        >
          {isDarkTheme ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-600" />
          )}
        </button>
      </div>
    </header>
  );
};
