import { MapMindNode, MapMindEdge, NodeColorTheme } from '@/types/graph';

export interface ParsedMindMapResult {
  nodes: MapMindNode[];
  edges: MapMindEdge[];
  rootId: string;
  formatDetected: 'markdown-outline' | 'mermaid-mindmap' | 'json-tree' | 'raw-text';
}

const COLOR_PALETTE_ORDER: NodeColorTheme[] = [
  'blue',
  'emerald',
  'purple',
  'amber',
  'rose',
  'cyan',
  'slate',
];

export interface AiPromptTemplate {
  id: string;
  title: string;
  description: string;
  prompt: string;
}

export const AI_PROMPT_TEMPLATES: AiPromptTemplate[] = [
  {
    id: 'chat-summary',
    title: '💬 Summarize Chat / Discussion',
    description: 'Transform our ongoing chat conversation into a structured mind map',
    prompt: `Please convert our entire discussion above into a clean, hierarchical Mind Map in Markdown bullet-point format for MapMind diagramming:

Instructions:
1. Use "# [Main Central Topic]" as the root header.
2. Use indented bullet points (- Level 1, -- Level 2, --- Level 3, etc.) for branches and subtopics.
3. You can attach tags in square brackets, e.g. "- Performance [Core]" or "- SQLite [Database]".
4. You can add brief descriptions after a colon, e.g. "- Vite: High performance frontend bundler".
5. Group ideas logically with 3 to 6 main high-level branches.

Output ONLY the Markdown bullet-point outline inside a code block.`,
  },
  {
    id: 'brainstorm',
    title: '🧠 Brainstorm & Expand Topic',
    description: 'Generate a comprehensive, deep mind map on any concept or project idea',
    prompt: `Act as a Knowledge Architect. I want a comprehensive, structured Mind Map on the topic: "[REPLACE WITH YOUR TOPIC]".

Instructions:
1. Start with "# [Topic Name]" as the central root.
2. Break it down into 4 to 6 main pillar branches (e.g. Overview, Key Features, Architecture, Use Cases, Challenges, Next Steps).
3. Under each pillar, expand 2 to 4 detailed sub-branches.
4. Add tags in brackets like [Strategy], [Tech], [Priority].
5. Format strictly as an indented Markdown bullet-point list.

Output ONLY the markdown list inside a code block.`,
  },
  {
    id: 'article-summary',
    title: '📑 Summarize Notes / Meeting / Article',
    description: 'Distill lengthy text, meeting notes, or documentation into key insights',
    prompt: `Please summarize the following text/meeting notes into an organized Mind Map:

[PASTE YOUR NOTES / ARTICLE HERE]

Instructions:
1. Use "# [Subject / Meeting Title]" as the central root node.
2. Identify the main themes: Agenda/Topics, Key Decisions, Action Items, Ideas, Questions.
3. Structure as a clean indented Markdown bullet-point list with tags like [Action], [Decision], [Key].
4. Keep node titles concise (3-7 words) and punchy.

Output ONLY the Markdown list inside a code block.`,
  },
  {
    id: 'tech-architecture',
    title: '🏗️ Technical Architecture Breakdown',
    description: 'Map out system components, frontend/backend stack, APIs, and data flows',
    prompt: `Please generate a Technical Architecture Mind Map for: "[REPLACE WITH YOUR TECH SYSTEM/PROJECT]".

Instructions:
1. Root node: "# [System / Project Name]"
2. Main branches: Frontend / Client, Backend / APIs, Database & Storage, DevOps & Infra, Security, Integrations.
3. Sub-nodes: Libraries, protocols, components, tools.
4. Add relevant tags like [React], [Node], [Auth], [Postgres].
5. Format strictly as an indented Markdown bullet-point list.

Output ONLY the Markdown outline inside a code block.`,
  },
];

/**
 * Intelligent Parser that converts raw AI chat response (Markdown outline, Mermaid mindmap, or JSON)
 * into MapMind graph nodes and edges.
 */
export function parseAiResponseToMindMap(rawText: string): ParsedMindMapResult {
  const cleanText = extractContentFromCodeBlocks(rawText).trim();

  // 1. Try parsing JSON tree or JSON graph
  if (cleanText.startsWith('{') || cleanText.startsWith('[')) {
    try {
      const jsonParsed = JSON.parse(cleanText);
      const res = parseJsonTree(jsonParsed);
      if (res.nodes.length > 0) return res;
    } catch {
      // Fall through to markdown parsing
    }
  }

  // 2. Try parsing Mermaid Mindmap format
  if (cleanText.includes('mindmap') || /^\s*root\s*\(/im.test(cleanText)) {
    const mermaidRes = parseMermaidMindmap(cleanText);
    if (mermaidRes.nodes.length > 0) return mermaidRes;
  }

  // 3. Parse Markdown bulleted outline & headers (Standard & universal AI output)
  return parseMarkdownOutlineToMindMap(cleanText);
}

/**
 * Strips markdown code fence wrappers (```markdown ... ``` or ```mermaid ... ``` or ```json ... ```)
 */
function extractContentFromCodeBlocks(text: string): string {
  const codeBlockRegex = /```(?:markdown|mindmap|mermaid|json|text)?\s*([\s\S]*?)```/i;
  const match = text.match(codeBlockRegex);
  if (match && match[1]) {
    return match[1];
  }
  return text;
}

interface OutlineItem {
  id: string;
  depth: number;
  label: string;
  sublabel?: string;
  tags?: string[];
  parentId?: string;
  colorTheme?: NodeColorTheme;
}

/**
 * Parses indented Markdown bullet points, numbers, and headers into a mind map
 */
function parseMarkdownOutlineToMindMap(text: string): ParsedMindMapResult {
  const lines = text
    .split('\n')
    .map((l) => l.replace(/\r/g, ''))
    .filter((l) => l.trim().length > 0);

  if (lines.length === 0) {
    const rootId = `root_${Date.now()}`;
    return {
      nodes: [
        {
          id: rootId,
          type: 'custom',
          position: { x: 0, y: 0 },
          selected: true,
          data: { label: 'New Mind Map', isRoot: true, colorTheme: 'blue' },
        },
      ],
      edges: [],
      rootId,
      formatDetected: 'raw-text',
    };
  }

  const items: OutlineItem[] = [];
  let rootTitle = 'Central Topic';

  lines.forEach((rawLine, lineIndex) => {
    const line = rawLine;

    // Check for root Markdown header (# Topic)
    const headerMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headerMatch && lineIndex === 0) {
      rootTitle = headerMatch[2].trim();
      return;
    }

    // Determine indentation depth
    const leadingWhitespaceMatch = line.match(/^(\s*)/);
    const leadingSpaces = leadingWhitespaceMatch ? leadingWhitespaceMatch[1].length : 0;
    const tabCount = (line.match(/^\t+/) || [''])[0].length;
    const computedDepth = tabCount > 0 ? tabCount + 1 : Math.floor(leadingSpaces / 2) + 1;

    // Strip bullet symbol (- , * , + , 1. , etc.)
    const cleanContent = line.replace(/^\s*([*+\-•–—]|\d+[.)])\s+/, '').trim();
    if (!cleanContent) return;

    // Extract tags in [Tag] or (Tag)
    const tags: string[] = [];
    const tagMatches = cleanContent.match(/\[([^[\]]+)\]/g);
    if (tagMatches) {
      tagMatches.forEach((t) => {
        tags.push(t.replace(/[[\]]/g, '').trim());
      });
    }

    let textWithoutTags = cleanContent.replace(/\[([^[\]]+)\]/g, '').trim();

    // Extract sublabel / description if colon or dash separator exists
    let label = textWithoutTags;
    let sublabel: string | undefined = undefined;

    if (textWithoutTags.includes(':') && !textWithoutTags.startsWith('http')) {
      const parts = textWithoutTags.split(':');
      label = parts[0].trim();
      sublabel = parts.slice(1).join(':').trim();
    } else if (textWithoutTags.includes(' - ')) {
      const parts = textWithoutTags.split(' - ');
      label = parts[0].trim();
      sublabel = parts.slice(1).join(' - ').trim();
    }

    items.push({
      id: `ai_node_${lineIndex}_${Math.random().toString(36).substring(2, 6)}`,
      depth: computedDepth,
      label: label || 'Subtopic',
      sublabel: sublabel || undefined,
      tags: tags.length > 0 ? tags : undefined,
    });
  });

  const rootId = `root_${Date.now()}`;
  const nodes: MapMindNode[] = [];
  const edges: MapMindEdge[] = [];

  // Create Root Node
  nodes.push({
    id: rootId,
    type: 'custom',
    position: { x: 0, y: 0 },
    selected: true,
    data: {
      label: rootTitle,
      colorTheme: 'blue',
      isRoot: true,
      cardStyle: 'default',
    },
  });

  // Stack to track parent hierarchy by depth
  const stack: { depth: number; id: string; branchIndex: number }[] = [
    { depth: 0, id: rootId, branchIndex: 0 },
  ];

  let mainBranchCounter = 0;

  items.forEach((item) => {
    // Pop items from stack with depth >= current item depth
    while (stack.length > 1 && stack[stack.length - 1].depth >= item.depth) {
      stack.pop();
    }

    const parent = stack[stack.length - 1];
    const isDirectChildOfRoot = parent.id === rootId;

    let branchColor: NodeColorTheme;
    if (isDirectChildOfRoot) {
      branchColor = COLOR_PALETTE_ORDER[mainBranchCounter % COLOR_PALETTE_ORDER.length];
      mainBranchCounter++;
    } else {
      branchColor =
        (nodes.find((n) => n.id === parent.id)?.data?.colorTheme as NodeColorTheme) ||
        'blue';
    }

    // Add node
    nodes.push({
      id: item.id,
      type: 'custom',
      position: { x: 0, y: 0 }, // Will be placed by ELK / Dagre
      data: {
        label: item.label,
        sublabel: item.sublabel,
        tags: item.tags,
        colorTheme: branchColor,
      },
    });

    // Add edge
    edges.push({
      id: `e_${parent.id}_${item.id}`,
      source: parent.id,
      target: item.id,
      type: 'smoothstep',
    });

    stack.push({
      depth: item.depth,
      id: item.id,
      branchIndex: mainBranchCounter,
    });
  });

  return {
    nodes,
    edges,
    rootId,
    formatDetected: 'markdown-outline',
  };
}

/**
 * Parses Mermaid Mindmap syntax:
 * mindmap
 *   root((Central Topic))
 *     Branch 1
 *       Leaf A
 */
function parseMermaidMindmap(text: string): ParsedMindMapResult {
  const lines = text
    .split('\n')
    .map((l) => l.replace(/\r/g, ''))
    .filter((l) => {
      const t = l.trim();
      return t.length > 0 && !t.startsWith('mindmap') && !t.startsWith('%%');
    });

  const rootId = `root_${Date.now()}`;
  let rootLabel = 'Central Topic';
  const nodes: MapMindNode[] = [];
  const edges: MapMindEdge[] = [];

  const items: OutlineItem[] = [];

  lines.forEach((line, idx) => {
    const leadingSpaces = (line.match(/^(\s*)/) || [''])[0].length;
    const depth = Math.max(1, Math.floor(leadingSpaces / 2));
    let raw = line.trim();

    // Check for mermaid root ((Root Label)) or [Root Label]
    const rootShapeMatch = raw.match(/^root\s*(?:\(\((.*?)\)\)|\[(.*?)\]|\((.*?)\)|::icon\(.*?\))\s*$/i);
    if (rootShapeMatch && idx === 0) {
      rootLabel = rootShapeMatch[1] || rootShapeMatch[2] || rootShapeMatch[3] || 'Central Topic';
      return;
    }

    // Clean node label shapes: ((Label)), [Label], (Label), )Label(
    const cleanLabel = raw
      .replace(/^\(\((.*?)\)\)$/, '$1')
      .replace(/^\[(.*?)\]$/, '$1')
      .replace(/^\((.*?)\)$/, '$1')
      .replace(/^\)(.*?)\($/, '$1')
      .trim();

    items.push({
      id: `mm_node_${idx}_${Math.random().toString(36).substring(2, 6)}`,
      depth,
      label: cleanLabel || 'Subtopic',
    });
  });

  nodes.push({
    id: rootId,
    type: 'custom',
    position: { x: 0, y: 0 },
    selected: true,
    data: { label: rootLabel, isRoot: true, colorTheme: 'blue' },
  });

  const stack: { depth: number; id: string }[] = [{ depth: 0, id: rootId }];
  let mainBranchCounter = 0;

  items.forEach((item) => {
    while (stack.length > 1 && stack[stack.length - 1].depth >= item.depth) {
      stack.pop();
    }

    const parent = stack[stack.length - 1];
    const isDirectChild = parent.id === rootId;

    let branchColor: NodeColorTheme;
    if (isDirectChild) {
      branchColor = COLOR_PALETTE_ORDER[mainBranchCounter % COLOR_PALETTE_ORDER.length];
      mainBranchCounter++;
    } else {
      branchColor =
        (nodes.find((n) => n.id === parent.id)?.data?.colorTheme as NodeColorTheme) ||
        'blue';
    }

    nodes.push({
      id: item.id,
      type: 'custom',
      position: { x: 0, y: 0 },
      data: {
        label: item.label,
        colorTheme: branchColor,
      },
    });

    edges.push({
      id: `e_${parent.id}_${item.id}`,
      source: parent.id,
      target: item.id,
      type: 'smoothstep',
    });

    stack.push({ depth: item.depth, id: item.id });
  });

  return {
    nodes,
    edges,
    rootId,
    formatDetected: 'mermaid-mindmap',
  };
}

/**
 * Parses nested JSON structure: { "label": "Root", "children": [...] }
 */
function parseJsonTree(json: any): ParsedMindMapResult {
  const rootId = `root_${Date.now()}`;
  const nodes: MapMindNode[] = [];
  const edges: MapMindEdge[] = [];

  const rootData = Array.isArray(json) ? json[0] : json;
  const rootLabel = rootData?.label || rootData?.title || rootData?.name || 'Central Topic';

  nodes.push({
    id: rootId,
    type: 'custom',
    position: { x: 0, y: 0 },
    selected: true,
    data: { label: rootLabel, isRoot: true, colorTheme: 'blue' },
  });

  let branchCounter = 0;

  function traverse(item: any, parentId: string, depth: number) {
    const children = item.children || item.items || item.nodes || [];
    if (!Array.isArray(children)) return;

    children.forEach((child: any, idx: number) => {
      const childId = `json_node_${depth}_${idx}_${Math.random().toString(36).substring(2, 6)}`;
      const isDirectChild = parentId === rootId;

      let colorTheme: NodeColorTheme;
      if (isDirectChild) {
        colorTheme = COLOR_PALETTE_ORDER[branchCounter % COLOR_PALETTE_ORDER.length];
        branchCounter++;
      } else {
        colorTheme =
          (nodes.find((n) => n.id === parentId)?.data?.colorTheme as NodeColorTheme) ||
          'blue';
      }

      nodes.push({
        id: childId,
        type: 'custom',
        position: { x: 0, y: 0 },
        data: {
          label: child.label || child.title || child.name || 'Subtopic',
          sublabel: child.sublabel || child.desc || child.description,
          tags: child.tags,
          colorTheme,
        },
      });

      edges.push({
        id: `e_${parentId}_${childId}`,
        source: parentId,
        target: childId,
        type: 'smoothstep',
      });

      traverse(child, childId, depth + 1);
    });
  }

  traverse(rootData, rootId, 1);

  return {
    nodes,
    edges,
    rootId,
    formatDetected: 'json-tree',
  };
}
