import React from 'react';
import {
  CanvasSettings,
  CanvasBackgroundPreset,
  EdgeRoutingStyle,
  LayoutDensity,
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
  Spline,
  CornerDownRight,
  Minus,
  Shield,
  Layers,
  Minimize2,
  Maximize2,
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

const ROUTING_OPTIONS: {
  id: EdgeRoutingStyle;
  label: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'curved', label: 'Curved (Flow)', desc: 'Organic smooth bezier spline', icon: Spline },
  { id: 'smoothstep', label: 'Smooth Step', desc: 'Modern rounded corners', icon: CornerDownRight },
  { id: 'straight', label: 'Straight Line', desc: 'Crisp direct connection', icon: Minus },
  { id: 'step', label: 'Right Angle', desc: 'Sharp orthogonal steps', icon: CornerDownRight },
];

const DENSITY_OPTIONS: {
  id: LayoutDensity;
  label: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'compact', label: 'Compact', desc: 'High density, minimal whitespace', icon: Minimize2 },
  { id: 'balanced', label: 'Balanced', desc: 'Standard comfortable spacing', icon: Layers },
  { id: 'spacious', label: 'Spacious', desc: 'Airy presentation layout', icon: Maximize2 },
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
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-xl p-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Canvas & Diagram Customization
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Customize routing lines, spacing density, collision avoidance, and canvas mood
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

        <div className="py-4 space-y-6">
          {/* 1. Connection Lines & Dynamic Routing */}
          <div>
            <label className="block text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Spline className="w-3.5 h-3.5 text-blue-500" />
              Connection Line Routing Style
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {ROUTING_OPTIONS.map((opt) => {
                const isSelected = (settings.edgeRoutingStyle || 'curved') === opt.id;
                const Icon = opt.icon;

                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onUpdateSettings({ edgeRoutingStyle: opt.id })}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/20 shadow-xs font-semibold'
                        : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750'
                    }`}
                  >
                    <Icon className="w-4 h-4 mb-1 text-indigo-500" />
                    <span className="text-xs font-bold">{opt.label}</span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 leading-tight">
                      {opt.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Layout Spacing Density */}
          <div>
            <label className="block text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Minimize2 className="w-3.5 h-3.5 text-emerald-500" />
              Layout Spacing Density
            </label>
            <div className="grid grid-cols-3 gap-2">
              {DENSITY_OPTIONS.map((opt) => {
                const isSelected = (settings.layoutDensity || 'compact') === opt.id;
                const Icon = opt.icon;

                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onUpdateSettings({ layoutDensity: opt.id })}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20 shadow-xs font-semibold'
                        : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750'
                    }`}
                  >
                    <Icon className="w-4 h-4 mb-1 text-emerald-500" />
                    <span className="text-xs font-bold">{opt.label}</span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 leading-tight">
                      {opt.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Smart Collision Avoidance */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/60 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Smart Collision Avoidance
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Prevents elements from overlapping by auto-nudging when moved
                  </div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.collisionAvoidance}
                onChange={(e) => onUpdateSettings({ collisionAvoidance: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
              />
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 italic bg-white/70 dark:bg-slate-800/70 p-2 rounded-lg border border-slate-200/50 dark:border-slate-700/50">
              💡 <strong>Manual Override:</strong> You can always hold the <kbd className="px-1.5 py-0.5 font-mono text-[10px] bg-slate-200 dark:bg-slate-700 rounded font-bold">Alt</kbd> key while dragging to intentionally overlap elements regardless of this setting.
            </p>
          </div>

          {/* 4. Background Color Moods */}
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

          {/* 5. Grid Style Pattern */}
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

          {/* 6. Grid Snap */}
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
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl hover:opacity-90 transition-opacity cursor-pointer"
          >
            Apply & Done
          </button>
        </div>
      </div>
    </div>
  );
};
