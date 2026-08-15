import React, { useState } from 'react';
import { HistorySnapshot } from '@/types/history';
import {
  History,
  RotateCcw,
  Trash2,
  Clock,
  Calendar,
  Layers,
  Sparkles,
  Search,
  AlertTriangle,
} from 'lucide-react';

interface TimeMachineModalProps {
  isOpen: boolean;
  onClose: () => void;
  snapshots: HistorySnapshot[];
  onRestore: (snapshot: HistorySnapshot) => void;
  onDeleteSnapshot: (id: string) => void;
  onClearHistory: () => void;
  secondsUntilNextSave: number;
}

export const TimeMachineModal: React.FC<TimeMachineModalProps> = ({
  isOpen,
  onClose,
  snapshots,
  onRestore,
  onDeleteSnapshot,
  onClearHistory,
  secondsUntilNextSave,
}) => {
  const [selectedSnapshot, setSelectedSnapshot] = useState<HistorySnapshot | null>(
    snapshots.length > 0 ? snapshots[0] : null
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  if (!isOpen) return null;

  const filteredSnapshots = snapshots.filter((snap) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      snap.name.toLowerCase().includes(q) ||
      snap.formattedTime.toLowerCase().includes(q) ||
      snap.trigger.toLowerCase().includes(q)
    );
  });

  const minutesUntilNext = Math.floor(secondsUntilNextSave / 60);
  const secondsRemain = secondsUntilNextSave % 60;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400">
              <History className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                Time Machine Revisions
                <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                  {snapshots.length} Snapshots in IndexedDB
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Next automatic snapshot in: <strong className="text-blue-600 dark:text-blue-400 font-mono">{minutesUntilNext}m {secondsRemain}s</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-2xl font-bold p-1"
          >
            &times;
          </button>
        </div>

        {/* Content Body (2 Columns: Timeline List & Preview Panel) */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden min-h-[400px]">
          {/* Left Column: Timeline List (5 cols) */}
          <div className="md:col-span-5 border-r border-slate-100 dark:border-slate-700 flex flex-col overflow-hidden bg-slate-50/50 dark:bg-slate-850/50">
            {/* Search filter */}
            <div className="p-3 border-b border-slate-100 dark:border-slate-700">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter snapshots..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {filteredSnapshots.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  No snapshots match your query.
                </div>
              ) : (
                filteredSnapshots.map((snap) => {
                  const isSelected = selectedSnapshot?.id === snap.id;
                  const date = new Date(snap.timestamp);
                  return (
                    <button
                      key={snap.id}
                      onClick={() => setSelectedSnapshot(snap)}
                      className={`w-full text-left p-3 rounded-xl border transition-all flex items-start justify-between gap-2 ${
                        isSelected
                          ? 'bg-blue-50/80 dark:bg-blue-950/50 border-blue-400 dark:border-blue-700 shadow-xs'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              snap.trigger === 'auto-save'
                                ? 'bg-blue-500'
                                : snap.trigger === 'manual-save'
                                ? 'bg-emerald-500'
                                : 'bg-purple-500'
                            }`}
                          />
                          <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                            {snap.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {snap.formattedTime}
                          </span>
                          <span className="flex items-center gap-1">
                            <Layers className="w-3 h-3" />
                            {snap.nodeCount} nodes
                          </span>
                        </div>
                      </div>

                      <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 shrink-0">
                        {date.toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Snapshot Detail & Restore (7 cols) */}
          <div className="md:col-span-7 p-6 flex flex-col justify-between overflow-y-auto">
            {selectedSnapshot ? (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase text-blue-600 dark:text-blue-400 tracking-wider">
                    <Sparkles className="w-3.5 h-3.5" />
                    Snapshot Details
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                    {selectedSnapshot.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(selectedSnapshot.timestamp).toLocaleString()}
                  </p>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700">
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">Total Nodes</div>
                    <div className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                      {selectedSnapshot.nodeCount}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700">
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">Total Edges</div>
                    <div className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                      {selectedSnapshot.edgeCount}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700">
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">Trigger Type</div>
                    <div className="text-xs font-bold uppercase text-slate-900 dark:text-slate-100 mt-1">
                      {selectedSnapshot.trigger}
                    </div>
                  </div>
                </div>

                {/* Nodes Overview Sample */}
                <div>
                  <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Nodes in this revision:
                  </h4>
                  <div className="max-h-40 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-slate-50/50 dark:bg-slate-850/50 flex flex-wrap gap-1.5">
                    {selectedSnapshot.state.nodes.map((node) => (
                      <span
                        key={node.id}
                        className="text-xs px-2 py-1 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                      >
                        {node.data?.label || 'Node'}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Restore & Delete Actions */}
                <div className="flex items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                  <button
                    onClick={() => {
                      onRestore(selectedSnapshot);
                      onClose();
                    }}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Restore This Revision
                  </button>
                  <button
                    onClick={() => {
                      onDeleteSnapshot(selectedSnapshot.id);
                      setSelectedSnapshot(snapshots[0] || null);
                    }}
                    className="p-2.5 rounded-xl border border-red-200 dark:border-red-900/50 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors"
                    title="Delete snapshot"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                Select a snapshot to preview
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50/50 dark:bg-slate-850/50">
          <div>
            {showClearConfirm ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-600 font-medium flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Clear all history?
                </span>
                <button
                  onClick={() => {
                    onClearHistory();
                    setShowClearConfirm(false);
                  }}
                  className="px-2 py-1 text-xs bg-red-600 text-white rounded font-medium"
                >
                  Yes, Clear
                </button>
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="px-2 py-1 text-xs bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded font-medium"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowClearConfirm(true)}
                disabled={snapshots.length === 0}
                className="text-xs text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 flex items-center gap-1 transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear All Revisions
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
