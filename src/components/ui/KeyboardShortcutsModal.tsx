import React from 'react';
import { Keyboard, X, Sparkles } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUT_GROUPS = [
  {
    category: 'Node Creation & Thought Flow',
    items: [
      { key: 'Tab', desc: 'Add Child node and start editing immediately' },
      { key: 'Enter', desc: 'Add Sibling node (same parent) and start editing' },
      { key: 'Space or F2', desc: 'Edit text of currently selected node' },
      { key: 'Enter (while editing)', desc: 'Commit edit and create next sibling' },
      { key: 'Tab (while editing)', desc: 'Commit edit and create child node' },
      { key: 'Escape', desc: 'Exit editing mode without adding new node' },
    ],
  },
  {
    category: 'Spatial & Tree Navigation',
    items: [
      { key: '↑ (Arrow Up)', desc: 'Navigate to previous sibling or upper node' },
      { key: '↓ (Arrow Down)', desc: 'Navigate to next sibling or lower node' },
      { key: '→ (Arrow Right)', desc: 'Navigate to first child or right node' },
      { key: '← (Arrow Left)', desc: 'Navigate to parent or left node' },
    ],
  },
  {
    category: 'Large-Scale Graph & Presentation Navigation',
    items: [
      { key: 'Ctrl + K (or Cmd + K)', desc: 'Fuzzy Search Command Palette to find and fly to any node' },
      { key: 'f', desc: 'Toggle Subtree Spotlight Focus (dim unrelated branches)' },
      { key: 'Shift + F', desc: 'Fit full whiteboard in view' },
      { key: 'F5 or p', desc: 'Start Step-by-Step Presentation Tour mode' },
      { key: 'o', desc: 'Toggle Outline & Branch Tree Navigator' },
      { key: 'Space / → (in tour)', desc: 'Advance to next slide / topic in presentation' },
      { key: '← (in tour)', desc: 'Go back to previous slide in presentation' },
    ],
  },
  {
    category: 'Node Actions & Whiteboard Operations',
    items: [
      { key: 'Delete / Backspace', desc: 'Delete node and select its direct parent' },
      { key: 'c or /', desc: 'Collapse / Expand subtree of selected node' },
      { key: 'Ctrl + S', desc: 'Silent Save to file (retains handle)' },
      { key: 'Ctrl + Shift + S', desc: 'Save As new diagram file' },
      { key: 'Ctrl + O', desc: 'Open diagram file from disk' },
      { key: '?', desc: 'Toggle this Keyboard Shortcuts guide' },
    ],
  },
];

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400">
              <Keyboard className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                Keyboard-First Mind Mapping
                <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-semibold">
                  Zero-Mouse Workflow
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Capture thoughts at the speed of thought without touching the mouse
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-2xl font-bold p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Shortcut Groups */}
        <div className="p-6 overflow-y-auto space-y-6">
          {SHORTCUT_GROUPS.map((group, gIdx) => (
            <div key={gIdx}>
              <h4 className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-3 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                {group.category}
              </h4>
              <div className="grid grid-cols-1 gap-2">
                {group.items.map((item, iIdx) => (
                  <div
                    key={iIdx}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-750 border border-slate-100 dark:border-slate-700"
                  >
                    <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                      {item.desc}
                    </span>
                    <kbd className="px-2.5 py-1 text-xs font-mono font-semibold bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg border border-slate-300 dark:border-slate-600 shadow-2xs whitespace-nowrap">
                      {item.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-850/50">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Tip: Press <kbd className="px-1.5 py-0.5 font-mono text-[11px] bg-slate-200 dark:bg-slate-700 rounded">?</kbd> at any time to open this cheat sheet.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
