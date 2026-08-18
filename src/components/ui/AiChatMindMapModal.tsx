import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Copy,
  Check,
  Code2,
  Wand2,
  X,
  BrainCircuit,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import {
  AI_PROMPT_TEMPLATES,
  parseAiResponseToMindMap,
  AiPromptTemplate,
} from '@/lib/importers/aiChatParser';
import { MapMindNode, MapMindEdge, LayoutDirection } from '@/types/graph';
import { getElkLayout } from '@/lib/layouts/elkLayout';
import { getDagreLayout } from '@/lib/layouts/dagreLayout';

interface AiChatMindMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedNodeId?: string | null;
  currentNodes?: MapMindNode[];
  currentEdges?: MapMindEdge[];
  onApplyMindMap: (nodes: MapMindNode[], edges: MapMindEdge[], replaceAll: boolean) => void;
  onNotify?: (message: string, type: 'success' | 'error' | 'info') => void;
}

const DEFAULT_TEMPLATES = AI_PROMPT_TEMPLATES && AI_PROMPT_TEMPLATES.length > 0
  ? AI_PROMPT_TEMPLATES
  : [
      {
        id: 'chat-summary',
        title: '💬 Summarize Chat / Discussion',
        description: 'Transform our ongoing chat conversation into a structured mind map',
        prompt: 'Please convert our discussion into an indented Markdown bullet-point mind map with # [Root Topic] and - [Subtopics].',
      },
    ];

const EXAMPLE_AI_OUTPUT = `# User Authentication Architecture
- Authentication Engine [Security] : Verifies whether a user is genuinely who they claim to be
-- Purpose [Defense] : Prevents unauthorized actors from accessing sensitive tenant data
-- Credentials Intake [Input] : User supplies identifier and secret such as email and cryptographic password
--- (submits to) --> Verification Logic {diamond} [Validation] : Checks supplied credentials against hashed Argon2 salt
---- (on valid match) --> Session Generated [Outcome] : Issues signed JWT token for persistent authenticated state
---- (on mismatch) --> Access Rejected [Outcome] : Rejects with 401 Unauthorized and increments rate limiter
-- Multi-Factor OTP [Defense-in-Depth] : Generates ephemeral 6-digit TOTP code refreshed every 30 seconds
--- Why Needed [Risk Mitigation] : Protects the user account even if primary password was leaked in a breach`;

export const AiChatMindMapModal: React.FC<AiChatMindMapModalProps> = ({
  isOpen,
  onClose,
  selectedNodeId = null,
  currentNodes = [],
  currentEdges = [],
  onApplyMindMap,
  onNotify,
}) => {
  const [activeTab, setActiveTab] = useState<'prompt' | 'import'>('prompt');
  const [selectedTemplate, setSelectedTemplate] = useState<AiPromptTemplate>(DEFAULT_TEMPLATES[0]);
  const [customPrompt, setCustomPrompt] = useState<string>(DEFAULT_TEMPLATES[0].prompt);
  const [copied, setCopied] = useState(false);

  // Import State
  const [aiInputText, setAiInputText] = useState<string>('');
  const [layoutMode, setLayoutMode] = useState<LayoutDirection>('BALANCED_MINDMAP');
  const [importMode, setImportMode] = useState<'replace' | 'append'>('replace');
  const [isGenerating, setIsGenerating] = useState(false);

  const safeNodes = Array.isArray(currentNodes) ? currentNodes : [];
  const safeEdges = Array.isArray(currentEdges) ? currentEdges : [];

  const selectedNode = useMemo(() => {
    return safeNodes.find((n) => n.id === selectedNodeId) || null;
  }, [safeNodes, selectedNodeId]);

  // Real-time preview of parsed nodes
  const parsedPreview = useMemo(() => {
    if (!aiInputText || !aiInputText.trim()) return null;
    try {
      return parseAiResponseToMindMap(aiInputText);
    } catch {
      return null;
    }
  }, [aiInputText]);

  if (!isOpen) return null;

  const handleSelectTemplate = (template: AiPromptTemplate) => {
    setSelectedTemplate(template);
    setCustomPrompt(template.prompt);
  };

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(customPrompt);
      setCopied(true);
      onNotify?.('Prompt copied to clipboard! Paste it into your chatbot.', 'success');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      onNotify?.('Failed to copy to clipboard', 'error');
    }
  };

  const handleGenerateMindMap = async () => {
    if (!aiInputText.trim()) {
      onNotify?.('Please paste the AI chatbot response first', 'error');
      return;
    }

    setIsGenerating(true);
    try {
      const parsed = parseAiResponseToMindMap(aiInputText);
      if (!parsed || !parsed.nodes || parsed.nodes.length === 0) {
        onNotify?.('Could not detect any mind map nodes from the text', 'error');
        setIsGenerating(false);
        return;
      }

      let finalNodes = parsed.nodes;
      let finalEdges = parsed.edges;

      if (importMode === 'append' && selectedNode) {
        // Connect parsed root to the currently selected node
        const connectingEdge: MapMindEdge = {
          id: `e_${selectedNode.id}_${parsed.rootId}`,
          source: selectedNode.id,
          target: parsed.rootId,
          type: 'smoothstep',
        };

        finalNodes = [...safeNodes, ...parsed.nodes];
        finalEdges = [...safeEdges, ...parsed.edges, connectingEdge];
      }

      // Calculate automated spatial layout
      if (layoutMode === 'BALANCED_MINDMAP') {
        const layoutResult = await getElkLayout(finalNodes, finalEdges);
        onApplyMindMap(layoutResult.nodes, layoutResult.edges, importMode === 'replace');
      } else {
        const layoutResult = await getDagreLayout(finalNodes, finalEdges, {
          direction: layoutMode as 'TB' | 'LR',
        });
        onApplyMindMap(layoutResult.nodes, layoutResult.edges, importMode === 'replace');
      }

      onNotify?.(
        `Generated mind map with ${parsed.nodes.length} nodes!`,
        'success'
      );
      onClose();
    } catch (err) {
      console.error('Failed to generate mind map:', err);
      onNotify?.('Failed to generate mind map from text', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-md">
              <BrainCircuit className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  AI Chatbot to Mind Map
                </h3>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                  <Sparkles className="w-3 h-3" />
                  Universal AI
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Generate structured mind maps from ChatGPT, Claude, Gemini, DeepSeek, or Copilot
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

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-850/50 px-5 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('prompt')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors ${
              activeTab === 'prompt'
                ? 'border-purple-600 text-purple-600 dark:text-purple-400 bg-white dark:bg-slate-800 rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 flex items-center justify-center text-[10px]">
              1
            </span>
            <span>Get AI Prompt (Instructions)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('import')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors ${
              activeTab === 'import'
                ? 'border-purple-600 text-purple-600 dark:text-purple-400 bg-white dark:bg-slate-800 rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 flex items-center justify-center text-[10px]">
              2
            </span>
            <span>Paste AI Response & Generate</span>
            {parsedPreview && parsedPreview.nodes && (
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-[10px]">
                {parsedPreview.nodes.length} nodes
              </span>
            )}
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {activeTab === 'prompt' ? (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* 3 Step Guide */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                  <div className="text-[11px] font-bold text-purple-600 dark:text-purple-400">
                    Step 1
                  </div>
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                    Copy Prompt Below
                  </div>
                </div>
                <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                  <div className="text-[11px] font-bold text-purple-600 dark:text-purple-400">
                    Step 2
                  </div>
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                    Paste in any Chatbot
                  </div>
                </div>
                <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                  <div className="text-[11px] font-bold text-purple-600 dark:text-purple-400">
                    Step 3
                  </div>
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                    Paste Output in Tab 2
                  </div>
                </div>
              </div>

              {/* Template Picker */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Select AI Prompt Template
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {DEFAULT_TEMPLATES.map((tmpl) => {
                    const isSelected = selectedTemplate?.id === tmpl.id;
                    return (
                      <button
                        key={tmpl.id}
                        type="button"
                        onClick={() => handleSelectTemplate(tmpl)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-950/40 ring-1 ring-purple-500 shadow-xs'
                            : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750'
                        }`}
                      >
                        <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          {tmpl.title}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">
                          {tmpl.description}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Editable Prompt Area */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Instruction Prompt for AI Chatbot
                  </label>
                  <span className="text-[10px] text-slate-400">
                    Editable text
                  </span>
                </div>
                <textarea
                  rows={7}
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  className="w-full text-xs font-mono p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-purple-500 shadow-inner"
                />
              </div>

              {/* Copy & Continue buttons */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleCopyPrompt}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md transition-colors"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Copied Prompt!' : 'Copy Prompt to Clipboard'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('import')}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors"
                >
                  <span>Go to Step 2</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Input Area */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Code2 className="w-3.5 h-3.5 text-purple-500" />
                    Paste Chatbot Output (Markdown, Mermaid, or JSON)
                  </label>
                  <button
                    type="button"
                    onClick={() => setAiInputText(EXAMPLE_AI_OUTPUT)}
                    className="text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:underline"
                  >
                    Load Sample AI Output
                  </button>
                </div>
                <textarea
                  rows={9}
                  placeholder={`Paste output from ChatGPT/Claude here...\n\nExample:\n# Project Architecture\n- Frontend [React]\n  - Tailwind CSS\n  - React Flow\n- Backend [Node]\n  - REST API`}
                  value={aiInputText}
                  onChange={(e) => setAiInputText(e.target.value)}
                  className="w-full text-xs font-mono p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-purple-500 shadow-inner"
                />
              </div>

              {/* Detection Status Bar */}
              {parsedPreview && parsedPreview.nodes && (
                <div className="p-3 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>
                      Detected {parsedPreview.formatDetected === 'markdown-outline' ? 'Markdown Outline' : parsedPreview.formatDetected}: {parsedPreview.nodes.length} nodes & {parsedPreview.edges.length} branches ready!
                    </span>
                  </div>
                  {parsedPreview.nodes[0] && (
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                      Root: {String(parsedPreview.nodes[0]?.data?.label || '')}
                    </span>
                  )}
                </div>
              )}

              {/* Generation Options (Layout & Replace/Append) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
                {/* Layout Algorithm */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Layout Engine
                  </label>
                  <select
                    value={layoutMode}
                    onChange={(e) => setLayoutMode(e.target.value as LayoutDirection)}
                    className="w-full text-xs font-semibold p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-purple-500"
                  >
                    <option value="BALANCED_MINDMAP">Balanced Radial Mind Map (ELK)</option>
                    <option value="TB">Top-Down Hierarchy (Dagre)</option>
                    <option value="LR">Left-to-Right Flow (Dagre)</option>
                  </select>
                </div>

                {/* Import Target */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Import Mode
                  </label>
                  <select
                    value={importMode}
                    onChange={(e) => setImportMode(e.target.value as 'replace' | 'append')}
                    className="w-full text-xs font-semibold p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-purple-500"
                  >
                    <option value="replace">Replace Current Whiteboard</option>
                    <option value="append" disabled={!selectedNode}>
                      {selectedNode
                        ? `Attach to "${selectedNode.data?.label || 'Selected Node'}"`
                        : 'Attach to Selected Node (Select a node first)'}
                    </option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('prompt')}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  Back to Prompt
                </button>

                <button
                  type="button"
                  disabled={isGenerating || !aiInputText.trim()}
                  onClick={handleGenerateMindMap}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold shadow-lg transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                  <span>{isGenerating ? 'Computing Layout...' : 'Generate Direct Mind Map'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
