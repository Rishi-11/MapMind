import React from 'react';
import {
  BookOpen,
  BrainCircuit,
  Share2,
  GraduationCap,
  CheckSquare,
  LayoutDashboard,
  Search,
  Command,
  Plus,
  Calendar,
  Sparkles,
  Download,
  FolderOpen,
  Moon,
  Sun,
  ChevronDown,
  HardDrive,
  FolderArchive,
} from 'lucide-react';
import { Workspace, ViewMode } from '@/types/notebook';

interface UnifiedHeaderProps {
  workspace: Workspace;
  currentMode: ViewMode;
  onSelectMode: (mode: ViewMode) => void;
  onOpenCommandPalette: () => void;
  onCreatePage: () => void;
  onOpenDailyNote: () => void;
  onExportVault: () => void;
  onOpenVaultManager: () => void;
  isAutoSaving?: boolean;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  aiMode: string;
  onOpenAiSettings?: () => void;
  onConnectLocalFolder?: () => void;
}

export const UnifiedHeader: React.FC<UnifiedHeaderProps> = ({
  workspace,
  currentMode,
  onSelectMode,
  onOpenCommandPalette,
  onCreatePage,
  onOpenDailyNote,
  onExportVault,
  onOpenVaultManager,
  isAutoSaving = false,
  isDarkMode,
  onToggleTheme,
  aiMode,
  onConnectLocalFolder,
}) => {
  const modes: Array<{ id: ViewMode; label: string; icon: React.ReactNode; badge?: string }> = [
    { id: 'editor', label: 'Notes', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'mindmap', label: 'Mind Map', icon: <BrainCircuit className="w-4 h-4" /> },
    { id: 'graph', label: 'Graph', icon: <Share2 className="w-4 h-4" /> },
    { id: 'study', label: 'Study & Quiz', icon: <GraduationCap className="w-4 h-4" /> },
    { id: 'tasks', label: 'Tasks', icon: <CheckSquare className="w-4 h-4" /> },
    { id: 'dashboard', label: 'Hub', icon: <LayoutDashboard className="w-4 h-4" /> },
  ];

  return (
    <header className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3 sm:px-4 flex items-center justify-between z-30 shrink-0 select-none">
      {/* Left: Brand & Vault Switcher */}
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          onClick={onOpenVaultManager}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700 text-left group"
          title="Switch, Create, or Open Vaults (Ctrl+Alt+V)"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white shadow-md shadow-purple-500/20 font-black text-sm shrink-0">
            M
          </div>
          <div className="hidden sm:block leading-none pr-1">
            <div className="flex items-center gap-1">
              <span className="font-bold text-slate-800 dark:text-slate-100 text-xs tracking-tight truncate max-w-[140px] md:max-w-[180px]">
                {workspace.name}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-purple-600 transition-colors" />
            </div>
            <span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold block mt-0.5">
              Local Vault
            </span>
          </div>
        </button>

        <div className="hidden lg:flex items-center gap-1.5 ml-1 border-l border-slate-200 dark:border-slate-800 pl-3">
          <button
            onClick={onCreatePage}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/50 border border-purple-200 dark:border-purple-800 transition-colors"
            title="Create New Page (Ctrl+N)"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Page</span>
          </button>

          <button
            onClick={onOpenDailyNote}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Open Today's Daily Note (Ctrl+D)"
          >
            <Calendar className="w-3.5 h-3.5 text-blue-500" />
            <span>Daily</span>
          </button>
        </div>
      </div>

      {/* Center: Mode Tabs */}
      <nav className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/60 shadow-inner">
        {modes.map((m) => {
          const isActive = currentMode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => onSelectMode(m.id)}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-300 shadow-sm font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white/50 dark:hover:bg-slate-700/50'
              }`}
            >
              {m.icon}
              <span className="hidden sm:inline">{m.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Right: Search / Palette, AI Badge, Auto-Save, Export & Theme */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Command Palette Trigger */}
        <button
          onClick={onOpenCommandPalette}
          className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors"
          title="Search or Commands (Ctrl+K / Cmd+K)"
        >
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <span className="hidden md:inline text-slate-400">Search notes...</span>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold bg-white dark:bg-slate-900 text-slate-500 rounded border border-slate-200 dark:border-slate-700">
            <Command className="w-2.5 h-2.5" /> K
          </kbd>
        </button>

        {/* Auto-Save Status Badge */}
        <div
          className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-medium bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
          title="Changes automatically save to IndexedDB"
        >
          <HardDrive className={`w-3.5 h-3.5 ${isAutoSaving ? 'text-amber-500 animate-spin' : 'text-emerald-500'}`} />
          <span>{isAutoSaving ? 'Saving...' : 'Saved'}</span>
        </div>

        {/* AI Mode Indicator */}
        <div
          className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
          title={`AI Mode: ${aiMode}`}
        >
          <Sparkles className="w-3 h-3 text-emerald-500 animate-pulse" />
          <span className="capitalize">AI: {aiMode}</span>
        </div>

        {/* Vault Switcher Modal Trigger */}
        <button
          onClick={onOpenVaultManager}
          className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Manage Vaults (Ctrl+Alt+V)"
        >
          <FolderArchive className="w-4 h-4 text-purple-600 dark:text-purple-400" />
        </button>

        {/* Local Folder Access */}
        {onConnectLocalFolder && (
          <button
            onClick={onConnectLocalFolder}
            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Open Local Vault Folder"
          >
            <FolderOpen className="w-4 h-4 text-amber-500" />
          </button>
        )}

        {/* Export Vault Backup */}
        <button
          onClick={onExportVault}
          className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Export Active Vault Backup JSON (Ctrl+S)"
        >
          <Download className="w-4 h-4" />
        </button>

        {/* Theme Toggle */}
        <button
          onClick={onToggleTheme}
          className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-500" />}
        </button>
      </div>
    </header>
  );
};
