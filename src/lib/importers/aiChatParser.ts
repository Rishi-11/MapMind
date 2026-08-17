import { MapMindNode, MapMindEdge, NodeColorTheme, NodeShape, NodeCardStyle } from '@/types/graph';

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
    id: 'educational-textbook',
    title: '🎓 Master Educational Map ("Compressed Textbook")',
    description: 'Deeply teaches and explains concepts, mechanisms, causes, effects, and outcomes',
    prompt: `I want you to create an Educational Mind Map for MapMind that EXPLAINS and TEACHES the topic: "[REPLACE WITH YOUR TOPIC]", not merely lists its subtopics.

The biggest requirement is:
DO NOT generate a collection of short bullet points or mere keywords.
Every important branch must explain the idea behind it, its purpose, how it works, and how it connects to the parent topic.
Think of the Mind Map as a "compressed textbook" rather than a "table of contents".

For every major concept, address:
- What is it?
- Why is it important?
- How does it work?
- How does it relate to the parent concept?
- What happens next?
- What are the possible outcomes?
- Are there exceptions or special cases?
- Can a simple practical example make it clearer?

Use the hierarchy to explain relationships and reasoning:
- Concept → Explanation
- Cause → Effect
- Input → Process → Output
- Question → Decision → Consequence
- Problem → Solution
- Component → Function
- Step → Result
- Rule → Exception
- Concept → Example

MapMind Feature Formatting Syntax:
1. Root Header: "# [Central Topic Name]"
2. Hierarchy: Use indented dashes (- Level 1, -- Level 2, --- Level 3, etc.)
3. Explanations: "Node Title [Tag1, Tag2] : Detailed explanation of what it is, why it matters, and how it works"
4. Connection Comments / Flow Labels (optional): Put relationship or condition in arrows: "-- (leads to) --> Child Title : Explanation" or "-- (on success) --> Outcome Title"
5. Node Shapes (optional): append {diamond} for decisions/conditions, {cloud} for theories/ideas, {banner} for milestones, {pill} for categories.
6. Card Aesthetic Styles (optional): {style: bold}, {style: classy}, {style: gradient}, {style: notion}.

DEPTH RULE:
Do not stop after naming a concept. Expand it until the reader can understand the concept from the Mind Map itself. A good node should contain enough information to answer "What does this mean?" without requiring a separate explanation.

Example:
# User Authentication Architecture
- Authentication Engine [Security] : Process of verifying that a user is really who they claim to be
-- Purpose [Defense] : Prevents unauthorized actors from accessing private tenant data
-- Credentials Intake [Input] : User provides an identifier and secret such as email and cryptographic password
--- (submits to) --> Verification Logic {diamond} [Evaluation] : Checks supplied hash against stored PBKDF2/Argon2 salt
---- (on valid match) --> Session Generated [Outcome] : Issues signed JWT access token for persistent state
---- (on mismatch) --> Access Rejected [Outcome] : Returns 401 Unauthorized and increments failed attempt counter
-- Multi-Factor OTP [Defense-in-Depth] : Generates ephemeral 6-digit TOTP code refreshed every 30 seconds
--- Why Used [Risk Mitigation] : Protects the user account even if primary password was leaked in a breach

Output ONLY the Markdown list inside a code block.`,
  },
  {
    id: 'tech-architecture',
    title: '🏗️ Technical Architecture & System Design',
    description: 'Detailed system components, protocols, data flows, caching, and failure modes',
    prompt: `Act as a Principal Software Architect. I want a comprehensive, educational Technical Architecture Mind Map for: "[REPLACE WITH YOUR SYSTEM / TECH STACK]".

Instructions:
1. Explain how components interact instead of simply naming technologies.
2. Structure into: Client / Presentation, API Gateway & Routing, Business Microservices, Data Storage & Caching, Event Streaming, Security & Auth, Infrastructure & Reliability.
3. For every service/database, explain its core responsibility, protocol/data flow, why it was chosen, and how failures are mitigated.
4. Use connection comments for protocols and data flows, e.g. "-- (via gRPC) --> Order Service", "-- (publishes event) --> Kafka Cluster", "-- (fallback query) --> Replica DB".
5. Use tags like [React], [PostgreSQL], [Redis], [Docker], [Security].

Output ONLY the Markdown list inside a code block.`,
  },
  {
    id: 'process-workflow',
    title: '🔄 Step-by-Step Process & Pipeline Engine',
    description: 'Sequenced execution steps, mechanisms, inputs/outputs, and decision branches',
    prompt: `Act as a Systems Analyst. Generate an educational, step-by-step Process Workflow Mind Map for: "[REPLACE WITH YOUR PROCESS / WORKFLOW]".

Instructions:
1. Show the actual chronological sequence and explain what happens at each step.
2. For each step, explain:
   - What triggers it (Input)
   - How it is processed (Mechanism)
   - What happens next (Output / Next Step)
3. Include Decision Points using {diamond} nodes with branching outcomes:
   -- (if approved) --> Next Stage : Description of next phase
   -- (if rejected) --> Rollback / Notification : Description of remediation
4. Include Exception handling: normal path vs fallback path.

Output ONLY the Markdown list inside a code block.`,
  },
  {
    id: 'decision-tree',
    title: '⚖️ Decision Tree & Consequence Matrix',
    description: 'Strategic evaluations, conditional branches, trade-offs, and contingency plans',
    prompt: `Act as a Strategic Decision Analyst. Generate an educational Decision Tree Mind Map for: "[REPLACE WITH YOUR PROBLEM / DECISION]".

Instructions:
1. Start with the core problem or evaluation in root "# [Problem Statement]".
2. Branch into the primary evaluation criteria and risk factors.
3. For each decision, use {diamond} shape nodes with conditional connection labels:
   -- (Option A: High Scale / Complex) --> Microservices Architecture : Trade-offs and resource requirements
   -- (Option B: Fast MVP / Simple) --> Modular Monolith : Trade-offs and launch timeline
4. Expand consequences, trade-offs, financial/technical costs, and contingency plans for each path.

Output ONLY the Markdown list inside a code block.`,
  },
  {
    id: 'scientific-deepdive',
    title: '🔬 Scientific & Conceptual Deep-Dive',
    description: 'Underlying mechanisms, cause-and-effect chains, experiments, and applications',
    prompt: `Act as a Professor and Research Scientist. Generate an explanatory Conceptual Deep-Dive Mind Map for: "[REPLACE WITH YOUR SCIENTIFIC / ACADEMIC TOPIC]".

Instructions:
1. Organise into: Fundamentals & Principles, Underlying Mechanisms, Causes & Effects, Milestone Experiments / Evidence, Practical Applications, Open Questions / Limitations.
2. Connect abstract theories with concrete physical/biological/mathematical mechanisms.
3. Ensure every branch answers "What is it?" and "How does it work?".
4. Use tags like [Theory], [Mechanism], [Evidence], [Application].

Output ONLY the Markdown list inside a code block.`,
  },
  {
    id: 'notes-distiller',
    title: '📑 Distill Notes, Transcript or Document',
    description: 'Distill lengthy text into an educational, organized, and actionable knowledge map',
    prompt: `Please convert the following text/meeting notes into an educational, deeply structured Mind Map for MapMind:

[PASTE YOUR NOTES / ARTICLE / TRANSCRIPT HERE]

Instructions:
1. Extract the core ideas and explain the context, reasoning, and decisions behind them.
2. Group into: Context & Problem, Key Insights, Decisions Made, Action Items (Owner + Deadline), Unresolved Questions.
3. Use connection comments for dependencies: "-- (depends on) --> Task X", "-- (leads to) --> Decision Y".
4. Add tags like [Decision], [Action], [Insight], [Blocked].

Output ONLY the Markdown list inside a code block.`,
  },
];

/**
 * Intelligent Parser that converts raw AI chat response (Markdown outline, Mermaid mindmap, or JSON)
 * into MapMind graph nodes and edges with support for connection comments, shapes, styles, and tags.
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
  shape?: NodeShape;
  cardStyle?: NodeCardStyle;
  explicitTheme?: NodeColorTheme;
  edgeLabel?: string;
}

/**
 * Parses indented Markdown bullet points, numbers, connection arrows, shapes, styles, and headers into a mind map
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
  let rootSublabel: string | undefined = undefined;
  let rootTags: string[] | undefined = undefined;

  lines.forEach((rawLine, lineIndex) => {
    let line = rawLine;

    // Check for root Markdown header (# Topic)
    const headerMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headerMatch && lineIndex === 0) {
      let hContent = headerMatch[2].trim();
      // Extract tags in root
      const hTags = hContent.match(/\[([^[\]]+)\]/g);
      if (hTags) {
        rootTags = hTags.map((t) => t.replace(/[[\]]/g, '').trim());
        hContent = hContent.replace(/\[([^[\]]+)\]/g, '').trim();
      }
      if (hContent.includes(':') && !hContent.startsWith('http')) {
        const parts = hContent.split(':');
        rootTitle = parts[0].trim();
        rootSublabel = parts.slice(1).join(':').trim();
      } else {
        rootTitle = hContent;
      }
      return;
    }

    // Determine indentation depth
    const leadingWhitespaceMatch = line.match(/^(\s*)/);
    const leadingSpaces = leadingWhitespaceMatch ? leadingWhitespaceMatch[1].length : 0;
    const tabCount = (line.match(/^\t+/) || [''])[0].length;
    
    // Check if user used multi-dash hierarchy like -- Level 2, --- Level 3
    const multiDashMatch = line.trim().match(/^(-{2,6}|\+{2,6})\s+/);
    let computedDepth: number;
    if (multiDashMatch) {
      computedDepth = multiDashMatch[1].length;
    } else if (tabCount > 0) {
      computedDepth = tabCount + 1;
    } else {
      computedDepth = Math.floor(leadingSpaces / 2) + 1;
    }

    // Strip bullet symbol (- , * , + , -- , --- , 1. , etc.)
    let cleanContent = line
      .replace(/^\s*(-{1,6}|\+{1,6}|[*•–—]|\d+[.)])\s+/, '')
      .trim();
    if (!cleanContent) return;

    // 1. Extract Connection Comments / Edge Labels:
    // e.g. (leads to) --> Child  OR  [on success] --> Child  OR  {if valid} --> Child  OR  -- leads to --> Child
    let edgeLabel: string | undefined = undefined;
    const edgeArrowMatch = cleanContent.match(/^(?:--|\+\+|->)?\s*(?:[({[]\s*([^{}\[\]()]+?)\s*[)}\]]|([a-zA-Z0-9\s_/-]+?))\s*(?:-->|->|=>)\s*(.*)$/);
    if (edgeArrowMatch) {
      edgeLabel = (edgeArrowMatch[1] || edgeArrowMatch[2])?.trim();
      cleanContent = edgeArrowMatch[3].trim();
    }

    // 2. Extract Shape: {diamond}, {cloud}, {banner}, {pill}, {sharp}, {card}
    let shape: NodeShape | undefined = undefined;
    const shapeMatch = cleanContent.match(/\{(?:shape\s*:\s*)?(diamond|cloud|banner|pill|sharp|card)\}/i);
    if (shapeMatch) {
      shape = shapeMatch[1].toLowerCase() as NodeShape;
      cleanContent = cleanContent.replace(shapeMatch[0], '').trim();
    }

    // 3. Extract Card Aesthetic Style: {style: bold}, {style: classy}, {style: gradient}, {style: minimal}, {style: notion}
    let cardStyle: NodeCardStyle | undefined = undefined;
    const styleMatch = cleanContent.match(/\{(?:style\s*:\s*)?(bold|classy|gradient|minimal|notion|default)\}/i);
    if (styleMatch) {
      cardStyle = styleMatch[1].toLowerCase() as NodeCardStyle;
      cleanContent = cleanContent.replace(styleMatch[0], '').trim();
    }

    // 4. Extract Explicit Theme: {theme: blue}, {theme: emerald}, etc.
    let explicitTheme: NodeColorTheme | undefined = undefined;
    const themeMatch = cleanContent.match(/\{(?:theme\s*:\s*|color\s*:\s*)?(blue|emerald|purple|amber|rose|cyan|slate)\}/i);
    if (themeMatch) {
      explicitTheme = themeMatch[1].toLowerCase() as NodeColorTheme;
      cleanContent = cleanContent.replace(themeMatch[0], '').trim();
    }

    // 5. Extract Tags in [Tag]
    const tags: string[] = [];
    const tagMatches = cleanContent.match(/\[([^[\]]+)\]/g);
    if (tagMatches) {
      tagMatches.forEach((t) => {
        const tagText = t.replace(/[[\]]/g, '').trim();
        if (tagText) tags.push(tagText);
      });
    }

    let textWithoutTags = cleanContent.replace(/\[([^[\]]+)\]/g, '').trim();

    // 6. Extract Label & Explanatory Sublabel
    let label = textWithoutTags;
    let sublabel: string | undefined = undefined;

    if (textWithoutTags.includes(':') && !textWithoutTags.startsWith('http')) {
      const parts = textWithoutTags.split(':');
      label = parts[0].trim();
      sublabel = parts.slice(1).join(':').trim();
    } else if (textWithoutTags.includes(' - ') && !textWithoutTags.includes('-->')) {
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
      shape,
      cardStyle,
      explicitTheme,
      edgeLabel,
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
      sublabel: rootSublabel,
      tags: rootTags,
      colorTheme: 'blue',
      isRoot: true,
      shape: 'pill',
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
    if (item.explicitTheme) {
      branchColor = item.explicitTheme;
    } else if (isDirectChildOfRoot) {
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
      position: { x: 0, y: 0 }, // Will be arranged by ELK layout
      data: {
        label: item.label,
        sublabel: item.sublabel,
        tags: item.tags,
        colorTheme: branchColor,
        shape: item.shape || (isDirectChildOfRoot ? 'card' : undefined),
        cardStyle: item.cardStyle || 'default',
      },
    });

    // Add edge with optional connection label / comment
    edges.push({
      id: `e_${parent.id}_${item.id}`,
      source: parent.id,
      target: item.id,
      type: 'custom',
      data: item.edgeLabel ? { label: item.edgeLabel } : undefined,
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
 * Parses Mermaid Mindmap syntax with shape & connection extraction
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

    // Extract shape from mermaid syntax
    let shape: NodeShape | undefined = undefined;
    if (/^\{\{.*?\}\}$/.test(raw) || /^\{.*?\}$/.test(raw)) {
      shape = 'diamond';
    } else if (/^\)\(.*?\)|\(\(.*?\)\)$/.test(raw)) {
      shape = 'pill';
    } else if (/^\]\s*.*?\s*\[$/.test(raw)) {
      shape = 'banner';
    }

    // Clean node label shapes: ((Label)), [Label], (Label), {Label}
    let cleanLabel = raw
      .replace(/^\{\{(.*?)\}\}$/, '$1')
      .replace(/^\{(.*?)\}$/, '$1')
      .replace(/^\(\((.*?)\)\)$/, '$1')
      .replace(/^\[(.*?)\]$/, '$1')
      .replace(/^\((.*?)\)$/, '$1')
      .trim();

    // Extract sublabels if present
    let sublabel: string | undefined = undefined;
    if (cleanLabel.includes(':')) {
      const parts = cleanLabel.split(':');
      cleanLabel = parts[0].trim();
      sublabel = parts.slice(1).join(':').trim();
    }

    items.push({
      id: `mm_node_${idx}_${Math.random().toString(36).substring(2, 6)}`,
      depth,
      label: cleanLabel || 'Subtopic',
      sublabel,
      shape,
    });
  });

  nodes.push({
    id: rootId,
    type: 'custom',
    position: { x: 0, y: 0 },
    selected: true,
    data: { label: rootLabel, isRoot: true, colorTheme: 'blue', shape: 'pill' },
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
        sublabel: item.sublabel,
        colorTheme: branchColor,
        shape: item.shape,
      },
    });

    edges.push({
      id: `e_${parent.id}_${item.id}`,
      source: parent.id,
      target: item.id,
      type: 'custom',
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
 * Parses nested JSON structure: { "label": "Root", "sublabel": "...", "children": [...] }
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
    data: {
      label: rootLabel,
      sublabel: rootData?.sublabel || rootData?.description,
      tags: rootData?.tags,
      isRoot: true,
      colorTheme: 'blue',
      shape: 'pill',
      cardStyle: rootData?.cardStyle || 'default',
    },
  });

  let branchCounter = 0;

  function traverse(item: any, parentId: string, depth: number) {
    const children = item.children || item.items || item.nodes || [];
    if (!Array.isArray(children)) return;

    children.forEach((child: any, idx: number) => {
      const childId = `json_node_${depth}_${idx}_${Math.random().toString(36).substring(2, 6)}`;
      const isDirectChild = parentId === rootId;

      let colorTheme: NodeColorTheme;
      if (child.colorTheme && COLOR_PALETTE_ORDER.includes(child.colorTheme)) {
        colorTheme = child.colorTheme;
      } else if (isDirectChild) {
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
          shape: child.shape,
          cardStyle: child.cardStyle || 'default',
        },
      });

      const edgeLabel = child.edgeLabel || child.connectionLabel || child.relationship;
      edges.push({
        id: `e_${parentId}_${childId}`,
        source: parentId,
        target: childId,
        type: 'custom',
        data: edgeLabel ? { label: edgeLabel } : undefined,
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
