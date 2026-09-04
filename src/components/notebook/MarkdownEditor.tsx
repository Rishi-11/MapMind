import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Bold,
  Italic,
  Strikethrough,
  List,
  CheckSquare,
  Code,
  Quote,
  Link as LinkIcon,
  BrainCircuit,
  Eye,
  Columns,
  Code2,
  Sparkles,
  Copy,
  Check,
  Tag,
  Star,
  Clock,
  FileText,
  AlertCircle,
  Info,
  Flame,
  ShieldAlert,
  Plus,
  Highlighter,
  ChevronDown,
  HelpCircle,
} from 'lucide-react';
import { Page, PageProperties } from '@/types/notebook';
import { parseFrontmatter, toggleMarkdownTask, getPageAliases } from '@/lib/notebook/links';

interface MarkdownEditorProps {
  page: Page;
  allPages: Page[];
  onUpdateContent: (pageId: string, content: string) => void;
  onUpdateTitle: (pageId: string, title: string) => void;
  onUpdateProperties?: (pageId: string, properties: PageProperties) => void;
  onToggleFavorite: (pageId: string) => void;
  onNavigateToPage: (pageTitle: string) => void;
  onOpenMindMapForPage: (page: Page) => void;
  onGenerateStudyDeck: (page: Page) => void;
}

type EditorViewMode = 'preview' | 'split' | 'source';

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  page,
  allPages,
  onUpdateContent,
  onUpdateTitle,
  onToggleFavorite,
  onNavigateToPage,
  onOpenMindMapForPage,
  onGenerateStudyDeck,
}) => {
  const [viewMode, setViewMode] = useState<EditorViewMode>('split');
  const [title, setTitle] = useState(page.title);
  const [content, setContent] = useState(page.content);
  const [isSaving, setIsSaving] = useState(false);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  // WikiLink autocomplete popup state
  interface AutocompleteMatch {
    page: Page;
    title: string;
    alias?: string;
  }

  const [autocompleteOpen, setAutocompleteOpen] = useState(false);
  const [autocompleteQuery, setAutocompleteQuery] = useState('');
  const [autocompleteIndex, setAutocompleteIndex] = useState(0);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [calloutDropdownOpen, setCalloutDropdownOpen] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const pageIdRef = useRef(page.id);
  const titleRef = useRef(title);
  const onUpdateContentRef = useRef(onUpdateContent);
  const onUpdateTitleRef = useRef(onUpdateTitle);

  // Keep callback and state refs fresh on every render
  useEffect(() => {
    pageIdRef.current = page.id;
    titleRef.current = title;
    onUpdateContentRef.current = onUpdateContent;
    onUpdateTitleRef.current = onUpdateTitle;
  });

  // Sync internal state and clean up pending timers when active page changes or unmounts
  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    setTitle(page.title);
    setContent(page.content);
    setIsSaving(false);
    setAutocompleteOpen(false);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
    };
  }, [page.id, page.title, page.content]);

  const { properties, body } = useMemo(() => parseFrontmatter(content), [content]);

  // Debounced auto-save handler & Auto-Title sync from "# Heading"
  const handleContentChange = (newContent: string) => {
    const targetPageId = page.id;
    setContent(newContent);
    setIsSaving(true);

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      // Auto-sync page title if the user writes or updates "# Heading" in the markdown
      const firstHeadingMatch = newContent.match(/(?:^|\n)#\s+([^\n#]+)/);
      if (firstHeadingMatch) {
        const extractedTitle = firstHeadingMatch[1].trim();
        if (extractedTitle && extractedTitle !== titleRef.current) {
          setTitle(extractedTitle);
          titleRef.current = extractedTitle;
          onUpdateTitleRef.current(targetPageId, extractedTitle);
        }
      }
      onUpdateContentRef.current(targetPageId, newContent);
      setIsSaving(false);
      saveTimeoutRef.current = null;
    }, 350);

    // Check for wiki-link trigger "[["
    if (textareaRef.current) {
      const pos = textareaRef.current.selectionStart;
      const textBeforeCursor = newContent.slice(0, pos);
      const lastDoubleBracket = textBeforeCursor.lastIndexOf('[[');

      if (lastDoubleBracket !== -1 && !textBeforeCursor.slice(lastDoubleBracket).includes(']]')) {
        const query = textBeforeCursor.slice(lastDoubleBracket + 2);
        if (!query.includes('\n')) {
          setAutocompleteQuery(query);
          setAutocompleteOpen(true);
          setCursorPosition(pos);
          setAutocompleteIndex(0);
          return;
        }
      }
    }
    setAutocompleteOpen(false);
  };

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    titleRef.current = newTitle;
    onUpdateTitle(page.id, newTitle);

    // If note starts with a top level heading # OldTitle, keep markdown heading in sync
    if (content.match(/^#\s+[^\n]+/)) {
      const updated = content.replace(/^#\s+[^\n]+/, `# ${newTitle}`);
      setContent(updated);
      onUpdateContent(page.id, updated);
    }
  };

  const handleTitleBlur = () => {
    if (title.trim() && title !== page.title) {
      onUpdateTitle(page.id, title.trim());
    }
  };

  // Autocomplete matching pages & aliases
  const matchingPages = useMemo<AutocompleteMatch[]>(() => {
    if (!autocompleteOpen) return [];
    const query = autocompleteQuery.toLowerCase().trim();
    const results: AutocompleteMatch[] = [];

    for (const p of allPages) {
      if (p.id === page.id) continue;

      // Match Page Title
      if (p.title.toLowerCase().includes(query)) {
        results.push({ page: p, title: p.title });
      }

      // Match Page Aliases
      const aliases = getPageAliases(p);
      for (const alias of aliases) {
        if (alias.toLowerCase().includes(query) && alias.toLowerCase() !== p.title.toLowerCase()) {
          results.push({ page: p, title: p.title, alias });
        }
      }
    }

    return results.slice(0, 8);
  }, [allPages, autocompleteOpen, autocompleteQuery, page.id]);

  // Dynamic Caret Coordinates for Autocomplete Popup (positions strictly below/above cursor line so it never blocks typing)
  const popupCoords = useMemo(() => {
    if (!textareaRef.current) return { top: 64, left: 32 };
    const el = textareaRef.current;
    const textBefore = content.slice(0, cursorPosition);
    const lines = textBefore.split('\n');
    const currentLineIndex = lines.length - 1;
    const currentColIndex = lines[currentLineIndex]?.length || 0;

    const style = window.getComputedStyle(el);
    const lineHeight = parseFloat(style.lineHeight) || 22;
    const paddingTop = parseFloat(style.paddingTop) || 24;
    const paddingLeft = parseFloat(style.paddingLeft) || 24;

    // Monospace text-sm char width is ~8.4px
    const charWidth = 8.4;

    // Position popup strictly BELOW the current line with safe clearance
    let top = paddingTop + (currentLineIndex + 1) * lineHeight - (el.scrollTop || 0) + 8;
    let left = paddingLeft + currentColIndex * charWidth;

    const containerWidth = el.clientWidth || 600;
    const popupWidth = 320;
    const maxAllowedLeft = containerWidth - popupWidth - 24;

    if (left > maxAllowedLeft) {
      left = Math.max(16, maxAllowedLeft);
    }

    // If near bottom of container, flip above the line
    const containerHeight = el.clientHeight || 500;
    if (top + 240 > containerHeight && top > 260) {
      top = paddingTop + currentLineIndex * lineHeight - (el.scrollTop || 0) - 240;
    }

    return {
      top: Math.max(12, Math.round(top)),
      left: Math.max(16, Math.round(left)),
    };
  }, [cursorPosition, autocompleteOpen, content, scrollOffset]);

  const insertWikiLink = (targetTitle: string, alias?: string, autoCreate = false) => {
    if (!textareaRef.current) return;
    const textBefore = content.slice(0, cursorPosition);
    const lastDoubleBracket = textBefore.lastIndexOf('[[');
    const textAfter = content.slice(cursorPosition);

    const linkText = alias ? `[[${targetTitle}|${alias}]]` : `[[${targetTitle}]]`;
    const newContent = content.slice(0, lastDoubleBracket) + linkText + textAfter;

    handleContentChange(newContent);
    setAutocompleteOpen(false);

    if (autoCreate && !allPages.some((p) => p.title.toLowerCase().trim() === targetTitle.toLowerCase().trim())) {
      onNavigateToPage(targetTitle);
    }

    setTimeout(() => {
      if (textareaRef.current) {
        const newPos = lastDoubleBracket + linkText.length;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newPos, newPos);
      }
    }, 50);
  };

  // Obsidian Hotkeys & Selection Auto-Pairing
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const isCtrlOrCmd = isMac ? e.metaKey : e.ctrlKey;

    // 1. Autocomplete Popup Navigation
    if (autocompleteOpen) {
      if (matchingPages.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setAutocompleteIndex((prev) => (prev + 1) % matchingPages.length);
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setAutocompleteIndex((prev) => (prev - 1 + matchingPages.length) % matchingPages.length);
          return;
        }
        if (e.key === 'Enter' || e.key === 'Tab') {
          e.preventDefault();
          const match = matchingPages[autocompleteIndex];
          insertWikiLink(match.title, match.alias, false);
          return;
        }
      } else if (autocompleteQuery.trim().length > 0) {
        if (e.key === 'Enter' || e.key === 'Tab') {
          e.preventDefault();
          const target = autocompleteQuery.trim();
          insertWikiLink(target, undefined, true);
          return;
        }
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setAutocompleteOpen(false);
        return;
      }
    }

    // 2. Obsidian Hotkeys
    // Ctrl/Cmd + K -> Insert WikiLink / Alias Link [[Page|Alias]]
    if (isCtrlOrCmd && e.key.toLowerCase() === 'k' && !e.shiftKey) {
      e.preventDefault();
      if (!textareaRef.current) return;
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      const selected = content.slice(start, end);

      if (selected.trim().length > 0) {
        // Wrap selection as alias [[Target|Selected]]
        const replacement = `[[|${selected}]]`;
        const newContent = content.slice(0, start) + replacement + content.slice(end);
        handleContentChange(newContent);
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.setSelectionRange(start + 2, start + 2);
          }
        }, 50);
      } else {
        // Insert [[]] and trigger autocomplete
        const replacement = '[[]]';
        const newContent = content.slice(0, start) + replacement + content.slice(end);
        handleContentChange(newContent);
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.setSelectionRange(start + 2, start + 2);
            setCursorPosition(start + 2);
            setAutocompleteQuery('');
            setAutocompleteOpen(true);
            setAutocompleteIndex(0);
          }
        }, 50);
      }
      return;
    }

    // Ctrl/Cmd + Enter -> Toggle / Cycle Task Checkbox on current line
    if (isCtrlOrCmd && e.key === 'Enter') {
      e.preventDefault();
      if (!textareaRef.current) return;
      const pos = textareaRef.current.selectionStart;
      const lines = content.split(/\r?\n/);
      let charCount = 0;
      let currentLineIdx = 0;

      for (let i = 0; i < lines.length; i++) {
        const lineLen = lines[i].length + 1; // +1 for newline
        if (charCount + lineLen > pos || i === lines.length - 1) {
          currentLineIdx = i;
          break;
        }
        charCount += lineLen;
      }

      const line = lines[currentLineIdx];
      let updatedLine = line;
      if (line.match(/^(\s*)[-*+]\s*\[ \]\s*(.*)$/)) {
        updatedLine = line.replace(/^(\s*)[-*+]\s*\[ \]\s*/, '$1- [x] ');
      } else if (line.match(/^(\s*)[-*+]\s*\[[xX]\]\s*(.*)$/)) {
        updatedLine = line.replace(/^(\s*)[-*+]\s*\[[xX]\]\s*/, '$1');
      } else {
        updatedLine = line.replace(/^(\s*)(.*)$/, '$1- [ ] $2');
      }

      lines[currentLineIdx] = updatedLine;
      const newContent = lines.join('\n');
      handleContentChange(newContent);
      return;
    }

    // Ctrl/Cmd + Shift + H -> Highlight ==text==
    if (isCtrlOrCmd && e.shiftKey && e.key.toLowerCase() === 'h') {
      e.preventDefault();
      applyFormatting('==', '==');
      return;
    }

    // Ctrl/Cmd + Shift + S -> Strikethrough ~~text~~
    if (isCtrlOrCmd && e.shiftKey && e.key.toLowerCase() === 's') {
      e.preventDefault();
      applyFormatting('~~', '~~');
      return;
    }

    // Ctrl/Cmd + Shift + C -> Insert Callout
    if (isCtrlOrCmd && e.shiftKey && e.key.toLowerCase() === 'c') {
      e.preventDefault();
      applyFormatting('> [!NOTE]\n> ', '');
      return;
    }

    // Ctrl/Cmd + B -> Bold
    if (isCtrlOrCmd && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      applyFormatting('**', '**');
      return;
    }

    // Ctrl/Cmd + I -> Italic
    if (isCtrlOrCmd && e.key.toLowerCase() === 'i') {
      e.preventDefault();
      applyFormatting('*', '*');
      return;
    }

    // 3. Selection Auto-Pairing (Bracket/Quote/Marker Wrapping)
    if (textareaRef.current) {
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      if (start !== end) {
        const selected = content.slice(start, end);
        const pairs: Record<string, [string, string]> = {
          '[': ['[[', ']]'],
          '(': ['(', ')'],
          '{': ['{', '}'],
          '"': ['"', '"'],
          "'": ["'", "'"],
          '`': ['`', '`'],
          '*': ['**', '**'],
          '=': ['==', '=='],
          '~': ['~~', '~~'],
        };

        if (pairs[e.key]) {
          e.preventDefault();
          const [prefix, suffix] = pairs[e.key];
          const replacement = `${prefix}${selected}${suffix}`;
          const newContent = content.slice(0, start) + replacement + content.slice(end);
          handleContentChange(newContent);
          setTimeout(() => {
            if (textareaRef.current) {
              textareaRef.current.focus();
              textareaRef.current.setSelectionRange(start + prefix.length, end + prefix.length);
            }
          }, 50);
          return;
        }
      }
    }
  };

  // Insert markdown helpers
  const applyFormatting = (prefix: string, suffix = '') => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const selected = content.slice(start, end);
    const replacement = `${prefix}${selected || 'text'}${suffix}`;
    const newContent = content.slice(0, start) + replacement + content.slice(end);

    handleContentChange(newContent);

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(
          start + prefix.length,
          start + prefix.length + (selected.length || 4)
        );
      }
    }, 50);
  };

  // Interactive checkbox toggling directly in preview
  const handleToggleTaskInContent = (taskLineIndex: number) => {
    const newContent = toggleMarkdownTask(content, taskLineIndex);
    handleContentChange(newContent);
  };

  // Word & character stats
  const stats = useMemo(() => {
    const cleanText = body.replace(/#+|_|\*|`|\[\[|\]\]/g, '');
    const words = cleanText.trim().split(/\s+/).filter(Boolean).length;
    const chars = cleanText.length;
    const readingTime = Math.max(1, Math.ceil(words / 200));
    return { words, chars, readingTime };
  }, [body]);

  // Render Rich Markdown Preview
  const renderMarkdown = (fullMarkdown: string) => {
    const lines = fullMarkdown.split(/\r?\n/);
    const elements: React.ReactNode[] = [];
    let inCodeBlock = false;
    let codeLanguage = '';
    let codeContent: string[] = [];
    let codeBlockIndex = 0;
    let inFrontmatter = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Skip YAML frontmatter header block in preview
      if (i === 0 && line.trim() === '---') {
        inFrontmatter = true;
        continue;
      }
      if (inFrontmatter) {
        if (line.trim() === '---') {
          inFrontmatter = false;
        }
        continue;
      }

      // Code Block Start/End
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          // Close code block
          const fullCode = codeContent.join('\n');
          const blockId = `code-block-${codeBlockIndex++}`;
          elements.push(
            <div key={blockId} className="my-4 rounded-xl overflow-hidden bg-slate-900 border border-slate-800 text-slate-100 shadow-md">
              <div className="flex items-center justify-between px-3.5 py-1.5 bg-slate-800/80 border-b border-slate-700 text-xs text-slate-400 font-mono">
                <span>{codeLanguage || 'code'}</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(fullCode);
                    setCopiedCodeId(blockId);
                    setTimeout(() => setCopiedCodeId(null), 2000);
                  }}
                  className="flex items-center gap-1 hover:text-white transition-colors"
                >
                  {copiedCodeId === blockId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCodeId === blockId ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre className="p-3.5 text-xs font-mono overflow-x-auto text-emerald-300 leading-relaxed">
                <code>{fullCode}</code>
              </pre>
            </div>
          );
          inCodeBlock = false;
          codeContent = [];
          codeLanguage = '';
        } else {
          inCodeBlock = true;
          codeLanguage = line.slice(3).trim();
          codeContent = [];
        }
        continue;
      }

      if (inCodeBlock) {
        codeContent.push(line);
        continue;
      }

      // Callouts: > [!NOTE], > [!TIP], > [!WARNING], > [!IMPORTANT], > [!CAUTION], > [!INFO], > [!TODO], > [!DANGER], > [!BUG], > [!SUCCESS], > [!QUESTION], > [!QUOTE], > [!EXAMPLE]
      // Supports foldable syntax: > [!NOTE]- Folded or > [!NOTE]+ Open
      const calloutMatch = line.match(/^>\s*\[!(NOTE|TIP|WARNING|IMPORTANT|CAUTION|INFO|TODO|DANGER|ERROR|BUG|SUCCESS|CHECK|DONE|QUESTION|HELP|FAQ|QUOTE|CITE|EXAMPLE)\]([-+])?\s*(.*)$/i);
      if (calloutMatch) {
        const type = calloutMatch[1].toUpperCase();
        const foldChar = calloutMatch[2]; // '-' or '+' or undefined
        const titleOverride = calloutMatch[3]?.trim();
        let calloutBody: string[] = [];

        // Collect following blockquote lines
        while (i + 1 < lines.length && lines[i + 1].startsWith('>')) {
          i++;
          calloutBody.push(lines[i].replace(/^>\s*/, ''));
        }

        const calloutStyles: Record<string, { bg: string; border: string; text: string; icon: React.ReactNode; defaultTitle: string }> = {
          NOTE: { bg: 'bg-blue-50/70 dark:bg-blue-950/30', border: 'border-blue-500', text: 'text-blue-900 dark:text-blue-200', icon: <Info className="w-4 h-4 text-blue-500 shrink-0" />, defaultTitle: 'Note' },
          INFO: { bg: 'bg-blue-50/70 dark:bg-blue-950/30', border: 'border-blue-500', text: 'text-blue-900 dark:text-blue-200', icon: <Info className="w-4 h-4 text-blue-500 shrink-0" />, defaultTitle: 'Info' },
          TODO: { bg: 'bg-sky-50/70 dark:bg-sky-950/30', border: 'border-sky-500', text: 'text-sky-900 dark:text-sky-200', icon: <CheckSquare className="w-4 h-4 text-sky-500 shrink-0" />, defaultTitle: 'Todo' },
          TIP: { bg: 'bg-emerald-50/70 dark:bg-emerald-950/30', border: 'border-emerald-500', text: 'text-emerald-900 dark:text-emerald-200', icon: <Sparkles className="w-4 h-4 text-emerald-500 shrink-0" />, defaultTitle: 'Tip' },
          HINT: { bg: 'bg-emerald-50/70 dark:bg-emerald-950/30', border: 'border-emerald-500', text: 'text-emerald-900 dark:text-emerald-200', icon: <Sparkles className="w-4 h-4 text-emerald-500 shrink-0" />, defaultTitle: 'Hint' },
          IMPORTANT: { bg: 'bg-purple-50/70 dark:bg-purple-950/30', border: 'border-purple-500', text: 'text-purple-900 dark:text-purple-200', icon: <Flame className="w-4 h-4 text-purple-500 shrink-0" />, defaultTitle: 'Important' },
          WARNING: { bg: 'bg-amber-50/70 dark:bg-amber-950/30', border: 'border-amber-500', text: 'text-amber-900 dark:text-amber-200', icon: <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />, defaultTitle: 'Warning' },
          CAUTION: { bg: 'bg-orange-50/70 dark:bg-orange-950/30', border: 'border-orange-500', text: 'text-orange-900 dark:text-orange-200', icon: <ShieldAlert className="w-4 h-4 text-orange-500 shrink-0" />, defaultTitle: 'Caution' },
          DANGER: { bg: 'bg-rose-50/70 dark:bg-rose-950/30', border: 'border-rose-500', text: 'text-rose-900 dark:text-rose-200', icon: <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0" />, defaultTitle: 'Danger' },
          ERROR: { bg: 'bg-rose-50/70 dark:bg-rose-950/30', border: 'border-rose-500', text: 'text-rose-900 dark:text-rose-200', icon: <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0" />, defaultTitle: 'Error' },
          BUG: { bg: 'bg-red-50/70 dark:bg-red-950/30', border: 'border-red-500', text: 'text-red-900 dark:text-red-200', icon: <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />, defaultTitle: 'Bug' },
          SUCCESS: { bg: 'bg-emerald-50/70 dark:bg-emerald-950/30', border: 'border-emerald-500', text: 'text-emerald-900 dark:text-emerald-200', icon: <Check className="w-4 h-4 text-emerald-500 shrink-0" />, defaultTitle: 'Success' },
          CHECK: { bg: 'bg-emerald-50/70 dark:bg-emerald-950/30', border: 'border-emerald-500', text: 'text-emerald-900 dark:text-emerald-200', icon: <Check className="w-4 h-4 text-emerald-500 shrink-0" />, defaultTitle: 'Check' },
          DONE: { bg: 'bg-emerald-50/70 dark:bg-emerald-950/30', border: 'border-emerald-500', text: 'text-emerald-900 dark:text-emerald-200', icon: <Check className="w-4 h-4 text-emerald-500 shrink-0" />, defaultTitle: 'Done' },
          QUESTION: { bg: 'bg-indigo-50/70 dark:bg-indigo-950/30', border: 'border-indigo-500', text: 'text-indigo-900 dark:text-indigo-200', icon: <HelpCircle className="w-4 h-4 text-indigo-500 shrink-0" />, defaultTitle: 'Question' },
          HELP: { bg: 'bg-indigo-50/70 dark:bg-indigo-950/30', border: 'border-indigo-500', text: 'text-indigo-900 dark:text-indigo-200', icon: <HelpCircle className="w-4 h-4 text-indigo-500 shrink-0" />, defaultTitle: 'Help' },
          FAQ: { bg: 'bg-indigo-50/70 dark:bg-indigo-950/30', border: 'border-indigo-500', text: 'text-indigo-900 dark:text-indigo-200', icon: <HelpCircle className="w-4 h-4 text-indigo-500 shrink-0" />, defaultTitle: 'FAQ' },
          QUOTE: { bg: 'bg-slate-100/80 dark:bg-slate-900/60', border: 'border-slate-400 dark:border-slate-600', text: 'text-slate-800 dark:text-slate-200', icon: <Quote className="w-4 h-4 text-slate-500 shrink-0" />, defaultTitle: 'Quote' },
          CITE: { bg: 'bg-slate-100/80 dark:bg-slate-900/60', border: 'border-slate-400 dark:border-slate-600', text: 'text-slate-800 dark:text-slate-200', icon: <Quote className="w-4 h-4 text-slate-500 shrink-0" />, defaultTitle: 'Cite' },
          EXAMPLE: { bg: 'bg-violet-50/70 dark:bg-violet-950/30', border: 'border-violet-500', text: 'text-violet-900 dark:text-violet-200', icon: <List className="w-4 h-4 text-violet-500 shrink-0" />, defaultTitle: 'Example' },
        };

        const style = calloutStyles[type] || calloutStyles.NOTE;
        const displayTitle = titleOverride || style.defaultTitle;
        const isFoldable = foldChar === '-' || foldChar === '+';
        const defaultOpen = foldChar !== '-';

        elements.push(
          <details
            key={`callout-${i}`}
            open={defaultOpen}
            className={`my-4 rounded-xl border-l-4 ${style.border} ${style.bg} shadow-xs group`}
          >
            <summary className={`flex items-center justify-between p-3 select-none font-bold text-xs uppercase tracking-wider list-none ${isFoldable ? 'cursor-pointer hover:opacity-80' : ''}`}>
              <div className="flex items-center gap-2">
                {style.icon}
                <span className={style.text}>{displayTitle}</span>
              </div>
              {isFoldable && (
                <span className="text-[10px] opacity-60 font-mono group-open:rotate-180 transition-transform">▼</span>
              )}
            </summary>
            <div className={`px-3.5 pb-3.5 pt-0.5 text-xs ${style.text} leading-relaxed space-y-1`}>
              {calloutBody.map((cb, idx) => (
                <p key={idx} className="mt-0.5">{renderInlineFormatting(cb)}</p>
              ))}
            </div>
          </details>
        );
        continue;
      }

      // Checklists: - [ ] or - [x]
      const taskMatch = line.match(/^(\s*)[-*+]\s*\[([ xX])\]\s*(.*)$/);
      if (taskMatch) {
        const isChecked = taskMatch[2].toLowerCase() === 'x';
        const taskText = taskMatch[3];
        const lineIdx = i;

        elements.push(
          <div key={`task-${i}`} className="flex items-start gap-2.5 my-1 text-xs text-slate-800 dark:text-slate-200">
            <input
              type="checkbox"
              checked={isChecked}
              onChange={() => handleToggleTaskInContent(lineIdx)}
              className="mt-0.5 w-3.5 h-3.5 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
            />
            <span className={isChecked ? 'line-through text-slate-400 dark:text-slate-500' : ''}>
              {renderInlineFormatting(taskText)}
            </span>
          </div>
        );
        continue;
      }

      // Headings
      if (line.startsWith('# ')) {
        elements.push(
          <h1 key={`h1-${i}`} className="text-2xl font-black text-slate-900 dark:text-white mt-6 mb-3 tracking-tight border-b border-slate-200 dark:border-slate-800 pb-1.5">
            {renderInlineFormatting(line.slice(2))}
          </h1>
        );
        continue;
      }
      if (line.startsWith('## ')) {
        elements.push(
          <h2 key={`h2-${i}`} className="text-lg font-bold text-slate-800 dark:text-slate-100 mt-5 mb-2 tracking-tight">
            {renderInlineFormatting(line.slice(3))}
          </h2>
        );
        continue;
      }
      if (line.startsWith('### ')) {
        elements.push(
          <h3 key={`h3-${i}`} className="text-sm font-bold text-purple-700 dark:text-purple-400 mt-4 mb-1.5 tracking-tight">
            {renderInlineFormatting(line.slice(4))}
          </h3>
        );
        continue;
      }

      // Blockquote
      if (line.startsWith('> ')) {
        elements.push(
          <blockquote key={`quote-${i}`} className="border-l-3 border-purple-400 pl-3.5 py-1 my-2 text-xs italic text-slate-600 dark:text-slate-300 bg-purple-50/40 dark:bg-purple-950/20 rounded-r-lg">
            {renderInlineFormatting(line.slice(2))}
          </blockquote>
        );
        continue;
      }

      // Bullet List
      if (line.match(/^(\s*)[-*+]\s+(.*)$/)) {
        const bulletText = line.replace(/^(\s*)[-*+]\s+/, '');
        elements.push(
          <li key={`li-${i}`} className="ml-5 list-disc text-xs text-slate-700 dark:text-slate-300 my-0.5 leading-relaxed">
            {renderInlineFormatting(bulletText)}
          </li>
        );
        continue;
      }

      // Empty line
      if (!line.trim()) {
        elements.push(<div key={`blank-${i}`} className="h-2" />);
        continue;
      }

      // Standard Paragraph
      elements.push(
        <p key={`p-${i}`} className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed my-1">
          {renderInlineFormatting(line)}
        </p>
      );
    }

    return elements;
  };

  // Render Inline Markdown: Bold, Italic, Code, KaTeX Math, WikiLinks [[...]], Highlights ==...==, Strike ~~...~~
  const renderInlineFormatting = (text: string): React.ReactNode => {
    // Match WikiLinks [[Page Title|Display]]
    const parts: React.ReactNode[] = [];
    const wikiRegex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = wikiRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(renderBasicInline(text.slice(lastIndex, match.index), `sub-${lastIndex}`));
      }

      const targetTitle = match[1].trim();
      const displayText = match[2]?.trim() || targetTitle;

      parts.push(
        <button
          key={`wiki-${match.index}`}
          onClick={(e) => {
            e.stopPropagation();
            onNavigateToPage(targetTitle);
          }}
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 mx-0.5 text-[11px] font-semibold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-950/60 hover:bg-purple-200 dark:hover:bg-purple-900 rounded border border-purple-200 dark:border-purple-800 transition-colors shadow-xs"
          title={`Jump to note: ${targetTitle}`}
        >
          <span className="opacity-60 text-[9px]">[[</span>
          <span className="underline decoration-dotted">{displayText}</span>
          <span className="opacity-60 text-[9px]">]]</span>
        </button>
      );

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      parts.push(renderBasicInline(text.slice(lastIndex), `sub-end-${lastIndex}`));
    }

    return parts.length > 0 ? parts : text;
  };

  const renderBasicInline = (text: string, keyPrefix: string): React.ReactNode => {
    // 1. Split by inline code `code`
    const codeParts = text.split(/`([^`]+)`/g);
    return codeParts.map((chunk, idx) => {
      if (idx % 2 === 1) {
        return (
          <code key={`${keyPrefix}-code-${idx}`} className="px-1.5 py-0.5 text-[11px] font-mono bg-slate-100 dark:bg-slate-800 text-pink-600 dark:text-pink-400 rounded border border-slate-200 dark:border-slate-700">
            {chunk}
          </code>
        );
      }

      // 2. Split by Highlight ==highlight==
      const highlightParts = chunk.split(/==([^=]+)==/g);
      return highlightParts.map((hChunk, hIdx) => {
        if (hIdx % 2 === 1) {
          return (
            <mark key={`${keyPrefix}-mark-${idx}-${hIdx}`} className="bg-amber-200/90 dark:bg-amber-400/30 text-slate-900 dark:text-amber-100 px-1 py-0.5 rounded font-medium shadow-xs">
              {hChunk}
            </mark>
          );
        }

        // 3. Split by Strikethrough ~~strike~~
        const strikeParts = hChunk.split(/~~([^~]+)~~/g);
        return strikeParts.map((sChunk, sIdx) => {
          if (sIdx % 2 === 1) {
            return (
              <del key={`${keyPrefix}-del-${idx}-${hIdx}-${sIdx}`} className="line-through text-slate-400 dark:text-slate-500">
                {sChunk}
              </del>
            );
          }

          // 4. Handle bold **text**
          const boldParts = sChunk.split(/\*\*([^*]+)\*\*/g);
          return boldParts.map((bChunk, bIdx) => {
            if (bIdx % 2 === 1) {
              return <strong key={`${keyPrefix}-bold-${idx}-${hIdx}-${sIdx}-${bIdx}`} className="font-bold text-slate-900 dark:text-white">{bChunk}</strong>;
            }

            // 5. Handle italic *text*
            const italicParts = bChunk.split(/\*([^*]+)\*/g);
            return italicParts.map((iChunk, iIdx) => {
              if (iIdx % 2 === 1) {
                return <em key={`${keyPrefix}-em-${idx}-${hIdx}-${sIdx}-${bIdx}-${iIdx}`} className="italic text-slate-800 dark:text-slate-200">{iChunk}</em>;
              }

              // 6. Handle tags #tag
              const tagParts = iChunk.split(/(#[a-zA-Z0-9_\-/]+)/g);
              return tagParts.map((tChunk, tIdx) => {
                if (tChunk.startsWith('#') && tChunk.length > 1) {
                  return (
                    <span key={`${keyPrefix}-tag-${idx}-${hIdx}-${sIdx}-${bIdx}-${iIdx}-${tIdx}`} className="inline-flex items-center text-purple-600 dark:text-purple-400 font-medium hover:underline">
                      {tChunk}
                    </span>
                  );
                }
                return tChunk;
              });
            });
          });
        });
      });
    });
  };

  return (
    <div className="flex-1 h-full flex flex-col bg-white dark:bg-slate-950 overflow-hidden relative">
      {/* Top Editor Toolbar */}
      <div className="h-10 border-b border-slate-100 dark:border-slate-800/60 px-3 sm:px-4 flex items-center justify-between bg-white/60 dark:bg-slate-950/60 backdrop-blur-xs shrink-0 select-none">
        {/* Formatting Actions */}
        <div className="flex items-center gap-0.5 overflow-x-auto custom-scrollbar py-0.5">
          <button
            onClick={() => applyFormatting('**', '**')}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            title="Bold (Ctrl+B)"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => applyFormatting('*', '*')}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            title="Italic (Ctrl+I)"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => applyFormatting('~~', '~~')}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            title="Strikethrough (Ctrl+Shift+S)"
          >
            <Strikethrough className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => applyFormatting('==', '==')}
            className="p-1.5 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-950/40 text-amber-500 hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
            title="Highlight Marker (Ctrl+Shift+H)"
          >
            <Highlighter className="w-3.5 h-3.5" />
          </button>
          <div className="w-px h-3 bg-slate-200 dark:bg-slate-800 mx-0.5" />
          <button
            onClick={() => applyFormatting('# ')}
            className="px-1.5 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-bold text-xs transition-colors"
            title="Heading 1"
          >
            H1
          </button>
          <button
            onClick={() => applyFormatting('## ')}
            className="px-1.5 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-bold text-xs transition-colors"
            title="Heading 2"
          >
            H2
          </button>
          <button
            onClick={() => applyFormatting('### ')}
            className="px-1.5 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-bold text-xs transition-colors"
            title="Heading 3"
          >
            H3
          </button>
          <div className="w-px h-3 bg-slate-200 dark:bg-slate-800 mx-0.5" />
          <button
            onClick={() => applyFormatting('- [ ] ')}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            title="Checklist Task (Ctrl+Enter)"
          >
            <CheckSquare className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => applyFormatting('- ')}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            title="Bulleted List"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => applyFormatting('`', '`')}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            title="Inline Code (`)"
          >
            <Code className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => applyFormatting('[[', ']]')}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            title="Wiki Link [[...]] (Ctrl+K)"
          >
            <LinkIcon className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => applyFormatting('[[|', ']]')}
            className="px-1.5 py-0.5 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-950/40 text-purple-600 dark:text-purple-400 font-mono text-[10px] font-bold border border-purple-200 dark:border-purple-800/60 transition-colors"
            title="Link with Alias [[Page|Alias]]"
          >
            [[|]]
          </button>

          {/* Callout Dropdown Menu */}
          <div className="relative">
            <button
              onClick={() => setCalloutDropdownOpen(!calloutDropdownOpen)}
              className="flex items-center gap-0.5 px-1.5 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-xs transition-colors"
              title="Insert Callout (Ctrl+Shift+C)"
            >
              <Quote className="w-3.5 h-3.5" />
              <ChevronDown className="w-2.5 h-2.5 opacity-60" />
            </button>

            {calloutDropdownOpen && (
              <div
                className="absolute left-0 top-full mt-1 w-44 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 py-1.5 z-50 text-xs"
                onMouseLeave={() => setCalloutDropdownOpen(false)}
              >
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Obsidian Callouts
                </div>
                {[
                  { type: 'NOTE', label: 'Note', icon: <Info className="w-3.5 h-3.5 text-blue-500" /> },
                  { type: 'TIP', label: 'Tip', icon: <Sparkles className="w-3.5 h-3.5 text-emerald-500" /> },
                  { type: 'WARNING', label: 'Warning', icon: <AlertCircle className="w-3.5 h-3.5 text-amber-500" /> },
                  { type: 'IMPORTANT', label: 'Important', icon: <Flame className="w-3.5 h-3.5 text-purple-500" /> },
                  { type: 'CAUTION', label: 'Caution', icon: <ShieldAlert className="w-3.5 h-3.5 text-orange-500" /> },
                  { type: 'SUCCESS', label: 'Success', icon: <Check className="w-3.5 h-3.5 text-emerald-500" /> },
                  { type: 'QUESTION', label: 'Question', icon: <HelpCircle className="w-3.5 h-3.5 text-indigo-500" /> },
                  { type: 'TODO', label: 'Todo', icon: <CheckSquare className="w-3.5 h-3.5 text-sky-500" /> },
                  { type: 'QUOTE', label: 'Quote', icon: <Quote className="w-3.5 h-3.5 text-slate-500" /> },
                  { type: 'EXAMPLE', label: 'Example', icon: <List className="w-3.5 h-3.5 text-violet-500" /> },
                ].map((item) => (
                  <button
                    key={item.type}
                    onClick={() => {
                      applyFormatting(`> [!${item.type}]\n> `, '');
                      setCalloutDropdownOpen(false);
                    }}
                    className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-left transition-colors"
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Tools: View Mode Switcher + Mind Map Generator Action */}
        <div className="flex items-center gap-1.5 shrink-0">

          <button
            onClick={() => onOpenMindMapForPage(page)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white shadow-xs transition-all"
            title="Visualize this Note as an Interactive Mind Map"
          >
            <BrainCircuit className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Open Mind Map</span>
          </button>

          <button
            onClick={() => onGenerateStudyDeck(page)}
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-colors"
            title="Study this Note (Flashcards & Quiz)"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-500" />
            <span className="hidden md:inline">Study</span>
          </button>

          <div className="w-px h-3.5 bg-slate-200 dark:bg-slate-800 mx-0.5" />

          {/* View Mode Buttons */}
          <div className="flex items-center bg-slate-100/70 dark:bg-slate-800/60 p-0.5 rounded-lg">
            <button
              onClick={() => setViewMode('split')}
              className={`px-2 py-0.5 rounded-md text-xs font-medium flex items-center gap-1 transition-all ${
                viewMode === 'split'
                  ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-300 shadow-xs font-semibold'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100'
              }`}
              title="Split View (Editor + Live Preview)"
            >
              <Columns className="w-3 h-3" />
              <span className="hidden sm:inline">Split</span>
            </button>
            <button
              onClick={() => setViewMode('preview')}
              className={`px-2 py-0.5 rounded-md text-xs font-medium flex items-center gap-1 transition-all ${
                viewMode === 'preview'
                  ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-300 shadow-xs font-semibold'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100'
              }`}
              title="Live Preview"
            >
              <Eye className="w-3 h-3" />
              <span className="hidden sm:inline">Preview</span>
            </button>
            <button
              onClick={() => setViewMode('source')}
              className={`px-2 py-0.5 rounded-md text-xs font-medium flex items-center gap-1 transition-all ${
                viewMode === 'source'
                  ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-300 shadow-xs font-semibold'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100'
              }`}
              title="Source Markdown"
            >
              <Code2 className="w-3 h-3" />
              <span className="hidden sm:inline">Source</span>
            </button>
          </div>
        </div>
      </div>

      {/* Page Title & Properties Header */}
      <div className="px-6 pt-5 pb-3 border-b border-slate-100 dark:border-slate-900">
        <div className="flex items-center justify-between gap-3">
          <input
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            onBlur={handleTitleBlur}
            placeholder="Untitled Page"
            className="flex-1 text-2xl font-black text-slate-900 dark:text-white bg-transparent border-0 focus:outline-none placeholder-slate-300 dark:placeholder-slate-700 tracking-tight"
          />

          <button
            onClick={() => onToggleFavorite(page.id)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 transition-colors"
            title="Toggle Favorite"
          >
            <Star className={`w-5 h-5 ${page.favorite ? 'text-amber-400 fill-amber-400' : ''}`} />
          </button>
        </div>

        {/* Frontmatter Property Pills */}
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            <Tag className="w-3 h-3 text-purple-500" />
            <span>Type: {page.pageType || 'concept'}</span>
          </span>

          {properties.status && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
              Status: {properties.status}
            </span>
          )}

          {properties.priority && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300">
              Priority: {properties.priority}
            </span>
          )}

          {page.tags && page.tags.map((t) => (
            <span key={t} className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300">
              #{t}
            </span>
          ))}
        </div>
      </div>

      {/* Main Editing / Rendering Body */}
      <div className="flex-1 overflow-hidden relative flex">
        {/* Editor (Shown in 'source' and 'split' modes) */}
        {(viewMode === 'source' || viewMode === 'split') && (
          <div className={`h-full overflow-y-auto ${viewMode === 'split' ? 'w-1/2 border-r border-slate-200/80 dark:border-slate-800/80' : 'w-full'}`}>
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onScroll={() => setScrollOffset(textareaRef.current?.scrollTop || 0)}
              onClick={() => {
                if (textareaRef.current) setCursorPosition(textareaRef.current.selectionStart);
              }}
              onKeyUp={() => {
                if (textareaRef.current) setCursorPosition(textareaRef.current.selectionStart);
              }}
              placeholder="Write your markdown knowledge notes here..."
              className={`w-full h-full p-4 sm:p-6 lg:p-8 text-xs sm:text-sm font-mono leading-relaxed bg-transparent text-slate-800 dark:text-slate-100 resize-none focus:outline-none custom-scrollbar ${
                viewMode === 'source' ? 'max-w-4xl mx-auto block' : ''
              }`}
            />
          </div>
        )}

        {/* Live Preview (Shown in 'preview' and 'split' modes) */}
        {(viewMode === 'preview' || viewMode === 'split') && (
          <div className={`h-full overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar ${viewMode === 'split' ? 'w-1/2 bg-slate-50/40 dark:bg-slate-900/20' : 'w-full max-w-4xl mx-auto'}`}>
            {renderMarkdown(content)}
          </div>
        )}

        {/* Autocomplete Popup Menu for [[WikiLinks]] & Aliases */}
        {autocompleteOpen && (matchingPages.length > 0 || autocompleteQuery.trim().length > 0) && (
          <div
            style={{
              top: `${popupCoords.top}px`,
              left: `${popupCoords.left}px`,
            }}
            className="absolute z-50 w-80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-xl shadow-2xl border border-purple-300 dark:border-purple-700 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
          >
            <div className="px-3 py-1.5 bg-purple-50 dark:bg-purple-950/60 border-b border-purple-200 dark:border-purple-800 text-[10px] font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider flex items-center justify-between">
              <span>Link Note or Alias</span>
              <span className="text-[9px] text-purple-500 font-mono">Enter / Tab</span>
            </div>
            <div className="max-h-56 overflow-y-auto py-1 custom-scrollbar">
              {matchingPages.map((item, idx) => (
                <div
                  key={`${item.page.id}-${item.alias || 'title'}`}
                  onClick={() => insertWikiLink(item.title, item.alias, false)}
                  className={`px-3 py-1.5 text-xs flex items-center justify-between cursor-pointer ${
                    idx === autocompleteIndex
                      ? 'bg-purple-600 text-white font-medium'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="w-3.5 h-3.5 opacity-70 shrink-0" />
                    <span className="truncate">{item.title}</span>
                    {item.alias && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        idx === autocompleteIndex ? 'bg-purple-700 text-white' : 'bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-300'
                      }`}>
                        alias: {item.alias}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] opacity-60 font-mono shrink-0 ml-1">
                    {item.alias ? '[[...|...]]' : item.page.pageType}
                  </span>
                </div>
              ))}

              {autocompleteQuery.trim().length > 0 && !allPages.some((p) => p.title.toLowerCase().trim() === autocompleteQuery.trim().toLowerCase()) && (
                <div
                  onClick={() => insertWikiLink(autocompleteQuery.trim(), undefined, true)}
                  className="px-3 py-2 text-xs flex items-center gap-2 cursor-pointer border-t border-slate-100 dark:border-slate-800 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/50 font-semibold"
                >
                  <Plus className="w-3.5 h-3.5 text-purple-500" />
                  <span className="truncate">
                    Create new note "<strong>{autocompleteQuery.trim()}</strong>"
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Status Bar */}
      <footer className="h-7 border-t border-slate-200 dark:border-slate-800 px-4 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/90 shrink-0 select-none">
        <div className="flex items-center gap-3">
          <span>{stats.words} words</span>
          <span>•</span>
          <span>{stats.chars} characters</span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-400" />
            {stats.readingTime} min read
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isSaving ? (
            <span className="text-purple-600 dark:text-purple-400 font-medium animate-pulse">Saving...</span>
          ) : (
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <Check className="w-3 h-3" /> Saved locally
            </span>
          )}
        </div>
      </footer>
    </div>
  );
};
