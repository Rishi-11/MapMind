import React from 'react';
import { AlertTriangle, Laptop, Cloud, Copy, Check, X } from 'lucide-react';
import { ConflictRecord } from '@/types/auth';

interface ConflictResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  conflicts: ConflictRecord[];
  onResolveKeepLocal: (conflict: ConflictRecord) => void;
  onResolveKeepCloud: (conflict: ConflictRecord) => void;
  onResolveDuplicateBoth: (conflict: ConflictRecord) => void;
}

export const ConflictResolutionModal: React.FC<ConflictResolutionModalProps> = ({
  isOpen,
  onClose,
  conflicts,
  onResolveKeepLocal,
  onResolveKeepCloud,
  onResolveDuplicateBoth,
}) => {
  if (!isOpen || conflicts.length === 0) return null;

  const current = conflicts[0];
  const localPage = current.localContent;
  const cloudPage = current.cloudContent;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-amber-50/70 dark:bg-amber-950/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
                Multi-Device Synchronization Conflict ({conflicts.length})
              </h2>
              <p className="text-xs text-amber-800 dark:text-amber-300 font-medium">
                Changes were made on another device while this note was modified locally.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content: Side by Side Diff */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-4">
          <div className="text-xs text-slate-600 dark:text-slate-400">
            <strong>Target Note:</strong> {localPage?.title || cloudPage?.title || current.objectId}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left: Local Version */}
            <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/30 dark:bg-blue-950/20 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                    <Laptop className="w-3.5 h-3.5" />
                    <span>My Local Version (v{current.localVersion})</span>
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(current.localTimestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-700 dark:text-slate-300 max-h-56 overflow-y-auto custom-scrollbar whitespace-pre-wrap">
                  {localPage?.content || '(No content)'}
                </div>
              </div>

              <button
                onClick={() => onResolveKeepLocal(current)}
                className="mt-4 w-full py-2 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Keep My Local Version</span>
              </button>
            </div>

            {/* Right: Cloud Version */}
            <div className="p-4 rounded-xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/30 dark:bg-purple-950/20 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                    <Cloud className="w-3.5 h-3.5" />
                    <span>Cloud Version (v{current.cloudVersion})</span>
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(current.cloudTimestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-700 dark:text-slate-300 max-h-56 overflow-y-auto custom-scrollbar whitespace-pre-wrap">
                  {cloudPage?.content || '(No content)'}
                </div>
              </div>

              <button
                onClick={() => onResolveKeepCloud(current)}
                className="mt-4 w-full py-2 rounded-lg text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Keep Cloud Version</span>
              </button>
            </div>
          </div>

          {/* Safe Duplicate Option */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between">
            <div className="text-xs text-slate-600 dark:text-slate-300">
              <span className="font-bold">Not sure which one to keep?</span> Keep both versions side-by-side.
            </div>
            <button
              onClick={() => onResolveDuplicateBoth(current)}
              className="px-4 py-2 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Keep Both (Duplicate)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
