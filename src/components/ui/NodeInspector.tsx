import React, { useState, useEffect } from 'react';
import { MapMindNode, NodeColorTheme, NodeShape, NodeCardStyle } from '@/types/graph';
import {
  Tag,
  Trash2,
  Sparkles,
  Plus,
  X,
  Palette,
  Square,
  Circle,
  Diamond,
  Layers,
  Sparkle,
  GlassWater,
  Feather,
  LayoutTemplate,
  Bookmark,
  Shapes,
} from 'lucide-react';

interface NodeInspectorProps {
  selectedNode: MapMindNode | null;
  onUpdateNode: (nodeId: string, updates: Partial<MapMindNode['data']>) => void;
  onDeleteNode: (nodeId: string) => void;
  onClose: () => void;
}

const COLOR_OPTIONS: { key: NodeColorTheme; label: string; bg: string }[] = [
  { key: 'slate', label: 'Neutral Slate', bg: 'bg-slate-500' },
  { key: 'blue', label: 'Sky Blue', bg: 'bg-blue-500' },
  { key: 'emerald', label: 'Mint Emerald', bg: 'bg-emerald-500' },
  { key: 'amber', label: 'Warm Amber', bg: 'bg-amber-500' },
  { key: 'rose', label: 'Rose Pink', bg: 'bg-rose-500' },
  { key: 'purple', label: 'Royal Purple', bg: 'bg-purple-500' },
  { key: 'cyan', label: 'Teal Cyan', bg: 'bg-cyan-500' },
];

const CARD_STYLE_PRESETS: {
  id: NodeCardStyle;
  label: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  badge: string;
}[] = [
  {
    id: 'default',
    label: 'Standard',
    desc: 'Clean rounded surface',
    icon: Layers,
    badge: 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300',
  },
  {
    id: 'bold',
    label: 'Neo-Brutalist',
    desc: 'Thick outline & hard shadow',
    icon: Sparkles,
    badge: 'bg-slate-900 text-white font-bold',
  },
  {
    id: 'classy',
    label: 'Frosted Glass',
    desc: 'Translucent glassmorphism',
    icon: GlassWater,
    badge: 'bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300',
  },
  {
    id: 'minimal',
    label: 'Minimalist',
    desc: 'Ultra-clean distraction-free',
    icon: Feather,
    badge: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
  },
  {
    id: 'gradient',
    label: 'Aesthetic Glow',
    desc: 'Ambient color glow & wash',
    icon: Sparkle,
    badge: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium',
  },
  {
    id: 'notion',
    label: 'Notion Clean',
    desc: 'Structured doc surface',
    icon: LayoutTemplate,
    badge: 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300',
  },
];

const SHAPE_OPTIONS: {
  id: NodeShape;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'card', label: 'Card', icon: Square },
  { id: 'pill', label: 'Pill', icon: Circle },
  { id: 'cloud', label: 'Cloud', icon: Sparkle },
  { id: 'sharp', label: 'Sharp', icon: Square },
  { id: 'banner', label: 'Banner', icon: Bookmark },
  { id: 'diamond', label: 'Diamond', icon: Diamond },
];

export const NodeInspector: React.FC<NodeInspectorProps> = ({
  selectedNode,
  onUpdateNode,
  onDeleteNode,
  onClose,
}) => {
  const [label, setLabel] = useState('');
  const [sublabel, setSublabel] = useState('');
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    if (selectedNode) {
      setLabel(selectedNode.data?.label || '');
      setSublabel(selectedNode.data?.sublabel || '');
    }
  }, [selectedNode]);

  if (!selectedNode) return null;

  const currentTheme = (selectedNode.data?.colorTheme || 'slate') as NodeColorTheme;
  const currentShape = (selectedNode.data?.shape || 'card') as NodeShape;
  const currentStyle = (selectedNode.data?.cardStyle || 'default') as NodeCardStyle;
  const currentTags = selectedNode.data?.tags || [];
  const isRoot = Boolean(selectedNode.data?.isRoot);
  const isLocked = Boolean(selectedNode.data?.locked);

  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLabel(e.target.value);
    onUpdateNode(selectedNode.id, { label: e.target.value });
  };

  const handleSublabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSublabel(e.target.value);
    onUpdateNode(selectedNode.id, { sublabel: e.target.value });
  };

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTag.trim()) return;
    const updated = [...currentTags, newTag.trim()];
    onUpdateNode(selectedNode.id, { tags: updated });
    setNewTag('');
  };

  const handleRemoveTag = (index: number) => {
    const updated = currentTags.filter((_, i) => i !== index);
    onUpdateNode(selectedNode.id, { tags: updated });
  };

  return (
    <div className="absolute top-20 right-4 z-40 w-84 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl p-4 animate-in fade-in slide-in-from-right-4 duration-150 max-h-[calc(100vh-100px)] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Node Aesthetics & Style
          </h4>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="py-3 space-y-4">
        {/* Label Input */}
        <div>
          <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
            Title / Label
          </label>
          <input
            type="text"
            value={label}
            onChange={handleLabelChange}
            placeholder="Node title..."
            className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Sublabel / Note */}
        <div>
          <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
            Subtitle / Description
          </label>
          <input
            type="text"
            value={sublabel}
            onChange={handleSublabelChange}
            placeholder="Optional sublabel..."
            className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* 1. Aesthetic Card Style Presets (Bold, Classy, Minimal, Gradient, Notion) */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-purple-500" />
            Card Aesthetic Preset
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {CARD_STYLE_PRESETS.map((preset) => {
              const isSelected = currentStyle === preset.id;
              const Icon = preset.icon;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onUpdateNode(selectedNode.id, { cardStyle: preset.id })}
                  className={`flex flex-col text-left p-2 rounded-xl border transition-all ${
                    isSelected
                      ? 'bg-blue-50/80 dark:bg-blue-950/60 border-blue-500 dark:border-blue-500 shadow-xs ring-1 ring-blue-500'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <Icon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {preset.label}
                      </span>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                    {preset.desc}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Shape Geometry Styles (Card, Pill, Cloud, Sharp, Banner, Diamond) */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Shapes className="w-3 h-3 text-emerald-500" />
            Shape Geometry
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {SHAPE_OPTIONS.map((shape) => {
              const isSelected = currentShape === shape.id;
              const Icon = shape.icon;
              return (
                <button
                  key={shape.id}
                  type="button"
                  onClick={() => onUpdateNode(selectedNode.id, { shape: shape.id })}
                  className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-semibold border transition-all ${
                    isSelected
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-700 dark:text-emerald-300 shadow-xs ring-1 ring-emerald-500'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-750'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {shape.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Color Accent Palette */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Palette className="w-3 h-3 text-blue-500" />
            Color Palette
          </label>
          <div className="flex items-center justify-between gap-1.5">
            {COLOR_OPTIONS.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => onUpdateNode(selectedNode.id, { colorTheme: c.key })}
                title={c.label}
                className={`w-7 h-7 rounded-full ${c.bg} transition-transform ${
                  currentTheme === c.key
                    ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-800 scale-110'
                    : 'hover:scale-105 opacity-80 hover:opacity-100'
                }`}
              />
            ))}
          </div>
        </div>

        {/* 4. Stick to Position (Lock) Toggle */}
        <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
          <div>
            <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
              Stick to Position
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400">
              Lock coordinates in place
            </div>
          </div>
          <button
            type="button"
            onClick={() => onUpdateNode(selectedNode.id, { locked: !isLocked })}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
              isLocked
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            {isLocked ? 'Locked (Stuck)' : 'Free to Move'}
          </button>
        </div>

        {/* 5. Root Node Toggle */}
        <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
              Central Root Node
            </span>
          </div>
          <button
            type="button"
            onClick={() => onUpdateNode(selectedNode.id, { isRoot: !isRoot })}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
              isRoot
                ? 'bg-blue-600 text-white'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            {isRoot ? 'Enabled' : 'Disabled'}
          </button>
        </div>

        {/* 6. Tags management */}
        <div>
          <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
            Tags
          </label>
          <div className="flex flex-wrap gap-1 mb-2">
            {currentTags.map((tag, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium"
              >
                <Tag className="w-2.5 h-2.5 opacity-50" />
                {tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(idx)}
                  className="hover:text-red-500 transition-colors ml-0.5"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            ))}
          </div>
          <form onSubmit={handleAddTag} className="flex gap-1.5">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="Add tag..."
              className="flex-1 text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200"
            >
              <Plus className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Delete button */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-end">
        <button
          type="button"
          onClick={() => {
            onDeleteNode(selectedNode.id);
            onClose();
          }}
          className="flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium px-2.5 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Delete Node
        </button>
      </div>
    </div>
  );
};
