import React, { useState, useMemo } from 'react';
import {
  CheckSquare,
  Search,
  Clock,
  ArrowUpRight,
} from 'lucide-react';
import { Page, MarkdownTask } from '@/types/notebook';
import { extractMarkdownTasks, toggleMarkdownTask, appendTaskToPage } from '@/lib/notebook/links';
import { Plus } from 'lucide-react';

interface TasksViewProps {
  allPages: Page[];
  notebookMap: Map<string, string>;
  sectionMap: Map<string, string>;
  onUpdateContent: (pageId: string, content: string) => void;
  onSelectPage: (pageId: string) => void;
}

type TaskFilter = 'all' | 'pending' | 'completed';

export const TasksView: React.FC<TasksViewProps> = ({
  allPages,
  notebookMap,
  sectionMap,
  onUpdateContent,
  onSelectPage,
}) => {
  const [filter, setFilter] = useState<TaskFilter>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNotebook, setSelectedNotebook] = useState('all');

  // Quick Task Creation State
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskPageId, setNewTaskPageId] = useState<string>(allPages[0]?.id || '');
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high' | undefined>(undefined);
  const [newTaskDueDate, setNewTaskDueDate] = useState('');

  // Keep target page valid when pages update
  React.useEffect(() => {
    if (!allPages.some((p) => p.id === newTaskPageId) && allPages.length > 0) {
      setNewTaskPageId(allPages[0].id);
    }
  }, [allPages, newTaskPageId]);

  // Extract all tasks across all pages
  const allTasks = useMemo(() => {
    return extractMarkdownTasks(allPages, notebookMap, sectionMap);
  }, [allPages, notebookMap, sectionMap]);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return allTasks.filter((t) => {
      if (filter === 'pending' && t.completed) return false;
      if (filter === 'completed' && !t.completed) return false;
      if (selectedNotebook !== 'all' && t.notebookName !== selectedNotebook) return false;
      if (searchQuery && !t.text.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [allTasks, filter, selectedNotebook, searchQuery]);

  const stats = useMemo(() => {
    const total = allTasks.length;
    const completed = allTasks.filter((t) => t.completed).length;
    const pending = total - completed;
    return { total, completed, pending };
  }, [allTasks]);

  const handleToggleTask = (task: MarkdownTask) => {
    const targetPage = allPages.find((p) => p.id === task.pageId);
    if (!targetPage) return;

    const newContent = toggleMarkdownTask(targetPage.content, task.lineIndex);
    onUpdateContent(targetPage.id, newContent);
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;

    const targetPage = allPages.find((p) => p.id === newTaskPageId) || allPages[0];
    if (!targetPage) return;

    const updated = appendTaskToPage(
      targetPage.content,
      newTaskText.trim(),
      newTaskPriority,
      newTaskDueDate || undefined
    );
    onUpdateContent(targetPage.id, updated);
    setNewTaskText('');
    setNewTaskDueDate('');
    setNewTaskPriority(undefined);
  };

  const notebookNames = useMemo(() => {
    return Array.from(new Set(allTasks.map((t) => t.notebookName)));
  }, [allTasks]);

  return (
    <div className="flex-1 h-full flex flex-col bg-slate-50 dark:bg-slate-950 overflow-y-auto custom-scrollbar select-none">
      {/* Top Header */}
      <div className="h-14 border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between bg-white dark:bg-slate-900 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
            <CheckSquare className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              Vault Tasks & Action Items
            </h1>
            <p className="text-[11px] text-slate-400">
              Aggregated and synchronized across your local markdown notes
            </p>
          </div>
        </div>

        {/* Task Counts Summary */}
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300">
            {stats.completed} Done
          </span>
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300">
            {stats.pending} Pending
          </span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md flex flex-wrap items-center justify-between gap-3">
        {/* Status Filters */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setFilter('pending')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              filter === 'pending'
                ? 'bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-300 shadow-xs'
                : 'text-slate-500'
            }`}
          >
            Pending ({stats.pending})
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              filter === 'completed'
                ? 'bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-300 shadow-xs'
                : 'text-slate-500'
            }`}
          >
            Completed ({stats.completed})
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              filter === 'all'
                ? 'bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-300 shadow-xs'
                : 'text-slate-500'
            }`}
          >
            All ({stats.total})
          </button>
        </div>

        {/* Search & Notebook Filter */}
        <div className="flex items-center gap-2 flex-1 max-w-md justify-end">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none"
            />
          </div>

          <select
            value={selectedNotebook}
            onChange={(e) => setSelectedNotebook(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="all">All Notebooks</option>
            {notebookNames.map((nb) => (
              <option key={nb} value={nb}>{nb}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Task List & Add Bar */}
      <div className="p-6 max-w-4xl mx-auto w-full space-y-4">
        {/* Quick Add Task Input Box */}
        <form
          onSubmit={handleCreateTask}
          className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3 shadow-xs space-y-2.5"
        >
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Add a new action item (e.g. Finish graph layout algorithm)..."
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              className="flex-1 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
            <button
              type="submit"
              disabled={!newTaskText.trim()}
              className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Task</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400 font-medium">Save into Note:</span>
              <select
                value={newTaskPageId}
                onChange={(e) => setNewTaskPageId(e.target.value)}
                className="px-2 py-1 text-xs rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 focus:outline-none"
              >
                {allPages.map((p) => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              {/* Priority Selector */}
              <div className="flex items-center gap-1">
                {(['high', 'medium', 'low'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setNewTaskPriority(newTaskPriority === p ? undefined : p)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold capitalize transition-colors ${
                      newTaskPriority === p
                        ? p === 'high'
                          ? 'bg-red-500 text-white'
                          : p === 'medium'
                          ? 'bg-amber-500 text-white'
                          : 'bg-blue-500 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {p === 'high' ? '🔺 High' : p === 'medium' ? '🟡 Med' : 'Low'}
                  </button>
                ))}
              </div>

              {/* Due date input */}
              <input
                type="date"
                value={newTaskDueDate}
                onChange={(e) => setNewTaskDueDate(e.target.value)}
                className="px-2 py-0.5 text-[11px] rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
              />
            </div>
          </div>
        </form>
        {filteredTasks.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <CheckSquare className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
            <p className="text-xs text-slate-500">No tasks found matching current filter.</p>
          </div>
        ) : (
          filteredTasks.map((task) => (
            <div
              key={task.id}
              className={`p-3.5 rounded-2xl border transition-all flex items-start justify-between gap-3 group ${
                task.completed
                  ? 'bg-slate-100/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 text-slate-400'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-purple-300 text-slate-800 dark:text-slate-200 shadow-xs'
              }`}
            >
              <div className="flex items-start gap-3 flex-1">
                <input
                  type="checkbox"
                  checked={task.completed}
                  onChange={() => handleToggleTask(task)}
                  className="mt-0.5 w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                />
                <div className="space-y-1">
                  <p className={`text-xs font-medium leading-relaxed ${task.completed ? 'line-through text-slate-400 dark:text-slate-500' : ''}`}>
                    {task.text}
                  </p>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400">
                    <span>{task.notebookName}</span>
                    <span>•</span>
                    <span>{task.sectionName}</span>
                    {task.dueDate && (
                      <>
                        <span>•</span>
                        <span className="text-blue-500 font-medium flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5" /> Due: {task.dueDate}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => onSelectPage(task.pageId)}
                className="px-2 py-1 text-[11px] font-semibold text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/50 rounded-lg flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <span>{task.pageTitle}</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
