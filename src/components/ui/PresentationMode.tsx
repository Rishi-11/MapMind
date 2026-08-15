import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  X,
  List,
  Sparkles,
  Tag,
  Eye,
  Tv,
} from 'lucide-react';
import { MapMindNode, MapMindEdge, NodeColorTheme } from '@/types/graph';

interface PresentationModeProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: MapMindNode[];
  edges: MapMindEdge[];
  onFocusNode: (nodeId: string, zoom?: number) => void;
  onFitView: () => void;
}

interface SlideItem {
  nodeId: string;
  label: string;
  sublabel?: string;
  tags?: string[];
  colorTheme: NodeColorTheme;
  depth: number;
  isRoot: boolean;
  parentLabel?: string;
}

export const PresentationMode: React.FC<PresentationModeProps> = ({
  isOpen,
  onClose,
  nodes,
  edges,
  onFocusNode,
  onFitView,
}) => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Compute hierarchical slide tour in depth-first order
  const slides = useMemo(() => {
    const visibleNodes = nodes.filter((n) => !n.data?.hidden);
    if (visibleNodes.length === 0) return [];

    let root = visibleNodes.find((n) => n.data?.isRoot);
    if (!root) {
      const targetIds = new Set(edges.map((e) => e.target));
      root = visibleNodes.find((n) => !targetIds.has(n.id)) || visibleNodes[0];
    }

    const slideList: SlideItem[] = [];
    const visited = new Set<string>();

    function traverse(nodeId: string, depth: number, parentLabel?: string) {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      const node = visibleNodes.find((n) => n.id === nodeId);
      if (!node) return;

      slideList.push({
        nodeId: node.id,
        label: node.data?.label || 'Untitled',
        sublabel: node.data?.sublabel,
        tags: node.data?.tags,
        colorTheme: (node.data?.colorTheme as NodeColorTheme) || 'blue',
        depth,
        isRoot: Boolean(node.data?.isRoot),
        parentLabel,
      });

      // Find children
      const childEdges = edges.filter((e) => e.source === nodeId);
      const childNodes = childEdges
        .map((e) => visibleNodes.find((n) => n.id === e.target))
        .filter(Boolean) as MapMindNode[];

      // Sort children by vertical position for natural presentation order
      childNodes.sort((a, b) => a.position.y - b.position.y);

      childNodes.forEach((child) => {
        traverse(child.id, depth + 1, node.data?.label);
      });
    }

    traverse(root.id, 0);

    // Add any unconnected leftover nodes at the end
    visibleNodes.forEach((node) => {
      if (!visited.has(node.id)) {
        slideList.push({
          nodeId: node.id,
          label: node.data?.label || 'Untitled',
          sublabel: node.data?.sublabel,
          tags: node.data?.tags,
          colorTheme: (node.data?.colorTheme as NodeColorTheme) || 'blue',
          depth: 1,
          isRoot: false,
        });
      }
    });

    return slideList;
  }, [nodes, edges]);

  const currentSlide = slides[currentSlideIndex] || null;

  // Jump to specific slide and pan camera
  const goToSlide = useCallback(
    (index: number) => {
      if (index < 0 || index >= slides.length) return;
      setCurrentSlideIndex(index);
      const target = slides[index];
      if (target) {
        onFocusNode(target.nodeId, target.isRoot ? 1.0 : 1.3);
      }
    },
    [slides, onFocusNode]
  );

  const handleNext = useCallback(() => {
    if (currentSlideIndex < slides.length - 1) {
      goToSlide(currentSlideIndex + 1);
    } else {
      setIsPlaying(false);
    }
  }, [currentSlideIndex, slides.length, goToSlide]);

  const handlePrev = useCallback(() => {
    if (currentSlideIndex > 0) {
      goToSlide(currentSlideIndex - 1);
    }
  }, [currentSlideIndex, goToSlide]);

  // Keyboard navigation during presentation mode
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'Home') {
        e.preventDefault();
        goToSlide(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        goToSlide(slides.length - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleNext, handlePrev, goToSlide, slides.length, onClose]);

  // Auto-play timer
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isPlaying && isOpen) {
      timer = setInterval(() => {
        setCurrentSlideIndex((prev) => {
          if (prev < slides.length - 1) {
            const nextIdx = prev + 1;
            const target = slides[nextIdx];
            if (target) {
              onFocusNode(target.nodeId, target.isRoot ? 1.0 : 1.3);
            }
            return nextIdx;
          } else {
            setIsPlaying(false);
            return prev;
          }
        });
      }, 4500);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying, isOpen, slides, onFocusNode]);

  // Initial focus on mount
  useEffect(() => {
    if (isOpen && slides.length > 0) {
      goToSlide(0);
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none flex flex-col justify-between p-4 sm:p-6 animate-in fade-in duration-200">
      {/* Top Presentation Bar */}
      <div className="pointer-events-auto flex items-center justify-between gap-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xl max-w-xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-600 text-white shadow-xs">
            <Tv className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <span>Presentation Tour</span>
              <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                {currentSlideIndex + 1} / {slides.length}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsDrawerOpen(!isDrawerOpen)}
            title="Slide Outline Index"
            className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
              isDrawerOpen
                ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <List className="w-4 h-4" />
            <span className="hidden sm:inline">Outline</span>
          </button>

          <button
            onClick={onFitView}
            title="Show Full Mind Map Overview"
            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Eye className="w-4 h-4" />
          </button>

          <button
            onClick={toggleFullscreen}
            title="Toggle Fullscreen"
            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

          <button
            onClick={onClose}
            title="Exit Presentation Mode (Esc)"
            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Slide Navigator Drawer */}
      {isDrawerOpen && (
        <div className="pointer-events-auto absolute top-20 left-6 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-700 shadow-2xl rounded-2xl p-3 w-80 max-h-[70vh] flex flex-col animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 mb-2">
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
              Presentation Sequence ({slides.length} slides)
            </span>
            <button
              onClick={() => setIsDrawerOpen(false)}
              className="p-1 text-slate-400 hover:text-slate-600 rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-1 pr-1">
            {slides.map((slide, idx) => {
              const isCurrent = idx === currentSlideIndex;
              return (
                <button
                  key={slide.nodeId}
                  onClick={() => {
                    goToSlide(idx);
                    setIsDrawerOpen(false);
                  }}
                  className={`w-full text-left p-2 rounded-xl text-xs transition-all flex items-center gap-2 ${
                    isCurrent
                      ? 'bg-indigo-600 text-white font-bold shadow-xs'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                  style={{ paddingLeft: `${Math.max(8, slide.depth * 14)}px` }}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isCurrent ? 'bg-white' : 'bg-indigo-500'}`} />
                  <span className="truncate flex-1">{slide.label}</span>
                  {slide.isRoot && (
                    <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-indigo-500/30 text-white font-mono">
                      Root
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Active Presenter Card & Floating Control Bar (Bottom) */}
      <div className="pointer-events-auto max-w-2xl mx-auto w-full space-y-3">
        {/* Presenter Current Topic Spotlight Card */}
        {currentSlide && (
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-2 border-indigo-500/80 rounded-2xl p-4 shadow-2xl animate-in slide-in-from-bottom-3 duration-200">
            <div className="flex items-start justify-between gap-3">
              <div>
                {currentSlide.parentLabel && (
                  <div className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 mb-0.5 flex items-center gap-1">
                    <span>↳</span>
                    <span>{currentSlide.parentLabel}</span>
                  </div>
                )}
                <h2 className="text-lg font-bold text-slate-950 dark:text-slate-50 tracking-tight flex items-center gap-2">
                  {currentSlide.isRoot && <Sparkles className="w-4 h-4 text-indigo-500" />}
                  <span>{currentSlide.label}</span>
                </h2>
                {currentSlide.sublabel && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                    {currentSlide.sublabel}
                  </p>
                )}
              </div>

              {currentSlide.tags && currentSlide.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {currentSlide.tags.map((t, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                    >
                      <Tag className="w-2.5 h-2.5 opacity-60" />
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bottom Floating Navigation HUD */}
        <div className="flex items-center justify-between gap-3 bg-slate-900/90 dark:bg-slate-950/90 backdrop-blur-xl text-white px-5 py-3 rounded-2xl border border-slate-700/80 shadow-2xl">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrev}
              disabled={currentSlideIndex === 0}
              title="Previous Slide (← Left Arrow)"
              className="p-2 rounded-xl hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <button
              onClick={() => setIsPlaying(!isPlaying)}
              title={isPlaying ? 'Pause Auto-Play' : 'Start Auto-Play Tour (4.5s per slide)'}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                isPlaying ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-slate-800 text-slate-200'
              }`}
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>

            <button
              onClick={handleNext}
              disabled={currentSlideIndex >= slides.length - 1}
              title="Next Slide (→ Right Arrow or Space)"
              className="p-2 rounded-xl hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="flex-1 max-w-xs mx-4 hidden sm:block">
            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-blue-400 transition-all duration-300"
                style={{
                  width: `${((currentSlideIndex + 1) / Math.max(1, slides.length)) * 100}%`,
                }}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
            <span>
              <strong className="text-white">{currentSlideIndex + 1}</strong> / {slides.length}
            </span>
            <span className="hidden md:inline text-slate-500">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-sans">Space</kbd> Next
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
