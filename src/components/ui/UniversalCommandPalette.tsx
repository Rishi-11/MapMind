import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  BookOpen,
  BrainCircuit,
  Share2,
  GraduationCap,
  CheckSquare,
  LayoutDashboard,
  Plus,
  Calendar,
  Download,
  Sun,
  Moon,
  FileText,
  FolderArchive,
  Archive,
  ShieldAlert,
  Cloud,
} from 'lucide-react';
import { Workspace, Page, ViewMode } from '@/types/notebook';

interface UniversalCommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  workspace?: Workspace;
  allPages: Page[];
  onSelectPage: (pageId: string) => void;
  onSelectMode: (mode: ViewMode) => void;
  onCreatePage: () => void;
  onOpenDailyNote: () => void;
  onExportVault: () => void;
  onOpenVaultManager?: () => void;
  onExportAllVaults?: () => void;
  onWipeDeviceData?: () => void;
  onOpenCloudSync?: () => void;
  onToggleTheme: () => void;
  isDarkMode: boolean;
}

interface CommandItem {
  id: string;
  title: string;
  category: 'Pages' | 'Navigation' | 'Actions';
  icon: React.ReactNode;
  action: () => void;
  subtitle?: string;
}

export const UniversalCommandPalette: React.FC<UniversalCommandPaletteProps> = ({
  isOpen,
  onClose,
  allPages,
  onSelectPage,
  onSelectMode,
  onCreatePage,
  onOpenDailyNote,
  onExportVault,
  onOpenVaultManager,
  onExportAllVaults,
  onWipeDeviceData,
  onOpenCloudSync,
  onToggleTheme,
  isDarkMode,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Build command list
  const commands: CommandItem[] = useMemo(() => {
    const list: CommandItem[] = [];

    // Navigation Commands
    list.push(
      {
        id: 'nav-notes',
        title: 'Switch to Knowledge Notes',
        category: 'Navigation',
        icon: <BookOpen className="w-4 h-4 text-purple-500" />,
        action: () => onSelectMode('editor'),
      },
      {
        id: 'nav-mindmap',
        title: 'Switch to Mind Map Canvas',
        category: 'Navigation',
        icon: <BrainCircuit className="w-4 h-4 text-indigo-500" />,
        action: () => onSelectMode('mindmap'),
      },
      {
        id: 'nav-graph',
        title: 'Open 2D Knowledge Graph',
        category: 'Navigation',
        icon: <Share2 className="w-4 h-4 text-blue-500" />,
        action: () => onSelectMode('graph'),
      },
      {
        id: 'nav-study',
        title: 'Open Study Hub (Flashcards & Quizzes)',
        category: 'Navigation',
        icon: <GraduationCap className="w-4 h-4 text-pink-500" />,
        action: () => onSelectMode('study'),
      },
      {
        id: 'nav-tasks',
        title: 'View Vault Tasks & Checklists',
        category: 'Navigation',
        icon: <CheckSquare className="w-4 h-4 text-emerald-500" />,
        action: () => onSelectMode('tasks'),
      },
      {
        id: 'nav-dashboard',
        title: 'Open Knowledge Dashboard',
        category: 'Navigation',
        icon: <LayoutDashboard className="w-4 h-4 text-amber-500" />,
        action: () => onSelectMode('dashboard'),
      }
    );

    // Actions
    list.push(
      {
        id: 'act-new-page',
        title: 'Create New Knowledge Note',
        category: 'Actions',
        icon: <Plus className="w-4 h-4 text-purple-500" />,
        action: () => {
          onSelectMode('editor');
          onCreatePage();
        },
      },
      {
        id: 'act-daily-note',
        title: "Open Today's Daily Note",
        category: 'Actions',
        icon: <Calendar className="w-4 h-4 text-blue-500" />,
        action: () => onOpenDailyNote(),
      },
      {
        id: 'act-vault-manager',
        title: 'Open Vault Manager (Switch, Import, Create)',
        category: 'Actions',
        icon: <FolderArchive className="w-4 h-4 text-purple-600" />,
        action: () => onOpenVaultManager?.(),
      },
      {
        id: 'act-cloud-sync',
        title: 'Cloud Sync & Accounts (Google Sheets AES-256-GCM)',
        category: 'Actions',
        icon: <Cloud className="w-4 h-4 text-purple-600" />,
        action: () => onOpenCloudSync?.(),
      },
      {
        id: 'act-export-vault',
        title: 'Export Plaintext Backup (.mapnote / .json)',
        category: 'Actions',
        icon: <Download className="w-4 h-4 text-emerald-500" />,
        action: () => onExportVault(),
      },
      {
        id: 'act-export-all-vaults',
        title: 'Backup All Vaults (Master Bundle JSON)',
        category: 'Actions',
        icon: <Archive className="w-4 h-4 text-indigo-500" />,
        action: () => onExportAllVaults?.(),
      },
      {
        id: 'act-wipe-device',
        title: 'Wipe All Data on this Device (Shared Computer Protection)',
        category: 'Actions',
        icon: <ShieldAlert className="w-4 h-4 text-red-500" />,
        action: () => {
          if (onOpenVaultManager) {
            onOpenVaultManager();
          } else if (onWipeDeviceData) {
            onWipeDeviceData();
          }
        },
      },
      {
        id: 'act-toggle-theme',
        title: isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode',
        category: 'Actions',
        icon: isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-500" />,
        action: () => onToggleTheme(),
      }
    );

    // Page Search Results
    allPages.forEach((page) => {
      list.push({
        id: `page-${page.id}`,
        title: page.title,
        category: 'Pages',
        icon: <FileText className="w-4 h-4 text-purple-400" />,
        subtitle: `${page.pageType} • ${page.tags.join(', ')}`,
        action: () => {
          onSelectMode('editor');
          onSelectPage(page.id);
        },
      });
    });

    return list;
  }, [allPages, onSelectMode, onSelectPage, onCreatePage, onOpenDailyNote, onExportVault, onToggleTheme, isDarkMode]);

  // Filter commands by search query
  const filteredCommands = useMemo(() => {
    if (!query.trim()) return commands.slice(0, 10);
    return commands
      .filter((cmd) => cmd.title.toLowerCase().includes(query.toLowerCase()) || cmd.subtitle?.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 12);
  }, [commands, query]);

  // Handle Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredCommands.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % Math.max(1, filteredCommands.length));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const activeCmd = filteredCommands[selectedIndex];
        if (activeCmd) {
          activeCmd.action();
          onClose();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-100">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Search Input Box */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
          <Search className="w-5 h-5 text-purple-500" />
          <input
            type="text"
            placeholder="Type a command or search notes..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            autoFocus
            className="flex-1 text-sm bg-transparent text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
          />
          <kbd className="px-2 py-0.5 text-[10px] font-mono font-semibold bg-slate-100 dark:bg-slate-800 text-slate-400 rounded border border-slate-200 dark:border-slate-700">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {filteredCommands.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              No matching commands or pages found.
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={cmd.id}
                  onClick={() => {
                    cmd.action();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`p-2.5 rounded-xl text-xs flex items-center justify-between cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-purple-600 text-white font-medium shadow-xs'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3 truncate">
                    <span className={isSelected ? 'text-white' : ''}>{cmd.icon}</span>
                    <div className="truncate">
                      <div className="truncate">{cmd.title}</div>
                      {cmd.subtitle && (
                        <div className={`text-[10px] truncate ${isSelected ? 'text-purple-200' : 'text-slate-400'}`}>
                          {cmd.subtitle}
                        </div>
                      )}
                    </div>
                  </div>

                  <span className={`text-[10px] px-2 py-0.5 rounded-md font-mono ${isSelected ? 'bg-purple-700 text-purple-100' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                    {cmd.category}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>Esc Dismiss</span>
          </div>
          <span>MapMind Universal Palette</span>
        </div>
      </div>
    </div>
  );
};
