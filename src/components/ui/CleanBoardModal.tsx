import React from 'react';
import { Eraser, Trash2, History, X, Sparkles, ShieldCheck } from 'lucide-react';

interface CleanBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmClean: (mode: 'fresh-root' | 'empty') => void;
  nodeCount: number;
}

export const CleanBoardModal: React.FC<CleanBoardModalProps> = ({
  isOpen,
  onClose,
  onConfirmClean,
  nodeCount,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-md p-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
              <Eraser className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Clean Whiteboard
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Clear {nodeCount} {nodeCount === 1 ? 'node' : 'nodes'} and reset canvas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Safety Note */}
        <div className="my-4 p-3 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-xs text-emerald-900 dark:text-emerald-200 leading-relaxed">
            <span className="font-semibold">Automatic Recovery Backup:</span> MapMind will automatically save a recovery snapshot to your <span className="font-semibold">Time Machine</span> before clearing. You can undo or restore anytime.
          </div>
        </div>

        {/* Cleaning Choices */}
        <div className="space-y-2.5 my-4">
          {/* Option 1: Clean Slate with Root */}
          <button
            type="button"
            onClick={() => {
              onConfirmClean('fresh-root');
              onClose();
            }}
            className="w-full flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50/30 dark:hover:bg-blue-950/30 transition-all text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  Clean Slate (New Central Topic)
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Clears all branches and starts fresh with a single central root
                </div>
              </div>
            </div>
          </button>

          {/* Option 2: Completely Blank Canvas */}
          <button
            type="button"
            onClick={() => {
              onConfirmClean('empty');
              onClose();
            }}
            className="w-full flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-rose-500 dark:hover:border-rose-500 hover:bg-rose-50/30 dark:hover:bg-rose-950/30 transition-all text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400">
                <Trash2 className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                  Completely Blank Canvas
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Wipes the entire canvas blank (0 nodes)
                </div>
              </div>
            </div>
          </button>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <History className="w-3.5 h-3.5" />
            <span>Time Machine protected</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
