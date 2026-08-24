import React, { useState, useEffect, useRef } from 'react';
import { Tag, X, Plus, Sparkles, Check, Hash } from 'lucide-react';
import { MapMindNode } from '../../types/graph';

interface QuickTagModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedNode: MapMindNode | null;
  onUpdateTags: (nodeId: string, tags: string[]) => void;
}

const PRESET_TAGS = [
  { name: 'Urgent', color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-800' },
  { name: 'In Progress', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800' },
  { name: 'Done', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' },
  { name: 'Review', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200 dark:border-purple-800' },
  { name: 'Idea', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800' },
  { name: 'Draft', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700' },
  { name: 'Bug', color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 border-rose-200 dark:border-rose-800' },
  { name: 'Feature', color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300 border-teal-200 dark:border-teal-800' },
  { name: 'MVP', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800' },
  { name: 'High Priority', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 border-orange-200 dark:border-orange-800' },
];

export const QuickTagModal: React.FC<QuickTagModalProps> = ({
  isOpen,
  onClose,
  selectedNode,
  onUpdateTags,
}) => {
  const [tagInput, setTagInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const currentTags = selectedNode?.data?.tags || [];

  useEffect(() => {
    if (isOpen) {
      setTagInput('');
      const timer = setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen || !selectedNode) return null;

  const handleAddTag = (tagName: string) => {
    const trimmed = tagName.trim();
    if (!trimmed) return;
    if (currentTags.includes(trimmed)) {
      setTagInput('');
      return;
    }
    const updated = [...currentTags, trimmed];
    onUpdateTags(selectedNode.id, updated);
    setTagInput('');
  };

  const handleRemoveTag = (indexToRemove: number) => {
    const updated = currentTags.filter((_, i) => i !== indexToRemove);
    onUpdateTags(selectedNode.id, updated);
  };

  const handleTogglePreset = (presetName: string) => {
    if (currentTags.includes(presetName)) {
      const updated = currentTags.filter((t) => t !== presetName);
      onUpdateTags(selectedNode.id, updated);
    } else {
      const updated = [...currentTags, presetName];
      onUpdateTags(selectedNode.id, updated);
    }
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      if (tagInput.trim()) {
        handleAddTag(tagInput);
      } else {
        onClose();
      }
    } else if (e.key === 'Backspace' && !tagInput && currentTags.length > 0) {
      e.preventDefault();
      handleRemoveTag(currentTags.length - 1);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                Manage Tags
                <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                  Shortcut 't' or '#'
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[240px]">
                Node: {selectedNode.data?.label || selectedNode.data?.title || 'Untitled'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Input field */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Hash className="w-4 h-4" />
            </div>
            <input
              ref={inputRef}
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type tag name and press Enter..."
              className="w-full pl-9 pr-20 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all font-medium"
            />
            {tagInput.trim() && (
              <button
                type="button"
                onClick={() => handleAddTag(tagInput)}
                className="absolute inset-y-1 right-1 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            )}
          </div>

          {/* Current tags on node */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Current Node Tags ({currentTags.length})
            </label>
            {currentTags.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-1">No tags assigned yet.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                {currentTags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/70 dark:border-blue-900/60 font-semibold animate-in fade-in scale-95 duration-100"
                  >
                    <Tag className="w-3 h-3 opacity-60" />
                    <span>{tag}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(idx)}
                      className="hover:text-red-500 p-0.5 rounded transition-colors"
                      title="Remove tag"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Quick Preset Tags */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" />
              Quick Suggestions
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_TAGS.map((preset) => {
                const isActive = currentTags.includes(preset.name);
                return (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => handleTogglePreset(preset.name)}
                    className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-lg border font-medium transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : `${preset.color} hover:opacity-80`
                    }`}
                  >
                    {isActive ? (
                      <Check className="w-3 h-3" />
                    ) : (
                      <Plus className="w-2.5 h-2.5 opacity-60" />
                    )}
                    {preset.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-[11px] text-slate-500 dark:text-slate-400">
          <span>Press <kbd className="font-mono bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-[10px]">Enter</kbd> to add • <kbd className="font-mono bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-[10px]">Esc</kbd> to close</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
