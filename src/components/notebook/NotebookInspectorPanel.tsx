import React, { useState } from 'react';
import {
  Link2,
  Sparkles,
  Check,
  X,
  MessageSquare,
  ListTree,
  Send,
  Bot,
  ArrowUpRight,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react';
import { Page, BacklinkItem, UnlinkedMentionItem } from '@/types/notebook';
import { AiConnectionSuggestion, AiConnectionMode, KnowledgeAssistantMessage } from '@/types/ai';
import { extractWikiLinks, getPageAliases } from '@/lib/notebook/links';
import { queryKnowledgeAssistant, recordAiFeedback } from '@/lib/notebook/knowledgeAiEngine';

interface NotebookInspectorPanelProps {
  page: Page;
  allPages: Page[];
  backlinks: BacklinkItem[];
  unlinkedMentions: UnlinkedMentionItem[];
  aiSuggestions: AiConnectionSuggestion[];
  aiMode: AiConnectionMode;
  onChangeAiMode: (mode: AiConnectionMode) => void;
  onAcceptAiSuggestion: (suggestion: AiConnectionSuggestion) => void;
  onRejectAiSuggestion: (suggestion: AiConnectionSuggestion) => void;
  onConvertMentionToLink: (mention: UnlinkedMentionItem) => void;
  onNavigateToPage: (pageTitle: string) => void;
  notebookMap: Map<string, string>;
  sectionMap: Map<string, string>;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

type InspectorTab = 'ai' | 'links' | 'chat' | 'outline';

export const NotebookInspectorPanel: React.FC<NotebookInspectorPanelProps> = ({
  page,
  allPages,
  backlinks,
  unlinkedMentions,
  aiSuggestions,
  aiMode,
  onChangeAiMode,
  onAcceptAiSuggestion,
  onRejectAiSuggestion,
  onConvertMentionToLink,
  onNavigateToPage,
  notebookMap,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const [activeTab, setActiveTab] = useState<InspectorTab>('ai');

  // AI Chat Assistant State
  const [chatMessages, setChatMessages] = useState<KnowledgeAssistantMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      content: `Hello! I'm your private **Local AI Assistant**. I analyze your local notes with zero cloud servers.\n\nAsk me anything about your knowledge base!`,
      timestamp: new Date().toISOString(),
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isAsking, setIsAsking] = useState(false);

  // Extract outgoing links from current page
  const outgoingLinks = React.useMemo(() => extractWikiLinks(page.content), [page.content]);

  // Extract aliases defined for this page
  const pageAliases = React.useMemo(() => getPageAliases(page), [page]);

  // Extract document outline headings
  const outlineHeadings = React.useMemo(() => {
    const lines = page.content.split(/\r?\n/);
    const headings: Array<{ text: string; depth: number }> = [];
    lines.forEach((line) => {
      const match = line.match(/^(#{1,4})\s+(.*)$/);
      if (match) {
        headings.push({
          depth: match[1].length,
          text: match[2].replace(/[#*`]/g, '').trim(),
        });
      }
    });
    return headings;
  }, [page.content]);

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isAsking) return;

    const userMsg: KnowledgeAssistantMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      content: chatInput.trim(),
      timestamp: new Date().toISOString(),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput('');
    setIsAsking(true);

    setTimeout(() => {
      const response = queryKnowledgeAssistant(userMsg.content, allPages, notebookMap);
      setChatMessages((prev) => [...prev, response]);
      setIsAsking(false);
    }, 300);
  };

  if (isCollapsed) {
    return (
      <aside className="w-11 h-full border-l border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/80 flex flex-col items-center py-3 gap-2 select-none shrink-0 transition-all">
        <button
          onClick={onToggleCollapse}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          title="Expand Knowledge Assistant (Ctrl+J)"
        >
          <PanelRightOpen className="w-4 h-4 text-purple-600 dark:text-purple-400" />
        </button>
        <div className="w-6 h-px bg-slate-200 dark:bg-slate-800 my-1" />
        <button
          onClick={() => {
            setActiveTab('ai');
            onToggleCollapse?.();
          }}
          className="p-2 rounded-lg text-slate-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40 relative transition-colors"
          title={`AI Suggestions (${aiSuggestions.length})`}
        >
          <Sparkles className="w-4 h-4 text-purple-500" />
          {aiSuggestions.length > 0 && (
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-purple-500" />
          )}
        </button>
        <button
          onClick={() => {
            setActiveTab('links');
            onToggleCollapse?.();
          }}
          className="p-2 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 relative transition-colors"
          title={`Backlinks (${backlinks.length})`}
        >
          <Link2 className="w-4 h-4 text-blue-500" />
          {backlinks.length > 0 && (
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-blue-500" />
          )}
        </button>
        <button
          onClick={() => {
            setActiveTab('chat');
            onToggleCollapse?.();
          }}
          className="p-2 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
          title="AI Assistant Chat"
        >
          <MessageSquare className="w-4 h-4 text-emerald-500" />
        </button>
        <button
          onClick={() => {
            setActiveTab('outline');
            onToggleCollapse?.();
          }}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          title="Document Outline"
        >
          <ListTree className="w-4 h-4 text-slate-400" />
        </button>
      </aside>
    );
  }

  return (
    <aside className="w-64 sm:w-72 md:w-80 lg:w-84 h-full border-l border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/80 flex flex-col shrink-0 select-none overflow-hidden transition-all">
      {/* Top Inspector Tabs */}
      <div className="h-11 border-b border-slate-200 dark:border-slate-800 px-2 flex items-center justify-between bg-slate-100/70 dark:bg-slate-900/60">
        <div className="flex items-center gap-1 flex-1 min-w-0 mr-1">
          <button
            onClick={() => setActiveTab('ai')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all truncate ${
              activeTab === 'ai'
                ? 'bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-300 shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-500 shrink-0" />
            <span className="truncate">AI ({aiSuggestions.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('links')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all truncate ${
              activeTab === 'links'
                ? 'bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-300 shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Link2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span className="truncate">Links ({backlinks.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('chat')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all truncate ${
              activeTab === 'chat'
                ? 'bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-300 shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span className="truncate">Ask</span>
          </button>

          <button
            onClick={() => setActiveTab('outline')}
            className={`p-1.5 rounded-lg text-xs transition-all ${
              activeTab === 'outline'
                ? 'bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-300 shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
            title="Document Outline"
          >
            <ListTree className="w-3.5 h-3.5" />
          </button>
        </div>

        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors shrink-0"
            title="Collapse Inspector"
          >
            <PanelRightClose className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
        {/* Tab 1: AI Connection Suggestions */}
        {activeTab === 'ai' && (
          <div className="space-y-4">
            {/* AI Mode Selector */}
            <div className="p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Bot className="w-3.5 h-3.5 text-purple-500" /> AI Mode
                </span>
                <span className="text-[10px] text-purple-600 dark:text-purple-400 font-mono">100% Local</span>
              </div>
              <div className="grid grid-cols-4 gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-lg">
                {(['off', 'suggest', 'assisted', 'autonomous'] as AiConnectionMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => onChangeAiMode(mode)}
                    className={`py-1 text-[10px] font-semibold rounded capitalize transition-all ${
                      aiMode === mode
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {/* Suggestions List */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Suggested Connections
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {aiSuggestions.length} found
                </span>
              </div>

              {aiSuggestions.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400 bg-white/50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                  <Sparkles className="w-6 h-6 mx-auto mb-1 text-purple-400 opacity-60" />
                  <p>No new AI connections found at current confidence threshold.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {aiSuggestions.map((sug) => {
                    const confidencePercent = Math.round(sug.confidence * 100);
                    return (
                      <div
                        key={sug.id}
                        className="p-3 bg-white dark:bg-slate-800/90 rounded-xl border border-purple-200/80 dark:border-purple-900/60 shadow-xs hover:border-purple-400 dark:hover:border-purple-700 transition-all space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => onNavigateToPage(sug.targetTitle)}
                            className="font-bold text-xs text-purple-900 dark:text-purple-200 hover:underline flex items-center gap-1 text-left truncate"
                          >
                            <span>[[{sug.targetTitle}]]</span>
                            <ArrowUpRight className="w-3 h-3 opacity-60" />
                          </button>
                          <span
                            className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                              confidencePercent >= 85
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
                            }`}
                          >
                            {confidencePercent}%
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                          {sug.reason}
                        </p>

                        {/* Multi-Signal Breakdown Bar */}
                        <div className="text-[9px] text-slate-400 space-y-1 pt-1 border-t border-slate-100 dark:border-slate-700/60">
                          <div className="flex justify-between">
                            <span>Semantic Cosine</span>
                            <span className="font-mono font-semibold">{Math.round(sug.scoreBreakdown.semantic * 100)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Shared Concepts</span>
                            <span className="font-mono font-semibold">{Math.round(sug.scoreBreakdown.sharedConcepts * 100)}%</span>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-1.5 pt-1">
                          <button
                            onClick={() => {
                              recordAiFeedback(sug.sourceTitle, sug.targetTitle, 'accepted');
                              onAcceptAiSuggestion(sug);
                            }}
                            className="flex-1 py-1 px-2 text-[11px] font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center justify-center gap-1 transition-colors"
                          >
                            <Check className="w-3 h-3" /> Connect
                          </button>
                          <button
                            onClick={() => {
                              recordAiFeedback(sug.sourceTitle, sug.targetTitle, 'rejected');
                              onRejectAiSuggestion(sug);
                            }}
                            className="py-1 px-2.5 text-[11px] text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Backlinks, Outgoing Links & Unlinked Mentions */}
        {activeTab === 'links' && (
          <div className="space-y-4">
            {/* Backlinks */}
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                Backlinks ({backlinks.length})
              </span>
              {backlinks.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No notes link to this page yet.</p>
              ) : (
                <div className="space-y-2">
                  {backlinks.map((b, idx) => (
                    <div
                      key={idx}
                      onClick={() => onNavigateToPage(b.sourcePageTitle)}
                      className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/80 hover:border-purple-400 cursor-pointer transition-all space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-purple-700 dark:text-purple-300">
                          {b.sourcePageTitle}
                        </span>
                        <span className="text-[10px] text-slate-400">{b.notebookName}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {b.snippet}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Page Aliases */}
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                Page Aliases ({pageAliases.length})
              </span>
              {pageAliases.length === 0 ? (
                <p className="text-xs text-slate-400 italic">
                  No aliases yet. Add <code className="text-purple-600 dark:text-purple-400 font-mono text-[11px]">aliases: [Alias]</code> in YAML frontmatter.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {pageAliases.map((alias, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 text-xs font-semibold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-950/60 rounded-md border border-purple-200 dark:border-purple-800"
                    >
                      {alias}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Outgoing Links */}
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                Outgoing Links ({outgoingLinks.length})
              </span>
              {outgoingLinks.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No outgoing wiki links in this note.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {outgoingLinks.map((link, idx) => (
                    <button
                      key={idx}
                      onClick={() => onNavigateToPage(link.targetTitle)}
                      className="px-2 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-purple-500 transition-colors"
                    >
                      [[{link.targetTitle}]]
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Unlinked Mentions */}
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                Unlinked Mentions ({unlinkedMentions.length})
              </span>
              {unlinkedMentions.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No unlinked mentions found.</p>
              ) : (
                <div className="space-y-2">
                  {unlinkedMentions.map((m, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-amber-200 dark:border-amber-900/50 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                          {m.sourcePageTitle}
                        </span>
                        <button
                          onClick={() => onConvertMentionToLink(m)}
                          className="px-2 py-0.5 text-[10px] font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-md transition-colors"
                        >
                          + Link
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                        {m.snippet}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Ask My Knowledge Local RAG */}
        {activeTab === 'chat' && (
          <div className="h-full flex flex-col justify-between">
            <div className="space-y-3 pb-3">
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-3 rounded-xl text-xs leading-relaxed space-y-1.5 ${
                    msg.sender === 'user'
                      ? 'bg-purple-600 text-white ml-4'
                      : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 mr-2 border border-slate-200 dark:border-slate-700 shadow-xs'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>

                  {/* Citations */}
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-700 space-y-1">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                        Sources Cited
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {msg.citations.map((c, idx) => (
                          <button
                            key={idx}
                            onClick={() => onNavigateToPage(c.pageTitle)}
                            className="px-1.5 py-0.5 text-[10px] font-semibold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 rounded border border-purple-200 dark:border-purple-800 hover:bg-purple-100"
                          >
                            [[{c.pageTitle}]]
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {isAsking && (
                <div className="p-3 bg-white dark:bg-slate-800 rounded-xl text-xs text-purple-600 dark:text-purple-400 font-medium animate-pulse">
                  Searching local knowledge vectors...
                </div>
              )}
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSendChat} className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-800 flex gap-1.5">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask about state management, Clean Architecture..."
                className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
              <button
                type="submit"
                disabled={!chatInput.trim() || isAsking}
                className="p-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* Tab 4: Document Outline */}
        {activeTab === 'outline' && (
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Table of Contents
            </span>
            {outlineHeadings.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No headings in this note.</p>
            ) : (
              <div className="space-y-1">
                {outlineHeadings.map((h, idx) => (
                  <div
                    key={idx}
                    className="text-xs text-slate-700 dark:text-slate-300 hover:text-purple-600 cursor-pointer py-1 truncate"
                    style={{ paddingLeft: `${(h.depth - 1) * 12}px` }}
                  >
                    {h.text}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
