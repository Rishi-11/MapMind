import { Page, WikiLink, BacklinkItem, UnlinkedMentionItem, MarkdownTask, PageProperties } from '@/types/notebook';

// Regex for Obsidian-style WikiLinks: [[Target Page]] or [[Target Page|Display Text]]
export const WIKI_LINK_REGEX = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

// Regex for YAML frontmatter
export const FRONTMATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---/;

// Regex for Markdown checkboxes: - [ ] or - [x]
export const MARKDOWN_TASK_REGEX = /^(\s*)[-*+]\s*\[([ xX])\]\s*(.*)$/gm;

/**
 * Parses YAML frontmatter from markdown content
 */
export function parseFrontmatter(markdown: string): { properties: PageProperties; body: string } {
  const match = markdown.match(FRONTMATTER_REGEX);
  if (!match) {
    return { properties: {}, body: markdown };
  }

  const rawYaml = match[1];
  const body = markdown.slice(match[0].length).trimStart();
  const properties: PageProperties = {};

  const lines = rawYaml.split(/\r?\n/);
  let currentKey: string | null = null;
  let isArray = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    if (trimmed.startsWith('- ') && currentKey && isArray) {
      const val = trimmed.slice(2).trim().replace(/^['"]|['"]$/g, '');
      if (Array.isArray(properties[currentKey])) {
        properties[currentKey].push(val);
      }
      continue;
    }

    const colonIdx = line.indexOf(':');
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim();
      const val = line.slice(colonIdx + 1).trim();

      if (val === '') {
        currentKey = key;
        isArray = true;
        properties[key] = [];
      } else if (val.startsWith('[') && val.endsWith(']')) {
        currentKey = key;
        isArray = false;
        properties[key] = val
          .slice(1, -1)
          .split(',')
          .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
          .filter(Boolean);
      } else {
        currentKey = key;
        isArray = false;
        const cleanVal = val.replace(/^['"]|['"]$/g, '');
        if (cleanVal === 'true') properties[key] = true;
        else if (cleanVal === 'false') properties[key] = false;
        else if (!isNaN(Number(cleanVal)) && cleanVal !== '') properties[key] = Number(cleanVal);
        else properties[key] = cleanVal;
      }
    }
  }

  // Normalize alias/aliases
  if (properties.alias && !properties.aliases) {
    properties.aliases = Array.isArray(properties.alias) ? properties.alias : [String(properties.alias)];
  }

  return { properties, body };
}

/**
 * Serializes properties into YAML frontmatter
 */
export function serializeFrontmatter(properties: PageProperties, body: string): string {
  const keys = Object.keys(properties).filter((k) => properties[k] !== undefined && properties[k] !== '');
  if (keys.length === 0) return body;

  let yaml = '---\n';
  for (const key of keys) {
    const val = properties[key];
    if (Array.isArray(val)) {
      yaml += `${key}:\n`;
      for (const item of val) {
        yaml += `  - ${item}\n`;
      }
    } else {
      yaml += `${key}: ${val}\n`;
    }
  }
  yaml += '---\n\n';
  return yaml + body;
}

/**
 * Extracts all wiki links from markdown content
 */
export function extractWikiLinks(content: string, sourcePageId = '', sourcePageTitle = ''): WikiLink[] {
  const links: WikiLink[] = [];
  const regex = new RegExp(WIKI_LINK_REGEX);
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    const targetTitle = match[1].trim();
    const displayText = match[2]?.trim() || targetTitle;
    links.push({
      raw: match[0],
      targetTitle,
      displayText,
      sourcePageId,
      sourcePageTitle,
    });
  }

  return links;
}

/**
 * Extracts tags (#tag, #category/subtag) from content
 */
export function extractTags(content: string): string[] {
  const tagRegex = /(?:^|\s)#([a-zA-Z0-9_\-/]+)/g;
  const tags = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(content)) !== null) {
    tags.add(match[1].toLowerCase());
  }

  return Array.from(tags);
}

/**
 * Extracts surrounding snippet context for a given index
 */
function extractContextSnippet(text: string, matchIndex: number, matchLength: number, snippetRadius = 80): { snippet: string; before: string; after: string } {
  const start = Math.max(0, matchIndex - snippetRadius);
  const end = Math.min(text.length, matchIndex + matchLength + snippetRadius);

  const before = (start > 0 ? '...' : '') + text.slice(start, matchIndex);
  const matched = text.slice(matchIndex, matchIndex + matchLength);
  const after = text.slice(matchIndex + matchLength, end) + (end < text.length ? '...' : '');

  return {
    snippet: `${before}**${matched}**${after}`.replace(/\r?\n/g, ' '),
    before: before.replace(/\r?\n/g, ' '),
    after: after.replace(/\r?\n/g, ' '),
  };
}

/**
 * Extract all aliases defined for a page (from frontmatter aliases / alias or properties)
 */
export function getPageAliases(page: Page | { content?: string; properties?: PageProperties }): string[] {
  const aliasesSet = new Set<string>();

  if (page.properties?.aliases) {
    if (Array.isArray(page.properties.aliases)) {
      page.properties.aliases.forEach((a) => a && aliasesSet.add(String(a).trim()));
    } else if (typeof page.properties.aliases === 'string') {
      page.properties.aliases.split(',').forEach((a) => a && aliasesSet.add(a.trim()));
    }
  }

  if (page.properties?.alias) {
    if (Array.isArray(page.properties.alias)) {
      page.properties.alias.forEach((a) => a && aliasesSet.add(String(a).trim()));
    } else if (typeof page.properties.alias === 'string') {
      page.properties.alias.split(',').forEach((a) => a && aliasesSet.add(a.trim()));
    }
  }

  if (page.content) {
    const { properties } = parseFrontmatter(page.content);
    if (properties.aliases) {
      if (Array.isArray(properties.aliases)) {
        properties.aliases.forEach((a) => a && aliasesSet.add(String(a).trim()));
      } else if (typeof properties.aliases === 'string') {
        properties.aliases.split(',').forEach((a) => a && aliasesSet.add(a.trim()));
      }
    }
    if (properties.alias) {
      if (Array.isArray(properties.alias)) {
        properties.alias.forEach((a) => a && aliasesSet.add(String(a).trim()));
      } else if (typeof properties.alias === 'string') {
        properties.alias.split(',').forEach((a) => a && aliasesSet.add(a.trim()));
      }
    }
  }

  return Array.from(aliasesSet).filter(Boolean);
}

/**
 * Find page by title or any alias (case-insensitive)
 */
export function findPageByTitleOrAlias(query: string, pages: Page[]): Page | undefined {
  if (!query) return undefined;
  const cleanQuery = query.trim().toLowerCase();

  // 1. Exact title match
  const byTitle = pages.find((p) => p.title.trim().toLowerCase() === cleanQuery);
  if (byTitle) return byTitle;

  // 2. Exact alias match
  for (const p of pages) {
    const aliases = getPageAliases(p);
    if (aliases.some((a) => a.toLowerCase() === cleanQuery)) {
      return p;
    }
  }

  return undefined;
}

/**
 * Builds the deterministic backlink index for all pages
 */
export function buildBacklinkIndex(pages: Page[], notebookMap: Map<string, string>, sectionMap: Map<string, string>): Map<string, BacklinkItem[]> {
  const backlinkMap = new Map<string, BacklinkItem[]>();

  // Map titles AND all aliases to pages for backlink detection
  const termToPageMap = new Map<string, Page>();
  for (const page of pages) {
    termToPageMap.set(page.title.toLowerCase().trim(), page);
    const aliases = getPageAliases(page);
    for (const alias of aliases) {
      termToPageMap.set(alias.toLowerCase().trim(), page);
    }
    backlinkMap.set(page.id, []);
  }

  for (const sourcePage of pages) {
    const { body } = parseFrontmatter(sourcePage.content);
    const regex = new RegExp(WIKI_LINK_REGEX);
    let match: RegExpExecArray | null;

    while ((match = regex.exec(body)) !== null) {
      const targetTitleOrAlias = match[1].trim();
      const targetPage = termToPageMap.get(targetTitleOrAlias.toLowerCase());

      if (targetPage && targetPage.id !== sourcePage.id) {
        const { snippet, before, after } = extractContextSnippet(body, match.index, match[0].length);
        const existing = backlinkMap.get(targetPage.id) || [];

        // Prevent exact duplicates from same line
        if (!existing.some((b) => b.sourcePageId === sourcePage.id && b.snippet === snippet)) {
          existing.push({
            sourcePageId: sourcePage.id,
            sourcePageTitle: sourcePage.title,
            notebookName: notebookMap.get(sourcePage.notebookId) || 'Notebook',
            sectionName: sectionMap.get(sourcePage.sectionId) || 'Section',
            snippet,
            contextBefore: before,
            contextAfter: after,
          });
          backlinkMap.set(targetPage.id, existing);
        }
      }
    }
  }

  return backlinkMap;
}

/**
 * Detects unlinked mentions of a page title or any of its aliases in other pages
 */
export function detectUnlinkedMentions(
  currentPage: Page,
  allPages: Page[],
  notebookMap: Map<string, string>,
  sectionMap: Map<string, string>
): UnlinkedMentionItem[] {
  const searchTerms = [currentPage.title, ...getPageAliases(currentPage)].filter(
    (t) => t && t.trim().length >= 2
  );
  if (searchTerms.length === 0) return [];

  const mentions: UnlinkedMentionItem[] = [];

  for (const term of searchTerms) {
    const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Match word boundary term, but ignore if already wrapped in [[...]]
    const mentionRegex = new RegExp(`(?<!\\[\\[)\\b(${escapedTerm})\\b(?!\\]\\])`, 'gi');

    for (const otherPage of allPages) {
      if (otherPage.id === currentPage.id) continue;

      const { body } = parseFrontmatter(otherPage.content);
      let match: RegExpExecArray | null;

      while ((match = mentionRegex.exec(body)) !== null) {
        // Ensure this match is not inside code blocks or already linked
        const matchedText = match[0];
        const matchIndex = match.index;
        const { snippet } = extractContextSnippet(body, matchIndex, matchedText.length);

        if (!mentions.some((m) => m.sourcePageId === otherPage.id && m.startIndex === matchIndex)) {
          mentions.push({
            sourcePageId: otherPage.id,
            sourcePageTitle: otherPage.title,
            notebookName: notebookMap.get(otherPage.notebookId) || 'Notebook',
            sectionName: sectionMap.get(otherPage.sectionId) || 'Section',
            snippet,
            matchedText,
            startIndex: matchIndex,
            endIndex: matchIndex + matchedText.length,
          });
        }

        if (mentions.length > 25) break; // Limit for performance
      }
    }
  }

  return mentions;
}

/**
 * Converts a raw mention in a page to a [[Wiki Link]]
 */
export function convertMentionToWikiLink(content: string, targetTitle: string): string {
  const escapedTitle = targetTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const mentionRegex = new RegExp(`(?<!\\[\\[)\\b(${escapedTitle})\\b(?!\\]\\])`, 'i');
  return content.replace(mentionRegex, `[[${targetTitle}]]`);
}

/**
 * Extracts all task checklist items across all pages with true line index mapping
 */
export function extractMarkdownTasks(
  pages: Page[],
  notebookMap: Map<string, string>,
  sectionMap: Map<string, string>
): MarkdownTask[] {
  const tasks: MarkdownTask[] = [];

  for (const page of pages) {
    if (!page.content) continue;
    const lines = page.content.split(/\r?\n/);
    let inFrontmatter = false;

    lines.forEach((line, lineIndex) => {
      const trimmed = line.trim();
      if (lineIndex === 0 && trimmed === '---') {
        inFrontmatter = true;
        return;
      }
      if (inFrontmatter) {
        if (trimmed === '---') {
          inFrontmatter = false;
        }
        return;
      }

      const taskMatch = line.match(/^\s*[-*+]\s*\[([ xX])\]\s*(.*)$/);
      if (taskMatch) {
        const completed = taskMatch[1].toLowerCase() === 'x';
        let text = taskMatch[2].trim();
        let priority: 'low' | 'medium' | 'high' | undefined;
        let dueDate: string | undefined;

        // Parse due date like @due(2026-09-01) or #due:2026-09-01
        const dueMatch = text.match(/@due\(([^)]+)\)|#due:([^\s]+)/i);
        if (dueMatch) {
          dueDate = dueMatch[1] || dueMatch[2];
        }

        // Parse priority
        if (text.includes('🔺') || text.toLowerCase().includes('#p1') || text.toLowerCase().includes('priority:high')) {
          priority = 'high';
        } else if (text.includes('🟡') || text.toLowerCase().includes('#p2')) {
          priority = 'medium';
        } else if (text.toLowerCase().includes('#p3')) {
          priority = 'low';
        }

        tasks.push({
          id: `${page.id}-line-${lineIndex}`,
          pageId: page.id,
          pageTitle: page.title,
          notebookName: notebookMap.get(page.notebookId) || 'Notebook',
          sectionName: sectionMap.get(page.sectionId) || 'Section',
          text,
          completed,
          lineIndex,
          dueDate,
          priority,
        });
      }
    });
  }

  return tasks;
}

/**
 * Toggles a task status inside a page's markdown content at exact lineIndex
 */
export function toggleMarkdownTask(content: string, lineIndex: number): string {
  const lines = content.split(/\r?\n/);
  if (lineIndex < 0 || lineIndex >= lines.length) return content;

  const targetLine = lines[lineIndex];
  const toggledLine = targetLine.replace(
    /^(\s*[-*+]\s*\[)([ xX])(\]\s*.*)$/,
    (_m, p1, p2, p3) => `${p1}${p2.trim().toLowerCase() === 'x' ? ' ' : 'x'}${p3}`
  );

  lines[lineIndex] = toggledLine;
  return lines.join('\n');
}

/**
 * Extracts all unique tags from a page (properties, frontmatter, and inline #hashtags)
 */
export function extractAllPageTags(page: Page): string[] {
  const tagsSet = new Set<string>();

  // 1. From page.tags array
  if (Array.isArray(page.tags)) {
    page.tags.forEach((t) => {
      if (t) tagsSet.add(t.toLowerCase().replace(/^#/, '').trim());
    });
  }

  // 2. From frontmatter properties
  const { properties, body } = parseFrontmatter(page.content || '');
  const rawTags = properties.tags as unknown;
  if (Array.isArray(rawTags)) {
    rawTags.forEach((t) => {
      if (t) tagsSet.add(String(t).toLowerCase().replace(/^#/, '').trim());
    });
  } else if (typeof rawTags === 'string' && rawTags.trim()) {
    rawTags.split(/[\s,]+/).forEach((t: string) => {
      if (t) tagsSet.add(t.toLowerCase().replace(/^#/, '').trim());
    });
  }

  // 3. From inline #hashtags (e.g. #productivity, #mindmap, #project-alpha)
  // Negative lookahead to ensure it's not a markdown heading like "# Heading"
  const inlineHashtagRegex = /(?:^|\s)#([a-zA-Z0-9_\-\/]{2,40})(?=\s|$|[.,;:!?])/g;
  let match: RegExpExecArray | null;
  while ((match = inlineHashtagRegex.exec(body)) !== null) {
    const raw = match[1].toLowerCase();
    if (!/^\d+$/.test(raw)) {
      tagsSet.add(raw);
    }
  }

  return Array.from(tagsSet).filter(Boolean);
}

/**
 * Appends a new markdown task checklist item to a page
 */
export function appendTaskToPage(
  content: string,
  taskText: string,
  priority?: 'low' | 'medium' | 'high',
  dueDate?: string
): string {
  let taskLine = `- [ ] ${taskText.trim()}`;
  if (priority === 'high') taskLine += ' 🔺 #p1';
  else if (priority === 'medium') taskLine += ' 🟡 #p2';
  else if (priority === 'low') taskLine += ' #p3';

  if (dueDate) taskLine += ` @due(${dueDate})`;

  const trimmed = content.trimEnd();
  return `${trimmed}\n${taskLine}\n`;
}

