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
  category?: string;
  badge?: string;
  description: string;
  prompt: string;
}

export const AI_PROMPT_TEMPLATES: AiPromptTemplate[] = [
  {
    id: 'flow-mechanism',
    title: '⚡ End-to-End Dynamic Process & Lifecycle Flow',
    category: 'Flow & Mechanism',
    badge: 'Master Flow',
    description: 'Chronological cause-and-effect narrative: Trigger → Processing → Decision Gates → Outcomes',
    prompt: `Act as a Principal Systems & Mechanism Architect.

Your objective is NOT to generate a static topic classification, folder tree, or list of subtopics. 
Instead, you must map out the chronological, cause-and-effect FLOW of how "[REPLACE WITH YOUR TOPIC / PROCESS]" works from the very beginning to the final outcome.

Anyone reading this Mind Map from left to right / top to bottom should understand the complete story, mechanism, and step-by-step lifecycle without needing external research.

---

### 🛑 STRICT ANTI-PATTERNS (WHAT NOT TO DO):
1. ❌ DO NOT create generic symmetric bullet points (e.g., Topic → Feature 1, Feature 2, Feature 3).
2. ❌ DO NOT make a dictionary / definition glossary.
3. ❌ DO NOT output static subtopics without showing how they connect and trigger each other.

---

### ⚡ THE 5-STAGE CHRONOLOGICAL FLOW FRAMEWORK:
Structure the branches following the actual timeline of events:
1. 🟢 Phase 1: Trigger & Input (What initiates the process? What raw input/stimulus enters the system?)
2. ⚙️ Phase 2: Internal Processing & Transformation (What happens step-by-step under the hood?)
3. 🔀 Phase 3: Critical Decision & Verification Gates (Where does the process branch based on conditions?)
4. 💥 Phase 4: Cascading Effects & Downstream Propagation (What side-effects or parallel actions occur?)
5. 🏁 Phase 5: Final Resolution, Output & Feedback Loops (What is the ultimate end-state or outcome?)

---

### 🛠️ MAPMIND FLOW SYNTAX RULES:
1. Root Node: Line 1 must be "# [Process / System Name]"
2. Step Labels & Action Notes: Format every node as:
   "Step / Component Name [Phase Tag] : Concise explanation of what happens here and why"
3. Relationship Arrows & Verbs: ALWAYS specify the connecting action, data transfer, or condition inside arrows:
   - "-- (triggers) -->"
   - "-- (converts raw data into) -->"
   - "-- (if condition is met) -->"
   - "-- (on error / fallback) -->"
   - "-- (feeds back into) -->"
4. Decision & Milestone Shapes:
   - Append "{diamond}" for conditions, validations, and branching logic.
   - Append "{banner}" for final outcomes and milestones.
   - Append "{pill}" for core processing engines.

---

### Example Format:
# How a Web Browser Loads a Web Page End-to-End
- 1. User Enters URL [Trigger] : User types domain into address bar and hits Enter
-- (queries IP address) --> DNS Resolution Engine [Lookup] : Translates human-readable domain into machine IP address
--- (checks local memory) --> Browser DNS Cache {diamond} [Cache Check] : Checks if IP was resolved recently
---- (if found in cache) --> IP Address Acquired [Fast Path] : Skips network lookup with zero latency
---- (if cache miss) --> (queries remote server) --> Recursive DNS Resolver [Network] : Queries Root, TLD, and Authoritative nameservers
-- (establishes network tunnel) --> TCP 3-Way Handshake [Transport] : SYN -> SYN-ACK -> ACK establishes reliable byte stream
--- (secures communication) --> TLS 1.3 Cryptographic Handshake [Security] : Exchanges keys, validates SSL certificate, enables encryption
-- (sends HTTP GET) --> Web Server & API Gateway [Backend] : Server routes request and executes backend application logic
--- (fetches state) --> Database Query [Storage] : Reads data from PostgreSQL/Redis and generates HTML payload
-- (streams payload back) --> Browser Rendering Pipeline [Frontend] : Browser receives HTML stream and builds page in memory
--- (parses HTML tokens) --> DOM Tree Constructed [Parsing] : Builds hierarchical tree representing document structure
--- (parses CSS styles) --> CSSOM Tree Generated [Styling] : Calculates computed layout styles for each element
--- (combines DOM + CSSOM) --> Render Tree & Layout Engine [Layout] : Computes exact pixel coordinates and geometry for every element
--- (rasterizes pixels) --> GPU Paint & Composite {banner} [Final Output] : Draws pixels on user screen and attaches event listeners

Output ONLY the Markdown list inside a code block.`,
  },
  {
    id: 'tech-architecture',
    title: '🏗️ Technical System Design & Data Pipeline Flow',
    category: 'Engineering',
    badge: 'Architecture',
    description: 'Client → Edge CDN → Gateway → Microservices → Caching → DB → Event Streams with failure paths',
    prompt: `Act as a Principal Software Architect. Generate an end-to-end Technical Architecture & Data Flow Mind Map for: "[REPLACE WITH YOUR SYSTEM / TECH STACK]".

Instructions:
1. Trace the exact lifecycle of a request through every infrastructure layer instead of merely listing technologies.
2. Flow Stages:
   - Client Layer (Mobile/Web) → (HTTPS request) → Edge CDN & WAF (DDoS defense)
   - API Gateway & Load Balancer → (routes traffic) → Authentication & Token Verification {diamond}
   - Business Microservices → (via gRPC/REST) → Domain Processing Logic
   - In-Memory Caching (Redis/Memcached) → (cache hit vs cache miss {diamond}) → Primary Database (PostgreSQL/MongoDB)
   - Async Event Streaming (Kafka/RabbitMQ) → (publishes event) → Downstream Workers & Analytics
   - Monitoring & Observability (OpenTelemetry/Prometheus) → (emits traces & alerts)
3. For every service, explain its exact function, protocols used, latency profile, and failure fallback mechanism.
4. Use relationship arrows: "-- (via gRPC) -->", "-- (publishes event) -->", "-- (queries primary) -->", "-- (fallback query) -->".
5. Use tags like [Edge], [Gateway], [Service], [Database], [Cache], [Queue], [Security].

Output ONLY the Markdown list inside a code block.`,
  },
  {
    id: 'science-mechanism',
    title: '🔬 Science, Biology & Physical Mechanism Flow',
    category: 'Science',
    badge: 'Scientific',
    description: 'Stimulus → Cellular/Molecular Detection → Chemical Cascade → Counter-Reaction → Homeostasis',
    prompt: `Act as a Research Scientist and Biophysics Educator. Generate a detailed, step-by-step Scientific Mechanism Flow Mind Map for: "[REPLACE WITH YOUR SCIENTIFIC / BIOLOGICAL TOPIC]".

Instructions:
1. Explain the chronological physical/chemical chain reaction rather than listing dry scientific definitions.
2. Mechanism Stages:
   - Initial Stimulus / Infiltration: What physical agent or signal initiates the reaction?
   - Reception & Molecular Binding: How do surface receptors or catalysts detect the signal?
   - Signal Transduction Cascade: What enzymes, secondary messengers, or chemical shifts propagate the cascade?
   - Cellular / Mechanical Response: What active counter-measures, structural transformations, or outputs occur?
   - Regulation & Feedback Loop {diamond}: How does the system detect excess/depletion to throttle or terminate?
   - Final Equilibrium / Biological State {banner}: What is the long-term stable outcome?
3. Use relationship arrows with action verbs: "-- (binds to receptor) -->", "-- (catalyzes phosphorylation) -->", "-- (activates transcription) -->".
4. Add tags like [Stimulus], [Receptor], [Enzyme], [Cascade], [Output], [Feedback].

Output ONLY the Markdown list inside a code block.`,
  },
  {
    id: 'customer-journey',
    title: '💼 Customer Journey, Product Funnel & Business Flow',
    category: 'Product & Business',
    badge: 'Funnel',
    description: 'Discovery → Onboarding → Aha Moment → Retention Loop → Conversion & Referral',
    prompt: `Act as a Chief Product Officer & Growth Strategist. Generate an end-to-end Customer Journey & Product Funnel Mind Map for: "[REPLACE WITH YOUR PRODUCT / BUSINESS IDEA]".

Instructions:
1. Map out the psychological and behavioral progression of the user from total stranger to loyal advocate.
2. Funnel Stages:
   - Acquisition & Discovery: Inbound marketing, SEO, paid ads, or organic word-of-mouth.
   - Initial Landing & Hook: Value proposition clarity, initial perception, friction elimination.
   - Frictionless Onboarding: Account creation, quick setup, minimal cognitive load.
   - Core Value Realization (Aha! Moment): The exact moment the user experiences the promised benefit.
   - Retention Loop & Habits: Triggers, investments, variable rewards, email re-engagement.
   - Monetization & Upgrade Trigger {diamond}: Free vs Paid tier gate, value-based pricing trigger.
   - Advocacy & Viral Loop {banner}: Customer referral, sharing, NPS promoters.
3. Use connection arrows for user progression and drop-off recovery: "-- (completes onboarding) -->", "-- (if abandoned) --> (re-engagement email) -->", "-- (upgrades plan) -->".
4. Add tags like [Top of Funnel], [Activation], [Aha Moment], [Retention], [Monetization], [Referral].

Output ONLY the Markdown list inside a code block.`,
  },
  {
    id: 'decision-tree',
    title: '⚖️ Decision Matrix, Branching Logic & Trade-offs',
    category: 'Strategy & Logic',
    badge: 'Decision',
    description: 'Root Problem → Criteria → Conditional Paths ({diamond}) → Trade-offs → Contingency Plans',
    prompt: `Act as a Strategic Decision Analyst. Generate an educational Decision Tree & Trade-off Mind Map for: "[REPLACE WITH YOUR PROBLEM / DECISION]".

Instructions:
1. Line 1: Root Problem Statement "# [Problem / Strategic Crossroads]".
2. Decision Pillars: Identify the 2-4 critical constraints (e.g. Budget, Timeline, Scalability, Team Expertise).
3. Branching Decision Gates: Use {diamond} nodes with clear conditional arrows:
   -- (Option A: High Scale / High Budget) --> Approach A {pill} : Comprehensive description
   --- Trade-offs [Pros & Cons] : Key advantages vs major drawbacks
   --- Resource Demands [Requirements] : Engineering headcount and infra budget
   --- Failure Modes & Contingency [Risk] : What could go wrong and how to recover
   -- (Option B: Fast MVP / Low Budget) --> Approach B {pill} : Lightweight description
   --- Trade-offs [Pros & Cons] : Speed vs technical debt
4. Conclusion: Conclude each path with a recommended outcome milestone {banner}.

Output ONLY the Markdown list inside a code block.`,
  },
  {
    id: 'incident-rca',
    title: '🐞 Bug Triage, Root Cause Analysis & Incident Response',
    category: 'Engineering',
    badge: 'Reliability',
    description: 'Anomaly Detected → Triage → Containment → Root Cause (5 Whys) → Hotfix → Post-Mortem',
    prompt: `Act as a Site Reliability Engineer (SRE) & Incident Commander. Generate an Incident Response & Root Cause Analysis (RCA) Mind Map for: "[REPLACE WITH YOUR INCIDENT / BUG SCENARIO]".

Instructions:
1. Trace the full lifecycle of an incident from automated alert to permanent architectural fix.
2. Flow Stages:
   - Detection & Automated Alert [Monitoring] : PagerDuty/Datadog alert triggered on error spikes or latency threshold.
   - Severity Triage & War Room [Command] : P1/P2 classification and responder assignment.
   - Blast Radius Containment [Immediate Mitigation] : Traffic diversion, circuit breaker trip, rollback {diamond}.
   - Deep Diagnostics & 5-Whys [Root Cause Investigation] : Tracing distributed logs, profiling heap/CPU, identifying the failure.
   - Hotfix Deployment & Verification [Recovery] : Canary rollout, smoke testing, metric stabilization.
   - Post-Mortem & Preventative Hardening {banner} [Long-Term] : Regression unit tests, circuit breakers, runbook updates.
3. Use connection comments: "-- (triggers alert) -->", "-- (if critical P1) -->", "-- (root cause identified) -->".
4. Add tags like [Detection], [Mitigation], [Root Cause], [Hotfix], [Post-Mortem].

Output ONLY the Markdown list inside a code block.`,
  },
  {
    id: 'educational-textbook',
    title: '🎓 Deep Concept Explainer ("Compressed Textbook")',
    category: 'Education & Mastery',
    badge: 'Concepts',
    description: 'Deeply teaches complex concepts from first principles with intuitive mental models',
    prompt: `I want you to create an Educational Mind Map for MapMind that EXPLAINS and TEACHES the topic: "[REPLACE WITH YOUR TOPIC]", not merely lists its subtopics.

The biggest requirement is:
DO NOT generate a collection of short bullet points or mere keywords.
Every important branch must explain the idea behind it, its purpose, how it works, and how it connects to the parent topic.
Think of the Mind Map as a "compressed textbook" rather than a "table of contents".

For every major concept, address:
- What is it?
- Why is it important?
- How does it work?
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

Output ONLY the Markdown list inside a code block.`,
  },
  {
    id: 'notes-distiller',
    title: '📑 Notes, Document & Transcript Distiller',
    category: 'Productivity',
    badge: 'Synthesis',
    description: 'Distills lengthy unstructured notes, transcripts, or articles into an actionable knowledge map',
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
