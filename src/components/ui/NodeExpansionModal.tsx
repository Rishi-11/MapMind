import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Copy,
  Check,
  X,
  BrainCircuit,
  ArrowRight,
  Plus,
  Layers,
  Microscope,
  Lightbulb,
  AlertTriangle,
  Workflow,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { MapMindNode, MapMindEdge } from '@/types/graph';
import { extractNodeExpansionContext } from '@/lib/ai/nodeContextExtractor';
import {
  EXPANSION_PRESETS,
  buildExpansionPrompt,
  ExpansionPreset,
} from '@/lib/ai/expansionPromptBuilder';
import { mergeScopedMarkdownSubtree } from '@/lib/ai/scopedTreeMerger';
import { getCompactWrappedLayout } from '@/lib/layouts/compactWrappingLayout';

interface NodeExpansionModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetNodeId: string | null;
  nodes: MapMindNode[];
  edges: MapMindEdge[];
  onApplyExpansion: (updatedNodes: MapMindNode[], updatedEdges: MapMindEdge[], addedCount: number) => void;
  onNotify?: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const NodeExpansionModal: React.FC<NodeExpansionModalProps> = ({
  isOpen,
  onClose,
  targetNodeId,
  nodes,
  edges,
  onApplyExpansion,
  onNotify,
}) => {
  const [activeTab, setActiveTab] = useState<'prompt' | 'import'>('prompt');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('deep-dive');
  const [customDirective, setCustomDirective] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [aiResponseText, setAiResponseText] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Extract Context
  const context = useMemo(() => {
    if (!targetNodeId) return null;
    return extractNodeExpansionContext(targetNodeId, nodes, edges);
  }, [targetNodeId, nodes, edges]);

  // Compiled Prompt
  const compiledPrompt = useMemo(() => {
    if (!context) return '';
    return buildExpansionPrompt(context, {
      presetId: selectedPresetId,
      customDirective,
    });
  }, [context, selectedPresetId, customDirective]);

  // Live preview of parsed response
  const previewResult = useMemo(() => {
    if (!aiResponseText.trim() || !targetNodeId) return null;
    try {
      return mergeScopedMarkdownSubtree(aiResponseText, targetNodeId, nodes, edges);
    } catch {
      return null;
    }
  }, [aiResponseText, targetNodeId, nodes, edges]);

  if (!isOpen || !context) return null;

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(compiledPrompt);
      setCopied(true);
      onNotify?.('Prompt copied! Paste it into ChatGPT, Claude, Gemini, or DeepSeek.', 'success');
      setTimeout(() => setCopied(false), 2500);
      setActiveTab('import');
    } catch {
      onNotify?.('Failed to copy prompt to clipboard', 'error');
    }
  };

  const handleApplyExpansionAction = async () => {
    if (!aiResponseText.trim()) {
      onNotify?.('Please paste the AI response text first.', 'error');
      return;
    }

    if (!previewResult || previewResult.newNodes.length === 0) {
      onNotify?.('No sub-nodes detected in the pasted text. Please check the Markdown format.', 'error');
      return;
    }

    setIsProcessing(true);
    try {
      // Run compact wrapped layout to organize the newly expanded tree seamlessly
      const layoutResult = getCompactWrappedLayout(previewResult.allNodes, previewResult.allEdges, {
        direction: 'BALANCED_MINDMAP',
        density: 'compact',
      });

      onApplyExpansion(layoutResult.nodes, layoutResult.edges, previewResult.addedCount);
      onNotify?.(`Successfully expanded "${context.targetNode.label}" with ${previewResult.addedCount} new sub-branches!`, 'success');
      onClose();
    } catch (err) {
      console.error('Failed to apply node expansion:', err);
      onNotify?.('Error inserting sub-nodes', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const getPresetIcon = (iconName: string) => {
    switch (iconName) {
      case 'Microscope': return <Microscope className="w-4 h-4" />;
      case 'Lightbulb': return <Lightbulb className="w-4 h-4" />;
      case 'AlertTriangle': return <AlertTriangle className="w-4 h-4" />;
      case 'Workflow': return <Workflow className="w-4 h-4" />;
      default: return <Layers className="w-4 h-4" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-gradient-to-r from-purple-50/50 via-white to-indigo-50/50 dark:from-slate-800 dark:via-slate-850 dark:to-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-md">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Expand with AI
                </h3>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                  <Sparkles className="w-3 h-3" />
                  Context-Aware
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-md">
                Target Node: <strong className="text-slate-750 dark:text-slate-200">"{context.targetNode.label}"</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Context Breadcrumbs & Loop Prevention Bar */}
        <div className="bg-slate-50 dark:bg-slate-800/80 px-5 py-2.5 border-b border-slate-200/80 dark:border-slate-700/80 text-xs">
          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 overflow-x-auto whitespace-nowrap scrollbar-none">
            <span className="font-semibold text-slate-400 dark:text-slate-500 uppercase text-[10px] tracking-wider">Context Path:</span>
            {context.ancestorBreadcrumbs.map((crumb, idx) => (
              <React.Fragment key={idx}>
                <span className="px-1.5 py-0.5 rounded-md bg-slate-200/70 dark:bg-slate-700 text-[11px] font-medium text-slate-700 dark:text-slate-300">
                  {crumb}
                </span>
                <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
              </React.Fragment>
            ))}
            <span className="px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 font-bold text-[11px] border border-purple-200 dark:border-purple-800">
              {context.targetNode.label}
            </span>
          </div>

          {context.exclusionList.length > 0 && (
            <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-500 dark:text-slate-400 overflow-x-auto whitespace-nowrap scrollbar-none">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span className="font-medium">Loop Exclusion (Protected):</span>
              {context.exclusionList.slice(0, 4).map((ex, i) => (
                <span key={i} className="px-1.5 py-0.2 rounded bg-slate-200/60 dark:bg-slate-700/60 text-[10px] text-slate-600 dark:text-slate-300 line-through opacity-80">
                  {ex}
                </span>
              ))}
              {context.exclusionList.length > 4 && (
                <span className="text-[10px] text-slate-400">
                  +{context.exclusionList.length - 4} more
                </span>
              )}
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 px-5 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('prompt')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors ${
              activeTab === 'prompt'
                ? 'border-purple-600 text-purple-600 dark:border-purple-400 dark:text-purple-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Copy className="w-3.5 h-3.5" />
            1. Copy Context Prompt
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('import')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors ${
              activeTab === 'import'
                ? 'border-purple-600 text-purple-600 dark:border-purple-400 dark:text-purple-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            2. Paste AI Response
            {previewResult && previewResult.newNodes.length > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                +{previewResult.newNodes.length}
              </span>
            )}
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {activeTab === 'prompt' ? (
            <div className="space-y-4">
              {/* Presets Grid */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Select Expansion Strategy:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {EXPANSION_PRESETS.map((preset: ExpansionPreset) => {
                    const isSelected = selectedPresetId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          setSelectedPresetId(preset.id);
                          setCustomDirective('');
                        }}
                        className={`text-left p-3 rounded-xl border transition-all ${
                          isSelected
                            ? 'border-purple-500 bg-purple-50/70 dark:bg-purple-950/40 ring-1 ring-purple-500'
                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2 font-semibold text-xs text-slate-900 dark:text-slate-100">
                          <span className={`${isSelected ? 'text-purple-600 dark:text-purple-400' : 'text-slate-500'}`}>
                            {getPresetIcon(preset.iconName)}
                          </span>
                          {preset.title}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                          {preset.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Directive */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Custom Instructions (Optional):
                </label>
                <input
                  type="text"
                  value={customDirective}
                  onChange={(e) => setCustomDirective(e.target.value)}
                  placeholder="e.g. Focus on cloud deployment and give 5 practical examples..."
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Compiled Prompt Preview Box */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Compiled Context-Aware Prompt:
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Ready to copy
                  </span>
                </div>
                <div className="relative">
                  <pre className="text-[11px] font-mono leading-relaxed p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-900 text-slate-200 overflow-x-auto max-h-48 whitespace-pre-wrap select-all">
                    {compiledPrompt}
                  </pre>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Paste AI Response (Markdown):
                </label>
                <textarea
                  value={aiResponseText}
                  onChange={(e) => setAiResponseText(e.target.value)}
                  placeholder={`- Subtopic 1 [Tag] : Explanation of mechanism\n-- Detail A : Further explanation\n- Subtopic 2 [Tag] : Explanation`}
                  rows={8}
                  className="w-full text-xs font-mono p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none leading-relaxed"
                />
              </div>

              {/* Live Preview of detected nodes */}
              {previewResult && previewResult.newNodes.length > 0 && (
                <div className="p-3 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/60 dark:bg-emerald-950/30">
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-800 dark:text-emerald-300 mb-2">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Detected {previewResult.newNodes.length} Sub-Nodes for "{context.targetNode.label}":
                    </span>
                    <span className="text-[10px] uppercase tracking-wider font-semibold">
                      Ready to Insert
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                    {previewResult.newNodes.map((n, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-800 text-[11px] font-medium text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-xs"
                      >
                        {n.data?.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/60 flex items-center justify-between">
          {activeTab === 'prompt' ? (
            <>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Copies context and exclusion rules to your clipboard.
              </p>
              <button
                type="button"
                onClick={handleCopyPrompt}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied to Clipboard!' : 'Copy Prompt & Next'}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setActiveTab('prompt')}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                ← Back to Prompt
              </button>
              <button
                type="button"
                onClick={handleApplyExpansionAction}
                disabled={isProcessing || !aiResponseText.trim()}
                className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white transition-all ${
                  isProcessing || !aiResponseText.trim()
                    ? 'bg-slate-400 dark:bg-slate-600 cursor-not-allowed opacity-60'
                    : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-md hover:shadow-lg'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                {isProcessing ? 'Arranging Sub-Nodes...' : `Insert & Auto-Layout (${previewResult?.newNodes.length || 0} Nodes)`}
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
};
