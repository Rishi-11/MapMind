import React, { useMemo } from 'react';
import {
  BookOpen,
  BrainCircuit,
  CheckSquare,
  Sparkles,
  Plus,
  Star,
  Clock,
  ArrowUpRight,
  FileText,
  Layers,
  Check,
} from 'lucide-react';
import { Workspace, Page, VaultStats, ViewMode } from '@/types/notebook';
import { AiConnectionSuggestion } from '@/types/ai';
import { extractMarkdownTasks, extractAllPageTags, extractWikiLinks, buildBacklinkIndex } from '@/lib/notebook/links';

interface DashboardViewProps {
  workspace: Workspace;
  allPages: Page[];
  aiSuggestions: AiConnectionSuggestion[];
  onSelectPage: (pageId: string) => void;
  onCreatePage: () => void;
  onSelectMode: (mode: ViewMode) => void;
  onAcceptAiSuggestion: (suggestion: AiConnectionSuggestion) => void;
  notebookMap: Map<string, string>;
  sectionMap: Map<string, string>;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  workspace,
  allPages,
  aiSuggestions,
  onSelectPage,
  onCreatePage,
  onSelectMode,
  onAcceptAiSuggestion,
  notebookMap,
  sectionMap,
}) => {
  // Recent pages sorted by updatedAt
  const recentPages = useMemo(() => {
    return [...allPages].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 4);
  }, [allPages]);

  // Favorite pages
  const favoritePages = useMemo(() => {
    return allPages.filter((p) => p.favorite).slice(0, 4);
  }, [allPages]);

  // All extracted tasks across all notes
  const allVaultTasks = useMemo(() => {
    return extractMarkdownTasks(allPages, notebookMap, sectionMap);
  }, [allPages, notebookMap, sectionMap]);

  // Pending Tasks for dashboard list
  const pendingTasks = useMemo(() => {
    return allVaultTasks.filter((t) => !t.completed).slice(0, 5);
  }, [allVaultTasks]);

  // Knowledge statistics computed dynamically from real notes
  const stats: VaultStats = useMemo(() => {
    let words = 0;
    let linkCount = 0;
    const tagSet = new Set<string>();

    allPages.forEach((p) => {
      words += p.content.split(/\s+/).filter(Boolean).length;
      linkCount += extractWikiLinks(p.content).length;
      extractAllPageTags(p).forEach((t) => tagSet.add(t));
    });

    const backlinkMap = buildBacklinkIndex(allPages, notebookMap, sectionMap);
    let totalBacklinkCount = 0;
    backlinkMap.forEach((bls) => {
      totalBacklinkCount += bls.length;
    });

    const completed = allVaultTasks.filter((t) => t.completed).length;

    return {
      totalNotebooks: workspace.notebooks.length,
      totalSections: workspace.notebooks.reduce((acc, nb) => acc + nb.sections.length, 0),
      totalPages: allPages.length,
      totalWords: words,
      totalLinks: linkCount,
      totalBacklinks: totalBacklinkCount,
      totalTags: tagSet.size,
      totalTasks: allVaultTasks.length,
      completedTasks: completed,
      totalAiSuggestions: aiSuggestions.length,
    };
  }, [workspace.notebooks, allPages, allVaultTasks, notebookMap, sectionMap, aiSuggestions.length]);

  return (
    <div className="flex-1 h-full flex flex-col bg-slate-50 dark:bg-slate-950 overflow-y-auto custom-scrollbar select-none p-4 sm:p-6 lg:p-8 space-y-6 max-w-6xl mx-auto w-full">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-purple-700 via-indigo-600 to-blue-600 rounded-3xl p-5 sm:p-8 text-white shadow-xl">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Local-First Knowledge Studio</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Welcome to {workspace.name}
          </h1>
          <p className="text-xs sm:text-sm text-purple-100 leading-relaxed">
            Your private knowledge notebook is connected with interactive mind maps, automatic backlinks, and local AI reasoning.
          </p>
          <div className="flex flex-wrap items-center gap-2.5 pt-2">
            <button
              onClick={onCreatePage}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-white text-purple-900 shadow-md hover:bg-purple-50 transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 text-purple-700" />
              <span>Create New Note</span>
            </button>
            <button
              onClick={() => onSelectMode('mindmap')}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-900/60 hover:bg-purple-900/80 text-white border border-white/20 transition-all flex items-center gap-1.5"
            >
              <BrainCircuit className="w-4 h-4 text-purple-300" />
              <span>Open Mind Map Whiteboard</span>
            </button>
          </div>
        </div>

        {/* Ambient Decorative Halo */}
        <div className="absolute right-0 top-0 -translate-y-12 translate-x-12 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Stats Counter Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Notes</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white flex items-center justify-between">
            <span>{stats.totalPages}</span>
            <FileText className="w-5 h-5 text-purple-500 opacity-60" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Words</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white flex items-center justify-between">
            <span>{stats.totalWords.toLocaleString()}</span>
            <BookOpen className="w-5 h-5 text-blue-500 opacity-60" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Notebooks</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white flex items-center justify-between">
            <span>{stats.totalNotebooks}</span>
            <Layers className="w-5 h-5 text-indigo-500 opacity-60" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">AI Suggestions</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white flex items-center justify-between">
            <span>{aiSuggestions.length}</span>
            <Sparkles className="w-5 h-5 text-emerald-500 opacity-60" />
          </div>
        </div>
      </div>

      {/* Main Grid: Continue Learning + AI Suggestions Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Continue Learning & Recent Notes */}
        <div className="lg:col-span-2 space-y-6">
          {/* Continue Learning */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-500" /> Continue Learning
              </h2>
              <button
                onClick={() => onSelectMode('editor')}
                className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline"
              >
                View all notes
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {recentPages.map((page) => (
                <div
                  key={page.id}
                  onClick={() => onSelectPage(page.id)}
                  className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-700 shadow-xs hover:shadow-md cursor-pointer transition-all group flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 font-mono uppercase">
                        {page.pageType}
                      </span>
                      {page.favorite && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />}
                    </div>
                    <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 group-hover:text-purple-600 transition-colors">
                      {page.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {page.content.replace(/#+|_|\*|`|\[\[|\]\]/g, '').slice(0, 100)}...
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400">
                    <span>{notebookMap.get(page.notebookId)}</span>
                    <span className="flex items-center gap-0.5 text-purple-600 font-medium group-hover:translate-x-0.5 transition-transform">
                      Open <ArrowUpRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Favorite Notes Shelf */}
          {favoritePages.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400" /> Starred Favorites
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {favoritePages.map((page) => (
                  <div
                    key={page.id}
                    onClick={() => onSelectPage(page.id)}
                    className="p-3.5 bg-amber-50/40 dark:bg-amber-950/20 rounded-2xl border border-amber-200/70 dark:border-amber-900/40 hover:border-amber-400 cursor-pointer transition-all flex items-center justify-between group"
                  >
                    <div className="space-y-0.5 truncate">
                      <span className="font-bold text-xs text-slate-800 dark:text-slate-100 group-hover:text-amber-600 transition-colors truncate block">
                        {page.title}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {notebookMap.get(page.notebookId)}
                      </span>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-amber-500 opacity-60 group-hover:opacity-100 transition-opacity" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Today's Tasks */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-emerald-500" /> Pending Action Tasks
              </h2>
              <button
                onClick={() => onSelectMode('tasks')}
                className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline"
              >
                View all tasks ({allVaultTasks.length})
              </button>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3 divide-y divide-slate-100 dark:divide-slate-800 shadow-xs">
              {pendingTasks.length === 0 ? (
                <p className="p-4 text-xs text-slate-400 text-center">All caught up! No pending tasks.</p>
              ) : (
                pendingTasks.map((task) => (
                  <div key={task.id} className="py-2.5 px-2 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5 truncate">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="font-medium text-slate-700 dark:text-slate-300 truncate">{task.text}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                      [[{task.pageTitle}]]
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Col: AI Connection Suggestions Feed */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-500" /> AI Suggestions Feed
            </h2>
            <span className="text-[10px] font-mono text-emerald-500 font-semibold">Local AI</span>
          </div>

          <div className="space-y-3">
            {aiSuggestions.slice(0, 4).map((sug) => (
              <div
                key={sug.id}
                className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-purple-200/80 dark:border-purple-900/60 shadow-xs space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 font-bold text-xs text-purple-900 dark:text-purple-200">
                    <span>{sug.sourceTitle}</span>
                    <span className="text-slate-400">↔</span>
                    <span>{sug.targetTitle}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                    {Math.round(sug.confidence * 100)}%
                  </span>
                </div>

                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  {sug.reason}
                </p>

                <button
                  onClick={() => onAcceptAiSuggestion(sug)}
                  className="w-full py-1.5 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" /> Accept Connection
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
