import React from 'react';
import {
  BookOpen,
  BrainCircuit,
  Share2,
  GraduationCap,
  CheckSquare,
  LayoutDashboard,
  Search,
  Sparkles,
  Download,
  FolderOpen,
  Moon,
  Sun,
  ChevronDown,
  FolderArchive,
  PanelRight,
  Plus,
  Cloud,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { Workspace, ViewMode } from '@/types/notebook';
import { AuthUser, SyncStatusInfo } from '@/types/auth';

interface UnifiedHeaderProps {
  workspace: Workspace;
  currentMode: ViewMode;
  onSelectMode: (mode: ViewMode) => void;
  onOpenCommandPalette: () => void;
  onCreatePage?: () => void;
  onOpenDailyNote?: () => void;
  onExportVault: () => void;
  onOpenVaultManager: () => void;
  isAutoSaving?: boolean;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  aiMode: string;
  onOpenAiSettings?: () => void;
  onConnectLocalFolder?: () => void;
  isInspectorOpen?: boolean;
  onToggleInspector?: () => void;
  authUser?: AuthUser | null;
  syncStatus?: SyncStatusInfo;
  onOpenCloudSync?: () => void;
  onOpenConflictModal?: () => void;
}

export const UnifiedHeader: React.FC<UnifiedHeaderProps> = ({
  workspace,
  currentMode,
  onSelectMode,
  onOpenCommandPalette,
  onCreatePage,
  onExportVault,
  onOpenVaultManager,
  isAutoSaving = false,
  isDarkMode,
  onToggleTheme,
  aiMode,
  onConnectLocalFolder,
  isInspectorOpen = true,
  onToggleInspector,
  authUser,
  syncStatus,
  onOpenCloudSync,
  onOpenConflictModal,
}) => {
  const modes: Array<{ id: ViewMode; label: string; icon: React.ReactNode }> = [
    { id: 'editor', label: 'Notes', icon: <BookOpen className="w-3.5 h-3.5" /> },
    { id: 'mindmap', label: 'Mind Map', icon: <BrainCircuit className="w-3.5 h-3.5" /> },
    { id: 'graph', label: 'Graph', icon: <Share2 className="w-3.5 h-3.5" /> },
    { id: 'study', label: 'Study', icon: <GraduationCap className="w-3.5 h-3.5" /> },
    { id: 'tasks', label: 'Tasks', icon: <CheckSquare className="w-3.5 h-3.5" /> },
    { id: 'dashboard', label: 'Hub', icon: <LayoutDashboard className="w-3.5 h-3.5" /> },
  ];

  return (
    <header className="h-12 border-b border-slate-200/60 dark:border-slate-800/60 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl px-3 sm:px-4 flex items-center justify-between z-30 shrink-0 select-none transition-all">
      {/* Left: Brand, Vault Switcher & Quick New Note */}
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenVaultManager}
          className="flex items-center gap-2 px-2 py-1 rounded-xl hover:bg-slate-100/80 dark:hover:bg-slate-800/60 transition-all text-left group"
          title="Switch, Create, or Open Vaults (Ctrl+Alt+V)"
        >
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white shadow-xs font-black text-xs shrink-0">
            M
          </div>
          <div className="hidden sm:flex items-center gap-1">
            <span className="font-bold text-slate-800 dark:text-slate-100 text-xs tracking-tight truncate max-w-[130px] md:max-w-[170px]">
              {workspace.name}
            </span>
            <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-purple-600 transition-colors" />
          </div>
        </button>

        {onCreatePage && (
          <button
            onClick={onCreatePage}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white shadow-xs transition-all active:scale-95"
            title="Create New Note (Ctrl+N)"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden md:inline">New Note</span>
          </button>
        )}
      </div>

      {/* Center: Seamless Mode Switcher */}
      <nav className="flex items-center bg-slate-100/70 dark:bg-slate-800/50 p-0.5 rounded-xl">
        {modes.map((m) => {
          const isActive = currentMode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => onSelectMode(m.id)}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-300 shadow-xs font-semibold'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-white/40 dark:hover:bg-slate-700/30'
              }`}
            >
              <span className={isActive ? 'text-purple-600 dark:text-purple-400' : 'text-slate-400 dark:text-slate-500'}>
                {m.icon}
              </span>
              <span className="hidden sm:inline">{m.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Right: Search, Unified Status & Utilities */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Command Palette Trigger */}
        <button
          onClick={onOpenCommandPalette}
          className="flex items-center gap-2 px-2.5 py-1 rounded-lg text-xs bg-slate-100/70 dark:bg-slate-800/50 hover:bg-slate-200/70 dark:hover:bg-slate-700/60 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-all group"
          title="Search notes or run commands (Ctrl+K)"
        >
          <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-purple-500 transition-colors" />
          <span className="hidden md:inline text-slate-400 text-[11px]">Search...</span>
          <kbd className="hidden sm:inline-flex items-center px-1 py-0.2 text-[9px] font-mono text-slate-400 bg-white/80 dark:bg-slate-900/80 rounded border border-slate-200/60 dark:border-slate-700/60">
            ⌘K
          </kbd>
        </button>

        {/* Sync Conflict Alert Pill */}
        {syncStatus?.state === 'conflict' && onOpenConflictModal && (
          <button
            onClick={onOpenConflictModal}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 animate-pulse"
            title="Sync conflict detected. Click to resolve."
          >
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            <span>Conflict</span>
          </button>
        )}

        {/* Cloud Sync Status Indicator */}
        {onOpenCloudSync && (
          <button
            onClick={onOpenCloudSync}
            className="hidden lg:flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
            title={authUser ? `Encrypted Cloud Sync Active (@${authUser.username})` : 'Configure Cloud Sync & Multi-Device Sync'}
          >
            {syncStatus?.state === 'syncing' ? (
              <>
                <RefreshCw className="w-3 h-3 text-purple-600 animate-spin" />
                <span className="text-[10px]">Syncing...</span>
              </>
            ) : authUser ? (
              <>
                <Cloud className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                <span className="text-[10px]">
                  {syncStatus?.state === 'cloud_saved' ? 'Cloud Synced' : syncStatus?.pendingCount ? `${syncStatus.pendingCount} pending` : 'Cloud Ready'}
                </span>
              </>
            ) : (
              <>
                <Cloud className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[10px] text-slate-400">Local Only</span>
              </>
            )}
          </button>
        )}

        {/* Unified Status Pill: Storage + AI */}
        <div
          className="hidden xl:flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[11px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100/50 dark:bg-slate-800/40"
          title={`Storage: Auto-saved to IndexedDB • AI Connection Mode: ${aiMode}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${isAutoSaving ? 'bg-amber-400 animate-ping' : 'bg-emerald-500'}`} />
          <span className="text-[10px]">{isAutoSaving ? 'Saving' : 'Saved'}</span>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <Sparkles className="w-3 h-3 text-purple-500" />
          <span className="text-[10px] capitalize">{aiMode}</span>
        </div>

        {/* Utility Action Icons */}
        <div className="flex items-center gap-0.5">
          {onOpenCloudSync && (
            <button
              onClick={onOpenCloudSync}
              className={`p-1.5 rounded-lg transition-colors ${
                authUser
                  ? 'text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/50'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title={authUser ? `Cloud Account (@${authUser.username})` : 'Cloud Sync & Accounts'}
            >
              <Cloud className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={onOpenVaultManager}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Manage Vaults (Ctrl+Alt+V)"
          >
            <FolderArchive className="w-4 h-4" />
          </button>

          {onConnectLocalFolder && (
            <button
              onClick={onConnectLocalFolder}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Open Local Vault Folder"
            >
              <FolderOpen className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={onExportVault}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Save Plaintext Backup (Ctrl+S)"
          >
            <Download className="w-4 h-4" />
          </button>

          {currentMode === 'editor' && onToggleInspector && (
            <button
              onClick={onToggleInspector}
              className={`p-1.5 rounded-lg transition-colors ${
                isInspectorOpen
                  ? 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/50'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title="Toggle Knowledge Inspector (Ctrl+J)"
            >
              <PanelRight className="w-4 h-4" />
            </button>
          )}

          {/* Theme Switcher */}
          <button
            onClick={onToggleTheme}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>
  );
};
