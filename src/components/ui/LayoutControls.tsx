import React from 'react';
import { LayoutDirection } from '@/types/graph';
import { GitFork, Split, Network } from 'lucide-react';

interface LayoutControlsProps {
  onApplyLayout: (layoutType: LayoutDirection) => void;
  isLayouting?: boolean;
}

export const LayoutControls: React.FC<LayoutControlsProps> = ({
  onApplyLayout,
  isLayouting = false,
}) => {
  return (
    <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
      <button
        onClick={() => onApplyLayout('BALANCED_MINDMAP')}
        disabled={isLayouting}
        title="Balanced Mind Map (ELK Engine) - Centers root with even left/right branches"
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
      >
        <Network className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
        <span>Balanced Map</span>
      </button>

      <button
        onClick={() => onApplyLayout('TB')}
        disabled={isLayouting}
        title="Top-Down Hierarchy (Dagre Engine)"
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
      >
        <GitFork className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 rotate-180" />
        <span>Top-Down</span>
      </button>

      <button
        onClick={() => onApplyLayout('LR')}
        disabled={isLayouting}
        title="Left-to-Right Flow (Dagre Engine)"
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
      >
        <Split className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 rotate-90" />
        <span>Left-Right</span>
      </button>
    </div>
  );
};
