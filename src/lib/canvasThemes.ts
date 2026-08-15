import { CanvasBackgroundPreset } from '@/types/graph';

export interface BackgroundThemeConfig {
  id: CanvasBackgroundPreset;
  name: string;
  desc: string;
  light: {
    bg: string;
    canvasBgClass: string;
    gridColor: string;
    maskColor: string;
    hex: string;
  };
  dark: {
    bg: string;
    canvasBgClass: string;
    gridColor: string;
    maskColor: string;
    hex: string;
  };
  previewBg: string;
}

export const CANVAS_BACKGROUND_PRESETS: Record<CanvasBackgroundPreset, BackgroundThemeConfig> = {
  warm: {
    id: 'warm',
    name: 'Warm Paper',
    desc: 'Warm cream parchment, easy on the eyes',
    light: {
      bg: '#fbf8f2',
      canvasBgClass: 'bg-[#fbf8f2]',
      gridColor: '#dcd3c1',
      maskColor: 'rgba(251, 248, 242, 0.8)',
      hex: '#fbf8f2',
    },
    dark: {
      bg: '#1c1a16',
      canvasBgClass: 'dark:bg-[#1c1a16]',
      gridColor: '#3d3830',
      maskColor: 'rgba(28, 26, 22, 0.8)',
      hex: '#1c1a16',
    },
    previewBg: 'bg-[#fbf8f2] border-[#e2dac9]',
  },
  slate: {
    id: 'slate',
    name: 'Cool Slate',
    desc: 'Modern crisp white & slate navy',
    light: {
      bg: '#f8fafc',
      canvasBgClass: 'bg-slate-50',
      gridColor: '#cbd5e1',
      maskColor: 'rgba(248, 250, 252, 0.8)',
      hex: '#f8fafc',
    },
    dark: {
      bg: '#0f172a',
      canvasBgClass: 'dark:bg-slate-900',
      gridColor: '#334155',
      maskColor: 'rgba(15, 23, 42, 0.8)',
      hex: '#0f172a',
    },
    previewBg: 'bg-slate-50 border-slate-200',
  },
  solarized: {
    id: 'solarized',
    name: 'Solarized Ochre',
    desc: 'Classic editorial warm cream & teal',
    light: {
      bg: '#fdf6e3',
      canvasBgClass: 'bg-[#fdf6e3]',
      gridColor: '#e0d6b9',
      maskColor: 'rgba(253, 246, 227, 0.8)',
      hex: '#fdf6e3',
    },
    dark: {
      bg: '#002b36',
      canvasBgClass: 'dark:bg-[#002b36]',
      gridColor: '#073642',
      maskColor: 'rgba(0, 43, 54, 0.8)',
      hex: '#002b36',
    },
    previewBg: 'bg-[#fdf6e3] border-[#eee8d5]',
  },
  charcoal: {
    id: 'charcoal',
    name: 'Midnight Charcoal',
    desc: 'Matte pitch dark & zinc white',
    light: {
      bg: '#f4f4f5',
      canvasBgClass: 'bg-zinc-100',
      gridColor: '#d4d4d8',
      maskColor: 'rgba(244, 244, 245, 0.8)',
      hex: '#f4f4f5',
    },
    dark: {
      bg: '#111113',
      canvasBgClass: 'dark:bg-[#111113]',
      gridColor: '#27272a',
      maskColor: 'rgba(17, 17, 19, 0.85)',
      hex: '#111113',
    },
    previewBg: 'bg-zinc-100 border-zinc-300',
  },
  sage: {
    id: 'sage',
    name: 'Botanical Sage',
    desc: 'Calming mint green & forest tones',
    light: {
      bg: '#f3f8f5',
      canvasBgClass: 'bg-[#f3f8f5]',
      gridColor: '#cde3d8',
      maskColor: 'rgba(243, 248, 245, 0.8)',
      hex: '#f3f8f5',
    },
    dark: {
      bg: '#101c15',
      canvasBgClass: 'dark:bg-[#101c15]',
      gridColor: '#1d3629',
      maskColor: 'rgba(16, 28, 21, 0.85)',
      hex: '#101c15',
    },
    previewBg: 'bg-[#f3f8f5] border-[#cde3d8]',
  },
  rose: {
    id: 'rose',
    name: 'Rosé Velvet',
    desc: 'Soft blush paper & dark berry night',
    light: {
      bg: '#fff5f6',
      canvasBgClass: 'bg-[#fff5f6]',
      gridColor: '#fed7da',
      maskColor: 'rgba(255, 245, 246, 0.8)',
      hex: '#fff5f6',
    },
    dark: {
      bg: '#1f1317',
      canvasBgClass: 'dark:bg-[#1f1317]',
      gridColor: '#3c212b',
      maskColor: 'rgba(31, 19, 23, 0.85)',
      hex: '#1f1317',
    },
    previewBg: 'bg-[#fff5f6] border-[#fed7da]',
  },
  cyber: {
    id: 'cyber',
    name: 'Cyber Space',
    desc: 'Deep cosmic space & sky ice blue',
    light: {
      bg: '#f0f9ff',
      canvasBgClass: 'bg-sky-50',
      gridColor: '#bae6fd',
      maskColor: 'rgba(240, 249, 255, 0.8)',
      hex: '#f0f9ff',
    },
    dark: {
      bg: '#070a13',
      canvasBgClass: 'dark:bg-[#070a13]',
      gridColor: '#1e293b',
      maskColor: 'rgba(7, 10, 19, 0.85)',
      hex: '#070a13',
    },
    previewBg: 'bg-sky-50 border-sky-200',
  },
};
