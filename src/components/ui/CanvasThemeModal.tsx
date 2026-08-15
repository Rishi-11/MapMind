import React from 'react';
import {
  CanvasSettings,
  CanvasBackgroundPreset,
} from '@/types/graph';
import { CANVAS_BACKGROUND_PRESETS } from '@/lib/canvasThemes';
import {
  Palette,
  Grid,
  Sparkles,
  X,
  Check,
  CircleDot,
  Hash,
  Square,
  EyeOff,
  Sun,
  Moon,
} from 'lucide-react';

interface CanvasThemeModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: CanvasSettings;
  onUpdateSettings: (updates: Partial<CanvasSettings>) => void;
}

const GRID_OPTIONS: {
  id: CanvasSettings['gridType'];
  label: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'dots', label: 'Dots Matrix', desc: 'Subtle clean dots', icon: CircleDot },
  { id: 'cross', label: 'Crosshair', desc: 'Architectural crosses', icon: Hash },
  { id: 'lines', label: 'Grid Lines', desc: 'Notebook grid lines', icon: Square },
  { id: 'none', label: 'Blank Canvas', desc: 'Distraction-free blank', icon: EyeOff },
];

export const CanvasThemeModal: React.FC<CanvasThemeModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}) => {
  if (!isOpen) return null;

  const isDark = settings.theme === 'dark';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Canvas Background & Mood
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Customize canvas paper tones, reading contrast, and grid patterns
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

        <div className="py-4 space-y-5">
          {/* 1. Background Color Moods */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Color Tone & Atmosphere
              </label>
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700 p-0.5 rounded-lg text-[11px] font-medium">
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ theme: 'light' })}
                  className={`px-2 py-0.5 rounded-md flex items-center gap-1 transition-colors ${
                    !isDark ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  <Sun className="w-3 h-3 text-amber-500" /> Light
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ theme: 'dark' })}
                  className={`px-2 py-0.5 rounded-md flex items-center gap-1 transition-colors ${
                    isDark ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-500'
                  }`}
                >
                  <Moon className="w-3 h-3 text-indigo-400" /> Dark
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {Object.values(CANVAS_BACKGROUND_PRESETS).map((preset) => {
                const isSelected = settings.backgroundPreset === preset.id;
                const tone = isDark ? preset.dark : preset.light;

                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() =>
                      onUpdateSettings({ backgroundPreset: preset.id as CanvasBackgroundPreset })
                    }
                    className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/40 dark:bg-blue-950/40 shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-7 h-7 rounded-lg border shadow-2xs shrink-0 flex items-center justify-center"
                        style={{ backgroundColor: tone.bg, borderColor: tone.gridColor }}
                      >
                        <div
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: tone.gridColor }}
                        />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                          {preset.name}
                          {preset.id === 'warm' && (
                            <span className="text-[9px] font-semibold uppercase px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200">
                              Warm
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                          {preset.desc}
                        </p>
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Grid Style Pattern */}
          <div>
            <label className="block text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Grid className="w-3.5 h-3.5 text-blue-500" />
              Grid Pattern
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {GRID_OPTIONS.map((grid) => {
                const isSelected = settings.gridType === grid.id;
                const Icon = grid.icon;

                return (
                  <button
                    key={grid.id}
                    type="button"
                    onClick={() => onUpdateSettings({ gridType: grid.id })}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500 shadow-xs font-semibold'
                        : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750'
                    }`}
                  >
                    <Icon className="w-4 h-4 mb-1" />
                    <span className="text-xs">{grid.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Grid Snap & Density */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/60 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Snap to Grid
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Align nodes cleanly during drag and drop
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.gridSnap}
                onChange={(e) => onUpdateSettings({ gridSnap: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
              />
            </div>

            {settings.gridType !== 'none' && (
              <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-4">
                <div className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Grid Spacing
                </div>
                <div className="flex items-center gap-1.5">
                  {[15, 20, 25, 30].map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => onUpdateSettings({ gridSize: size })}
                      className={`text-xs px-2.5 py-1 rounded-lg font-medium border transition-colors ${
                        settings.gridSize === size
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {size}px
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl hover:opacity-90 transition-opacity"
          >
            Apply & Done
          </button>
        </div>
      </div>
    </div>
  );
};
