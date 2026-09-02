import React, { useState, useMemo } from 'react';
import {
  FileText,
  Plus,
  ChevronRight,
  ChevronDown,
  Search,
  Hash,
  Trash2,
  Calendar,
  CheckSquare,
  Sparkles,
  BookOpen,
  PanelLeftClose,
  PanelLeft,
  Pin,
  PinOff,
  Edit2,
  ArrowUp,
  ArrowDown,
  Check,
  X,
} from 'lucide-react';
import { Workspace, Page } from '@/types/notebook';
import { extractAllPageTags } from '@/lib/notebook/links';

interface NotebookSidebarProps {
  workspace: Workspace;
  activeNotebookId: string | null;
  activeSectionId: string | null;
  activePageId: string | null;
  onSelectPage: (notebookId: string, sectionId: string, pageId: string) => void;
  onSelectNotebook: (notebookId: string) => void;
  onCreateNotebook: (name: string, icon: string, color: string) => void;
  onCreateSection: (notebookId: string, name: string) => void;
  onCreatePage: (notebookId: string, sectionId: string, title?: string) => void;
  onDeletePage: (pageId: string) => void;
  onDeleteNotebook: (notebookId: string) => void;
  onDeleteSection: (sectionId: string) => void;
  onRenameNotebook?: (notebookId: string, newName: string) => void;
  onRenameSection?: (notebookId: string, sectionId: string, newName: string) => void;
  onRenamePage?: (pageId: string, newTitle: string) => void;
  onReorderNotebooks?: (notebookId: string, direction: 'up' | 'down') => void;
  onReorderSections?: (notebookId: string, sectionId: string, direction: 'up' | 'down') => void;
  onReorderPages?: (sectionId: string, pageId: string, direction: 'up' | 'down') => void;
  onToggleFavorite?: (pageId: string) => void;
  onOpenDailyNote: () => void;
  onOpenTasksView: () => void;
  onOpenStudyView: () => void;
  selectedTag: string | null;
  onSelectTag: (tag: string | null) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const NotebookSidebar: React.FC<NotebookSidebarProps> = ({
  workspace,
  activeNotebookId,
  activeSectionId,
  activePageId,
  onSelectPage,
  onSelectNotebook,
  onCreateNotebook,
  onCreateSection,
  onCreatePage,
  onDeletePage,
  onDeleteNotebook,
  onDeleteSection,
  onRenameNotebook,
  onRenameSection,
  onRenamePage,
  onReorderNotebooks,
  onReorderSections,
  onReorderPages,
  onToggleFavorite,
  onOpenDailyNote,
  onOpenTasksView,
  onOpenStudyView,
  selectedTag,
  onSelectTag,
  isCollapsed,
  onToggleCollapse,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedNotebooks, setExpandedNotebooks] = useState<Record<string, boolean>>({});
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [isPinnedExpanded, setIsPinnedExpanded] = useState(true);

  // Rename states
  const [editingNotebookId, setEditingNotebookId] = useState<string | null>(null);
  const [editingNotebookName, setEditingNotebookName] = useState('');

  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingSectionName, setEditingSectionName] = useState('');

  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [editingPageTitle, setEditingPageTitle] = useState('');

  // Modal dialog states for new notebook / section / page
  const [isNewNotebookOpen, setIsNewNotebookOpen] = useState(false);
  const [newNotebookName, setNewNotebookName] = useState('');
  const [newNotebookIcon, setNewNotebookIcon] = useState('📘');
  const [newNotebookColor, setNewNotebookColor] = useState('#3b82f6');

  const [activeSectionAddModal, setActiveSectionAddModal] = useState<string | null>(null);
  const [newSectionName, setNewSectionName] = useState('');

  // Pinned Notes aggregation
  const pinnedPages = useMemo(() => {
    const list: { page: Page; notebookId: string; sectionId: string; notebookName: string }[] = [];
    workspace.notebooks.forEach((nb) => {
      nb.sections.forEach((sec) => {
        sec.pages.forEach((p) => {
          if (p.favorite) {
            list.push({ page: p, notebookId: nb.id, sectionId: sec.id, notebookName: nb.name });
          }
        });
      });
    });
    return list;
  }, [workspace.notebooks]);

  // Collect all unique tags and count frequencies from ALL pages dynamically
  const allTagsMap = new Map<string, number>();
  workspace.notebooks.forEach((nb) => {
    nb.sections.forEach((sec) => {
      sec.pages.forEach((p) => {
        const pageTags = extractAllPageTags(p);
        pageTags.forEach((t) => {
          allTagsMap.set(t, (allTagsMap.get(t) || 0) + 1);
        });
      });
    });
  });

  const allTags = Array.from(allTagsMap.entries()).sort((a, b) => b[1] - a[1]);

  const toggleNotebook = (nbId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedNotebooks((prev) => ({
      ...prev,
      [nbId]: prev[nbId] === undefined ? false : !prev[nbId],
    }));
  };

  const toggleSection = (secId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedSections((prev) => ({
      ...prev,
      [secId]: prev[secId] === undefined ? false : !prev[secId],
    }));
  };

  const handleCreateNotebookSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNotebookName.trim()) return;
    onCreateNotebook(newNotebookName.trim(), newNotebookIcon, newNotebookColor);
    setNewNotebookName('');
    setIsNewNotebookOpen(false);
  };

  const handleCreateSectionSubmit = (notebookId: string, e: React.FormEvent) => {
    e.preventDefault();
    if (!newSectionName.trim()) return;
    onCreateSection(notebookId, newSectionName.trim());
    setNewSectionName('');
    setActiveSectionAddModal(null);
  };

  const handleQuickCreatePage = () => {
    const targetNb = workspace.notebooks.find((nb) => nb.id === activeNotebookId) || workspace.notebooks[0];
    if (!targetNb) return;
    const targetSec = targetNb.sections.find((s) => s.id === activeSectionId) || targetNb.sections[0];
    if (!targetSec) return;
    onCreatePage(targetNb.id, targetSec.id);
  };

  if (isCollapsed) {
    return (
      <aside className="w-12 h-full border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex flex-col items-center py-3 select-none">
        <button
          onClick={onToggleCollapse}
          className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          title="Expand Sidebar"
        >
          <PanelLeft className="w-5 h-5" />
        </button>
        <div className="w-6 h-px bg-slate-200 dark:border-slate-800 my-2" />
        <button
          onClick={handleQuickCreatePage}
          className="p-2 rounded-lg text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-950/60 transition-colors"
          title="New Note (Ctrl+N)"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          onClick={onOpenDailyNote}
          className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          title="Daily Note"
        >
          <Calendar className="w-4 h-4 text-blue-500" />
        </button>
        <button
          onClick={onOpenTasksView}
          className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          title="Vault Tasks"
        >
          <CheckSquare className="w-4 h-4 text-emerald-500" />
        </button>
        <button
          onClick={onOpenStudyView}
          className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          title="Study & Quiz"
        >
          <Sparkles className="w-4 h-4 text-purple-500" />
        </button>
      </aside>
    );
  }

  return (
    <aside className="w-56 md:w-60 lg:w-64 xl:w-72 h-full border-r border-slate-200/80 dark:border-slate-800/80 bg-slate-50/80 dark:bg-slate-900/70 backdrop-blur-md flex flex-col select-none shrink-0 overflow-hidden transition-all duration-150">
      {/* Sidebar Header: Vault Title & Search */}
      <div className="p-3 border-b border-slate-200/80 dark:border-slate-800 flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span className="font-semibold text-xs text-slate-700 dark:text-slate-200 uppercase tracking-wider">
              {workspace.name}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsNewNotebookOpen(true)}
              className="p-1 rounded-md text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              title="Add Notebook"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={onToggleCollapse}
              className="p-1 rounded-md text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              title="Collapse Sidebar"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter / Search input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Filter pages & tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
        </div>
      </div>

      {/* Main Tree Scrollable Area */}
      <div className="flex-1 overflow-y-auto px-2 py-2.5 space-y-4 custom-scrollbar">
        {/* Quick Links / Smart Views */}
        <div className="space-y-0.5">
          <button
            onClick={handleQuickCreatePage}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold text-purple-700 dark:text-purple-300 bg-purple-50/80 hover:bg-purple-100/90 dark:bg-purple-950/40 dark:hover:bg-purple-900/60 transition-colors text-left group"
            title="Create New Note (Ctrl+N)"
          >
            <div className="flex items-center gap-2.5">
              <Plus className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform" />
              <span>New Note</span>
            </div>
            <kbd className="text-[10px] font-mono text-purple-400/80 dark:text-purple-400/60 opacity-0 group-hover:opacity-100 transition-opacity">
              Ctrl+N
            </kbd>
          </button>
          <button
            onClick={onOpenDailyNote}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800/70 transition-colors text-left"
          >
            <Calendar className="w-3.5 h-3.5 text-blue-500" />
            <span>Today's Daily Note</span>
          </button>
          <button
            onClick={onOpenTasksView}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800/70 transition-colors text-left"
          >
            <CheckSquare className="w-3.5 h-3.5 text-emerald-500" />
            <span>Vault Tasks & Action Items</span>
          </button>
        </div>

        {/* 📌 Pinned Notes Section */}
        {pinnedPages.length > 0 && (
          <div>
            <div className="flex items-center justify-between px-2.5 mb-1">
              <button
                onClick={() => setIsPinnedExpanded(!isPinnedExpanded)}
                className="flex items-center gap-1 text-[10px] font-bold text-amber-500 uppercase tracking-wider hover:text-amber-600"
              >
                {isPinnedExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                <Pin className="w-3 h-3 fill-amber-400" />
                <span>Pinned Notes ({pinnedPages.length})</span>
              </button>
            </div>
            {isPinnedExpanded && (
              <div className="space-y-0.5 ml-1">
                {pinnedPages.map(({ page, notebookId, sectionId }) => {
                  const isPageActive = activePageId === page.id;
                  return (
                    <div
                      key={`pinned-${page.id}`}
                      onClick={() => onSelectPage(notebookId, sectionId, page.id)}
                      className={`flex items-center justify-between px-2 py-1 rounded text-xs cursor-pointer group transition-all ${
                        isPageActive
                          ? 'bg-amber-500 text-white font-medium shadow-xs'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-amber-50/60 dark:hover:bg-amber-950/30'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 truncate flex-1">
                        <Pin className={`w-3 h-3 shrink-0 ${isPageActive ? 'text-white fill-white' : 'text-amber-400 fill-amber-400'}`} />
                        <span className="truncate">{page.title}</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavorite?.(page.id);
                        }}
                        className={`p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
                          isPageActive ? 'text-white hover:bg-amber-600' : 'text-slate-400 hover:text-amber-600'
                        }`}
                        title="Unpin Note"
                      >
                        <PinOff className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Collections */}
        {workspace.collections && workspace.collections.length > 0 && (
          <div>
            <div className="flex items-center justify-between px-2.5 mb-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Collections
              </span>
              {selectedCollectionId && (
                <button
                  onClick={() => setSelectedCollectionId(null)}
                  className="text-[10px] text-purple-600 dark:text-purple-400 hover:underline"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="space-y-0.5">
              {workspace.collections.map((col) => {
                const validPages = col.pageIds.filter((pid) =>
                  workspace.notebooks.some((nb) => nb.sections.some((sec) => sec.pages.some((p) => p.id === pid)))
                );
                const isColActive = selectedCollectionId === col.id;
                return (
                  <div
                    key={col.id}
                    onClick={() => setSelectedCollectionId(isColActive ? null : col.id)}
                    className={`flex items-center justify-between px-2.5 py-1 rounded-lg text-xs cursor-pointer transition-colors ${
                      isColActive
                        ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-900 dark:text-purple-200 font-semibold shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs">{col.icon}</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">{col.name}</span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-500 font-mono">
                      {validPages.length}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Notebooks Hierarchy */}
        <div>
          <div className="flex items-center justify-between px-2.5 mb-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Notebooks
            </span>
            <button
              onClick={() => setIsNewNotebookOpen(true)}
              className="text-[11px] text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-0.5"
            >
              <Plus className="w-3 h-3" /> New
            </button>
          </div>

          <div className="space-y-1">
            {workspace.notebooks.map((notebook, nbIdx) => {
              const containsActivePage = notebook.sections.some((s) => s.pages.some((p) => p.id === activePageId));
              const isNbExpanded = containsActivePage ? true : expandedNotebooks[notebook.id] !== false;
              const isNbActive = activeNotebookId === notebook.id || containsActivePage;

              return (
                <div key={notebook.id} className="rounded-lg overflow-hidden">
                  {/* Notebook Header Row or Inline Rename Form */}
                  {editingNotebookId === notebook.id ? (
                    <div className="p-1.5 bg-purple-50 dark:bg-slate-800 rounded-lg flex items-center gap-1">
                      <input
                        type="text"
                        value={editingNotebookName}
                        onChange={(e) => setEditingNotebookName(e.target.value)}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            if (editingNotebookName.trim()) onRenameNotebook?.(notebook.id, editingNotebookName.trim());
                            setEditingNotebookId(null);
                          } else if (e.key === 'Escape') {
                            setEditingNotebookId(null);
                          }
                        }}
                        className="flex-1 px-2 py-0.5 text-xs rounded bg-white dark:bg-slate-900 border border-purple-400 dark:border-purple-600 outline-none text-slate-800 dark:text-slate-100"
                      />
                      <button
                        onClick={() => {
                          if (editingNotebookName.trim()) onRenameNotebook?.(notebook.id, editingNotebookName.trim());
                          setEditingNotebookId(null);
                        }}
                        className="p-1 text-emerald-600 hover:bg-emerald-100 rounded"
                        title="Save"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setEditingNotebookId(null)}
                        className="p-1 text-slate-400 hover:bg-slate-200 rounded"
                        title="Cancel"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => onSelectNotebook(notebook.id)}
                      className={`flex items-center justify-between px-2 py-1.5 rounded-lg text-xs font-semibold cursor-pointer group transition-colors ${
                        isNbActive
                          ? 'bg-purple-100/70 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 truncate flex-1">
                        <button
                          onClick={(e) => toggleNotebook(notebook.id, e)}
                          className="p-0.5 rounded hover:bg-slate-300 dark:hover:bg-slate-700"
                        >
                          {isNbExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                          )}
                        </button>
                        <span className="text-sm">{notebook.icon || '📁'}</span>
                        <span className="truncate">{notebook.name}</span>
                      </div>

                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        {/* Reorder Up / Down */}
                        {nbIdx > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onReorderNotebooks?.(notebook.id, 'up');
                            }}
                            className="p-1 rounded hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-500"
                            title="Move Notebook Up"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                        )}
                        {nbIdx < workspace.notebooks.length - 1 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onReorderNotebooks?.(notebook.id, 'down');
                            }}
                            className="p-1 rounded hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-500"
                            title="Move Notebook Down"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                        )}
                        {/* Rename */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingNotebookId(notebook.id);
                            setEditingNotebookName(notebook.name);
                          }}
                          className="p-1 rounded hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-500"
                          title="Rename Notebook"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        {/* Add Section */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveSectionAddModal(notebook.id);
                          }}
                          className="p-1 rounded hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-500"
                          title="Add Section"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        {/* Delete */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Delete notebook "${notebook.name}" and all its pages?`)) {
                              onDeleteNotebook(notebook.id);
                            }
                          }}
                          className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-950/50 text-red-500"
                          title="Delete Notebook"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Add Section Form Inline */}
                  {activeSectionAddModal === notebook.id && (
                    <form
                      onSubmit={(e) => handleCreateSectionSubmit(notebook.id, e)}
                      className="p-2 mx-2 my-1 bg-white dark:bg-slate-800 rounded-lg border border-purple-300 dark:border-purple-700 space-y-1.5 animate-in fade-in"
                    >
                      <input
                        autoFocus
                        type="text"
                        placeholder="Section name..."
                        value={newSectionName}
                        onChange={(e) => setNewSectionName(e.target.value)}
                        className="w-full px-2 py-1 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-slate-800 dark:text-slate-100 outline-none"
                      />
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setActiveSectionAddModal(null)}
                          className="px-2 py-0.5 text-[10px] text-slate-500 hover:text-slate-700"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-2 py-0.5 text-[10px] bg-purple-600 text-white rounded font-medium"
                        >
                          Add Section
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Sections List */}
                  {isNbExpanded && (
                    <div className="ml-3 pl-1.5 border-l border-slate-200 dark:border-slate-800 space-y-1 mt-0.5">
                      {notebook.sections.map((section, secIdx) => {
                        const secContainsActivePage = section.pages.some((p) => p.id === activePageId);
                        const isSecExpanded = secContainsActivePage ? true : expandedSections[section.id] !== false;
                        const isSecActive = activeSectionId === section.id || secContainsActivePage;

                        return (
                          <div key={section.id} className="space-y-0.5">
                            {/* Section Header Row or Inline Rename Form */}
                            {editingSectionId === section.id ? (
                              <div className="p-1 bg-purple-50 dark:bg-slate-800 rounded flex items-center gap-1 my-0.5">
                                <input
                                  type="text"
                                  value={editingSectionName}
                                  onChange={(e) => setEditingSectionName(e.target.value)}
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      if (editingSectionName.trim()) onRenameSection?.(notebook.id, section.id, editingSectionName.trim());
                                      setEditingSectionId(null);
                                    } else if (e.key === 'Escape') {
                                      setEditingSectionId(null);
                                    }
                                  }}
                                  className="flex-1 px-1.5 py-0.5 text-xs rounded bg-white dark:bg-slate-900 border border-purple-400 dark:border-purple-600 outline-none text-slate-800 dark:text-slate-100"
                                />
                                <button
                                  onClick={() => {
                                    if (editingSectionName.trim()) onRenameSection?.(notebook.id, section.id, editingSectionName.trim());
                                    setEditingSectionId(null);
                                  }}
                                  className="p-0.5 text-emerald-600 hover:bg-emerald-100 rounded"
                                  title="Save"
                                >
                                  <Check className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => setEditingSectionId(null)}
                                  className="p-0.5 text-slate-400 hover:bg-slate-200 rounded"
                                  title="Cancel"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <div
                                className={`flex items-center justify-between px-1.5 py-1 rounded text-xs font-medium cursor-pointer group transition-colors ${
                                  isSecActive
                                    ? 'text-purple-700 dark:text-purple-300 bg-slate-200/50 dark:bg-slate-800/50'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/40 dark:hover:bg-slate-800/40'
                                }`}
                              >
                                <div
                                  className="flex items-center gap-1.5 truncate flex-1"
                                  onClick={(e) => toggleSection(section.id, e)}
                                >
                                  {isSecExpanded ? (
                                    <ChevronDown className="w-3 h-3 text-slate-400" />
                                  ) : (
                                    <ChevronRight className="w-3 h-3 text-slate-400" />
                                  )}
                                  <span className="truncate">{section.name}</span>
                                </div>

                                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {/* Section Reorder Up/Down */}
                                  {secIdx > 0 && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onReorderSections?.(notebook.id, section.id, 'up');
                                      }}
                                      className="p-0.5 rounded hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-500"
                                      title="Move Section Up"
                                    >
                                      <ArrowUp className="w-3 h-3" />
                                    </button>
                                  )}
                                  {secIdx < notebook.sections.length - 1 && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onReorderSections?.(notebook.id, section.id, 'down');
                                      }}
                                      className="p-0.5 rounded hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-500"
                                      title="Move Section Down"
                                    >
                                      <ArrowDown className="w-3 h-3" />
                                    </button>
                                  )}
                                  {/* Rename Section */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingSectionId(section.id);
                                      setEditingSectionName(section.name);
                                    }}
                                    className="p-0.5 rounded hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-500"
                                    title="Rename Section"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                  {/* Add Page in Section */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onCreatePage(notebook.id, section.id);
                                    }}
                                    className="p-0.5 rounded hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-500"
                                    title="New Page in Section"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                  {/* Delete Section */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (confirm(`Delete section "${section.name}"?`)) {
                                        onDeleteSection(section.id);
                                      }
                                    }}
                                    className="p-0.5 rounded hover:bg-red-100 text-red-500"
                                    title="Delete Section"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Pages inside Section */}
                            {isSecExpanded && (
                              <div className="ml-3 pl-2 border-l border-slate-200 dark:border-slate-800 space-y-0.5">
                                {section.pages
                                  .filter((p) => {
                                    if (selectedTag) {
                                      const pageTags = extractAllPageTags(p);
                                      if (!pageTags.includes(selectedTag.toLowerCase())) return false;
                                    }
                                    if (selectedCollectionId) {
                                      const col = workspace.collections?.find((c) => c.id === selectedCollectionId);
                                      if (col && !col.pageIds.includes(p.id)) return false;
                                    }
                                    if (searchQuery) {
                                      const q = searchQuery.toLowerCase();
                                      const titleMatch = p.title.toLowerCase().includes(q);
                                      const contentMatch = p.content.toLowerCase().includes(q);
                                      const tagMatch = extractAllPageTags(p).some((t) => t.includes(q));
                                      if (!titleMatch && !contentMatch && !tagMatch) return false;
                                    }
                                    return true;
                                  })
                                  .map((page, pageIdx, filteredList) => {
                                    const isPageActive = activePageId === page.id;

                                    return editingPageId === page.id ? (
                                      <div key={`edit-${page.id}`} className="p-1 bg-purple-50 dark:bg-slate-800 rounded flex items-center gap-1 my-0.5">
                                        <input
                                          type="text"
                                          value={editingPageTitle}
                                          onChange={(e) => setEditingPageTitle(e.target.value)}
                                          autoFocus
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                              if (editingPageTitle.trim()) onRenamePage?.(page.id, editingPageTitle.trim());
                                              setEditingPageId(null);
                                            } else if (e.key === 'Escape') {
                                              setEditingPageId(null);
                                            }
                                          }}
                                          className="flex-1 px-1.5 py-0.5 text-xs rounded bg-white dark:bg-slate-900 border border-purple-400 dark:border-purple-600 outline-none text-slate-800 dark:text-slate-100"
                                        />
                                        <button
                                          onClick={() => {
                                            if (editingPageTitle.trim()) onRenamePage?.(page.id, editingPageTitle.trim());
                                            setEditingPageId(null);
                                          }}
                                          className="p-0.5 text-emerald-600 hover:bg-emerald-100 rounded"
                                          title="Save"
                                        >
                                          <Check className="w-3 h-3" />
                                        </button>
                                        <button
                                          onClick={() => setEditingPageId(null)}
                                          className="p-0.5 text-slate-400 hover:bg-slate-200 rounded"
                                          title="Cancel"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      </div>
                                    ) : (
                                      <div
                                        key={page.id}
                                        onClick={() => onSelectPage(notebook.id, section.id, page.id)}
                                        className={`flex items-center justify-between px-2 py-1 rounded text-xs cursor-pointer group transition-all ${
                                          isPageActive
                                            ? 'bg-purple-600 text-white font-medium shadow-sm'
                                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
                                        }`}
                                      >
                                        <div className="flex items-center gap-1.5 truncate flex-1">
                                          <FileText className={`w-3.5 h-3.5 shrink-0 ${isPageActive ? 'text-white' : 'text-slate-400'}`} />
                                          <span className="truncate">{page.title}</span>
                                        </div>

                                        <div className="flex items-center gap-0.5">
                                          {/* Pin / Favorite Toggle Button */}
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              onToggleFavorite?.(page.id);
                                            }}
                                            className={`p-0.5 rounded transition-all ${
                                              page.favorite
                                                ? 'opacity-100'
                                                : 'opacity-0 group-hover:opacity-100'
                                            } ${isPageActive ? 'hover:bg-purple-700 text-white' : 'hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                                            title={page.favorite ? 'Unpin Note' : 'Pin Note (📌)'}
                                          >
                                            <Pin className={`w-3 h-3 ${page.favorite ? (isPageActive ? 'fill-white text-white' : 'fill-amber-400 text-amber-400') : 'text-slate-400'}`} />
                                          </button>

                                          {/* Move Page Up/Down */}
                                          {pageIdx > 0 && (
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                onReorderPages?.(section.id, page.id, 'up');
                                              }}
                                              className={`p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
                                                isPageActive ? 'hover:bg-purple-700 text-white' : 'hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-400'
                                              }`}
                                              title="Move Note Up"
                                            >
                                              <ArrowUp className="w-3 h-3" />
                                            </button>
                                          )}
                                          {pageIdx < filteredList.length - 1 && (
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                onReorderPages?.(section.id, page.id, 'down');
                                              }}
                                              className={`p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
                                                isPageActive ? 'hover:bg-purple-700 text-white' : 'hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-400'
                                              }`}
                                              title="Move Note Down"
                                            >
                                              <ArrowDown className="w-3 h-3" />
                                            </button>
                                          )}

                                          {/* Rename Page */}
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setEditingPageId(page.id);
                                              setEditingPageTitle(page.title);
                                            }}
                                            className={`p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
                                              isPageActive ? 'hover:bg-purple-700 text-white' : 'hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-400'
                                            }`}
                                            title="Rename Note"
                                          >
                                            <Edit2 className="w-3 h-3" />
                                          </button>

                                          {/* Delete Page */}
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (confirm(`Delete page "${page.title}"?`)) {
                                                onDeletePage(page.id);
                                              }
                                            }}
                                            className={`p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
                                              isPageActive ? 'hover:bg-purple-700 text-white' : 'hover:bg-red-100 text-red-500'
                                            }`}
                                            title="Delete Page"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Tags Explorer */}
        {allTags.length > 0 && (
          <div>
            <div className="flex items-center justify-between px-2.5 mb-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Tags & Topics
              </span>
              {selectedTag && (
                <button
                  onClick={() => onSelectTag(null)}
                  className="text-[10px] text-purple-600 hover:underline"
                >
                  Clear filter
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5 px-2">
              {allTags.map(([tag, count]) => {
                const isSelected = selectedTag === tag;
                return (
                  <button
                    key={tag}
                    onClick={() => onSelectTag(isSelected ? null : tag)}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors ${
                      isSelected
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-700'
                    }`}
                  >
                    <Hash className="w-2.5 h-2.5 opacity-60" />
                    <span>{tag}</span>
                    <span className="text-[9px] opacity-75 font-mono">({count})</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* New Notebook Modal Dialog */}
      {isNewNotebookOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-3">
              Create New Knowledge Notebook
            </h3>
            <form onSubmit={handleCreateNotebookSubmit} className="space-y-3">
              <div>
                <label className="text-xs text-slate-500 font-medium block mb-1">Notebook Name</label>
                <input
                  type="text"
                  placeholder="e.g. Distributed Systems, SAP, Books"
                  value={newNotebookName}
                  onChange={(e) => setNewNotebookName(e.target.value)}
                  autoFocus
                  required
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs text-slate-500 font-medium block mb-1">Icon</label>
                  <input
                    type="text"
                    value={newNotebookIcon}
                    onChange={(e) => setNewNotebookIcon(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-center"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-slate-500 font-medium block mb-1">Color Theme</label>
                  <input
                    type="color"
                    value={newNotebookColor}
                    onChange={(e) => setNewNotebookColor(e.target.value)}
                    className="w-full h-8 rounded-lg cursor-pointer bg-transparent border-0"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewNotebookOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow-sm"
                >
                  Create Notebook
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </aside>
  );
};
