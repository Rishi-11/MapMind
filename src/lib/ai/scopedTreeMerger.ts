import { MapMindNode, MapMindEdge, NodeColorTheme, NodeShape, NodeCardStyle } from '@/types/graph';

export interface ScopedMergeResult {
  newNodes: MapMindNode[];
  newEdges: MapMindEdge[];
  allNodes: MapMindNode[];
  allEdges: MapMindEdge[];
  addedCount: number;
}

interface ParsedScopedItem {
  relativeLevel: number;
  label: string;
  sublabel?: string;
  tags?: string[];
  shape?: NodeShape;
  cardStyle?: NodeCardStyle;
  edgeLabel?: string;
}

/**
 * Strips markdown code fence wrappers (```markdown ... ```)
 */
function extractContentFromCodeBlocks(text: string): string {
  const codeBlockRegex = /```(?:markdown|mindmap|mermaid|json|text)?\s*([\s\S]*?)```/i;
  const match = text.match(codeBlockRegex);
  if (match && match[1]) {
    return match[1];
  }
  return text;
}

/**
 * Parses raw text line into a scoped item with tags, shape, comments, and sublabels.
 */
function parseScopedLine(line: string): ParsedScopedItem | null {
  // Determine indent level: dashes (- or -- or ---), stars (*), or whitespace
  let relativeLevel = 1;
  let cleanLine = line.trim();

  // Match dash hierarchy (- Item, -- Item, --- Item)
  const dashMatch = cleanLine.match(/^(-+)\s+(.*)$/);
  if (dashMatch) {
    relativeLevel = dashMatch[1].length;
    cleanLine = dashMatch[2];
  } else {
    // Check star hierarchy (* or ** or ***)
    const starMatch = cleanLine.match(/^(\*+)\s+(.*)$/);
    if (starMatch) {
      relativeLevel = starMatch[1].length;
      cleanLine = starMatch[2];
    } else {
      // Check indentation count
      const leadingSpaces = line.search(/\S/);
      if (leadingSpaces > 0) {
        relativeLevel = Math.max(1, Math.floor(leadingSpaces / 2) + 1);
      }
    }
  }

  // Check for connection flow comment e.g. "(leads to) --> [Title]"
  let edgeLabel: string | undefined = undefined;
  const arrowMatch = cleanLine.match(/^\((.*?)\)\s*-->\s*(.*)$/);
  if (arrowMatch) {
    edgeLabel = arrowMatch[1].trim();
    cleanLine = arrowMatch[2].trim();
  }

  // Check for node shapes: {diamond}, {cloud}, {banner}, {pill}, {hexagon}
  let shape: NodeShape | undefined = undefined;
  const shapeMatch = cleanLine.match(/\{(diamond|cloud|banner|pill|hexagon|rounded)\}/i);
  if (shapeMatch) {
    shape = shapeMatch[1].toLowerCase() as NodeShape;
    cleanLine = cleanLine.replace(shapeMatch[0], '').trim();
  }

  // Check for card styles: {style: bold|classy|gradient|notion}
  let cardStyle: NodeCardStyle | undefined = undefined;
  const styleMatch = cleanLine.match(/\{style:\s*(bold|classy|gradient|notion|glass|terminal)\}/i);
  if (styleMatch) {
    cardStyle = styleMatch[1].toLowerCase() as NodeCardStyle;
    cleanLine = cleanLine.replace(styleMatch[0], '').trim();
  }

  // Check for tags: [Tag1, Tag2]
  const tags: string[] = [];
  const tagMatches = cleanLine.match(/\[(.*?)\]/g);
  if (tagMatches) {
    tagMatches.forEach((t) => {
      const inner = t.replace(/[\[\]]/g, '').trim();
      if (inner && inner.length < 30) {
        inner.split(',').forEach((seg) => {
          const s = seg.trim();
          if (s) tags.push(s);
        });
      }
    });
    cleanLine = cleanLine.replace(/\[(.*?)\]/g, '').trim();
  }

  // Check for sublabel separator (": " or " - ")
  let label = cleanLine;
  let sublabel: string | undefined = undefined;

  const colonIdx = cleanLine.indexOf(':');
  if (colonIdx > 0 && colonIdx < 80) {
    label = cleanLine.substring(0, colonIdx).trim();
    sublabel = cleanLine.substring(colonIdx + 1).trim();
  }

  if (!label) return null;

  return {
    relativeLevel,
    label,
    sublabel: sublabel || undefined,
    tags: tags.length > 0 ? tags : undefined,
    shape,
    cardStyle,
    edgeLabel,
  };
}

/**
 * Merges newly generated scoped Markdown branches as direct children and subtrees
 * of an existing target node in the mind map.
 */
export function mergeScopedMarkdownSubtree(
  rawMarkdown: string,
  targetNodeId: string,
  currentNodes: MapMindNode[],
  currentEdges: MapMindEdge[],
  options: { edgeRoutingStyle?: 'curved' | 'straight' | 'step' | 'smoothstep' } = {}
): ScopedMergeResult {
  const cleanText = extractContentFromCodeBlocks(rawMarkdown).trim();
  const lines = cleanText
    .split('\n')
    .map((l) => l.replace(/\r/g, ''))
    .filter((l) => l.trim().length > 0);

  const targetNode = currentNodes.find((n) => n.id === targetNodeId);
  const targetTheme = (targetNode?.data?.colorTheme || 'blue') as NodeColorTheme;
  const edgeRouting = options.edgeRoutingStyle || 'curved';

  if (lines.length === 0 || !targetNode) {
    return {
      newNodes: [],
      newEdges: [],
      allNodes: currentNodes,
      allEdges: currentEdges,
      addedCount: 0,
    };
  }

  const parsedItems: ParsedScopedItem[] = [];
  const targetLabelLower = targetNode.data?.label?.toLowerCase().trim() || '';

  for (const line of lines) {
    // If the AI accidentally outputs `# Target Node` as the first line, skip it
    if (/^#+\s+/.test(line.trim())) {
      const headerTitle = line.replace(/^#+\s+/, '').toLowerCase().trim();
      if (headerTitle === targetLabelLower || parsedItems.length === 0) {
        continue;
      }
    }

    const item = parseScopedLine(line);
    if (item) {
      // If direct child has same title as target, skip duplicate root line
      if (parsedItems.length === 0 && item.label.toLowerCase().trim() === targetLabelLower) {
        continue;
      }
      parsedItems.push(item);
    }
  }

  if (parsedItems.length === 0) {
    return {
      newNodes: [],
      newEdges: [],
      allNodes: currentNodes,
      allEdges: currentEdges,
      addedCount: 0,
    };
  }

  // Normalize min relative level to 1
  const minLevel = Math.min(...parsedItems.map((i) => i.relativeLevel));
  const normalizedItems = parsedItems.map((i) => ({
    ...i,
    relativeLevel: Math.max(1, i.relativeLevel - minLevel + 1),
  }));

  // Build tree nodes and edges
  const newNodes: MapMindNode[] = [];
  const newEdges: MapMindEdge[] = [];

  // Track parent at each depth level: depth 0 is targetNodeId
  const levelParentMap = new Map<number, string>();
  levelParentMap.set(0, targetNodeId);

  const baseTimestamp = Date.now();

  normalizedItems.forEach((item, index) => {
    const nodeId = `node_ai_${baseTimestamp}_${index}_${Math.random().toString(36).substring(2, 6)}`;
    const depth = item.relativeLevel;

    // Find immediate parent for this depth
    let parentId = levelParentMap.get(depth - 1) || targetNodeId;

    // Position initially near parent with slight offset (auto-layout will pack cleanly)
    const pNode = currentNodes.find((n) => n.id === parentId) || newNodes.find((n) => n.id === parentId);
    const px = pNode ? pNode.position.x : targetNode.position.x;
    const py = pNode ? pNode.position.y : targetNode.position.y;

    const newNode: MapMindNode = {
      id: nodeId,
      type: 'custom',
      position: {
        x: px + (depth * 220),
        y: py + (index * 80),
      },
      data: {
        label: item.label,
        sublabel: item.sublabel,
        tags: item.tags || (depth === 1 ? ['AI Expansion'] : undefined),
        colorTheme: targetTheme,
        shape: item.shape,
        cardStyle: item.cardStyle,
        isEditing: false,
      },
    };

    const newEdge: MapMindEdge = {
      id: `e_${parentId}_${nodeId}_${baseTimestamp}_${index}`,
      source: parentId,
      target: nodeId,
      type: 'custom',
      label: item.edgeLabel,
      data: {
        routingStyle: edgeRouting,
        colorTheme: targetTheme,
        label: item.edgeLabel,
      },
    };

    newNodes.push(newNode);
    newEdges.push(newEdge);

    // Update levelParentMap for subsequent children
    levelParentMap.set(depth, nodeId);
  });

  // Ensure target node is uncollapsed
  const updatedCurrentNodes = currentNodes.map((n) =>
    n.id === targetNodeId ? { ...n, data: { ...n.data, collapsed: false } } : n
  );

  return {
    newNodes,
    newEdges,
    allNodes: [...updatedCurrentNodes, ...newNodes],
    allEdges: [...currentEdges, ...newEdges],
    addedCount: newNodes.length,
  };
}
