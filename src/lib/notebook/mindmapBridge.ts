import { MapMindNode, MapMindEdge, NodeColorTheme } from '@/types/graph';
import { parseFrontmatter, extractWikiLinks } from './links';

const COLOR_PALETTE: NodeColorTheme[] = ['blue', 'emerald', 'purple', 'amber', 'rose', 'cyan'];

interface OutlineItem {
  id: string;
  label: string;
  sublabel?: string;
  level: number;
  tags: string[];
  wikiLinks: string[];
  children: OutlineItem[];
}

/**
 * Converts a structured Markdown page into a complete MapMind mind map graph
 */
export function markdownToMindMap(
  pageTitle: string,
  markdownContent: string,
  pageId?: string
): { nodes: MapMindNode[]; edges: MapMindEdge[] } {
  const { body } = parseFrontmatter(markdownContent);
  const lines = body.split(/\r?\n/);

  // Parse lines into hierarchy (Headings #, ##, ### or bullet lists -, *, 1.)
  const rootItem: OutlineItem = {
    id: 'root-mindmap',
    label: pageTitle || 'Central Topic',
    sublabel: 'Interactive Knowledge Mind Map',
    level: 0,
    tags: ['Root'],
    wikiLinks: [],
    children: [],
  };

  const stack: OutlineItem[] = [rootItem];
  let idCounter = 1;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Detect heading
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      const depth = headingMatch[1].length;
      let title = headingMatch[2].trim();
      let sublabel = '';

      // Extract wiki links if any
      const wikiLinks = extractWikiLinks(title).map((w) => w.targetTitle);
      title = title.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_m, p1, p2) => p2 || p1);

      // Check for inline badges or tags
      const tags: string[] = [];
      const tagMatches = title.match(/#([a-zA-Z0-9_\-/]+)/g);
      if (tagMatches) {
        tagMatches.forEach((t) => tags.push(t.slice(1)));
        title = title.replace(/#([a-zA-Z0-9_\-/]+)/g, '').trim();
      }

      // Check for sublabel delimiter (e.g. "Title - Sublabel" or "Title: Sublabel")
      const splitIdx = title.indexOf(' - ');
      if (splitIdx > 0) {
        sublabel = title.slice(splitIdx + 3).trim();
        title = title.slice(0, splitIdx).trim();
      }

      const item: OutlineItem = {
        id: `node-${idCounter++}`,
        label: title,
        sublabel: sublabel || undefined,
        level: depth,
        tags,
        wikiLinks,
        children: [],
      };

      // Pop stack until parent level is lower
      while (stack.length > 1 && stack[stack.length - 1].level >= depth) {
        stack.pop();
      }

      stack[stack.length - 1].children.push(item);
      stack.push(item);
      continue;
    }

    // Detect bullet list item
    const listMatch = line.match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/);
    if (listMatch) {
      const indent = listMatch[1].length;
      const depth = Math.floor(indent / 2) + 1 + (stack.length > 1 ? stack[stack.length - 1].level : 1);
      let text = listMatch[3].trim();

      // Check task checkbox
      if (text.startsWith('[ ] ')) {
        text = '☐ ' + text.slice(4);
      } else if (text.startsWith('[x] ') || text.startsWith('[X] ')) {
        text = '☑ ' + text.slice(4);
      }

      const wikiLinks = extractWikiLinks(text).map((w) => w.targetTitle);
      text = text.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_m, p1, p2) => p2 || p1);

      const item: OutlineItem = {
        id: `node-${idCounter++}`,
        label: text.slice(0, 75),
        sublabel: text.length > 75 ? text.slice(75, 140) + '...' : undefined,
        level: depth,
        tags: [],
        wikiLinks,
        children: [],
      };

      while (stack.length > 1 && stack[stack.length - 1].level >= depth) {
        stack.pop();
      }

      stack[stack.length - 1].children.push(item);
      stack.push(item);
    }
  }

  // Convert Outline tree into React Flow MapMindNode & MapMindEdge arrays
  const nodes: MapMindNode[] = [];
  const edges: MapMindEdge[] = [];

  // Root node
  nodes.push({
    id: rootItem.id,
    type: 'custom',
    position: { x: 0, y: 0 },
    selected: true,
    data: {
      label: rootItem.label,
      sublabel: rootItem.sublabel,
      isRoot: true,
      colorTheme: 'blue',
      shape: 'pill',
      cardStyle: 'notion',
      tags: ['Root Topic'],
      pageId,
      linkedNoteTitle: pageTitle,
    },
  });

  // Balanced Radial/Left-Right placement algorithm
  const mainBranches = rootItem.children;
  const leftBranches: OutlineItem[] = [];
  const rightBranches: OutlineItem[] = [];

  mainBranches.forEach((branch, i) => {
    if (i % 2 === 0) rightBranches.push(branch);
    else leftBranches.push(branch);
  });

  // Traverse and place right side
  let rightY = -((rightBranches.length - 1) * 140) / 2;
  rightBranches.forEach((branch, idx) => {
    const colorTheme = COLOR_PALETTE[idx % COLOR_PALETTE.length];
    traverseAndPosition(branch, rootItem.id, 340, rightY, 1, colorTheme, nodes, edges, pageId);
    rightY += 150;
  });

  // Traverse and place left side
  let leftY = -((leftBranches.length - 1) * 140) / 2;
  leftBranches.forEach((branch, idx) => {
    const colorTheme = COLOR_PALETTE[(idx + 3) % COLOR_PALETTE.length];
    traverseAndPosition(branch, rootItem.id, -340, leftY, -1, colorTheme, nodes, edges, pageId);
    leftY += 150;
  });

  return { nodes, edges };
}

function traverseAndPosition(
  item: OutlineItem,
  parentId: string,
  x: number,
  y: number,
  direction: 1 | -1,
  colorTheme: NodeColorTheme,
  nodes: MapMindNode[],
  edges: MapMindEdge[],
  pageId?: string
) {
  nodes.push({
    id: item.id,
    type: 'custom',
    position: { x, y },
    data: {
      label: item.label,
      sublabel: item.sublabel,
      colorTheme,
      shape: item.children.length > 0 ? 'card' : 'pill',
      cardStyle: 'default',
      tags: item.tags.length > 0 ? item.tags : undefined,
      wikiLinks: item.wikiLinks.length > 0 ? item.wikiLinks : undefined,
      pageId: item.wikiLinks.length > 0 ? undefined : pageId,
    },
  });

  edges.push({
    id: `edge-${parentId}-${item.id}`,
    source: parentId,
    target: item.id,
    type: 'custom',
    data: {
      colorTheme,
      routingStyle: 'curved',
    },
  });

  let childY = y - ((item.children.length - 1) * 85) / 2;
  item.children.forEach((child) => {
    const childX = x + direction * 280;
    traverseAndPosition(child, item.id, childX, childY, direction, colorTheme, nodes, edges, pageId);
    childY += 95;
  });
}

/**
 * Converts a MapMind mind map graph back into a clean Markdown note
 */
export function mindMapToMarkdown(nodes: MapMindNode[], edges: MapMindEdge[], rootTitle?: string): string {
  if (nodes.length === 0) return '# Blank Diagram\n';

  // Find root node or first node
  const rootNode = nodes.find((n) => n.data?.isRoot) || nodes[0];
  const title = rootTitle || rootNode.data?.label || 'Untitled Note';

  // Build adjacency tree
  const childrenMap = new Map<string, string[]>();
  for (const edge of edges) {
    const list = childrenMap.get(edge.source) || [];
    list.push(edge.target);
    childrenMap.set(edge.source, list);
  }

  const nodeMap = new Map<string, MapMindNode>();
  for (const n of nodes) {
    nodeMap.set(n.id, n);
  }

  let markdown = `# ${title}\n\n`;
  if (rootNode.data?.sublabel) {
    markdown += `> ${rootNode.data.sublabel}\n\n`;
  }

  const visited = new Set<string>([rootNode.id]);

  function exportSubtree(nodeId: string, depth: number) {
    const childIds = childrenMap.get(nodeId) || [];

    for (const childId of childIds) {
      if (visited.has(childId)) continue;
      visited.add(childId);

      const child = nodeMap.get(childId);
      if (!child) continue;

      const label = child.data?.label || 'Untitled';
      const sublabel = child.data?.sublabel;
      const tags = (child.data?.tags as string[]) || [];
      const notes = child.data?.notes as string;

      let tagSuffix = tags.length > 0 ? ` #${tags.join(' #')}` : '';

      if (depth === 1) {
        markdown += `## ${label}${tagSuffix}\n`;
        if (sublabel) markdown += `${sublabel}\n\n`;
        if (notes) markdown += `${notes}\n\n`;
      } else if (depth === 2) {
        markdown += `### ${label}${tagSuffix}\n`;
        if (sublabel) markdown += `${sublabel}\n\n`;
        if (notes) markdown += `${notes}\n\n`;
      } else {
        const indent = '  '.repeat(depth - 3);
        markdown += `${indent}- **${label}**${sublabel ? `: ${sublabel}` : ''}${tagSuffix}\n`;
        if (notes) markdown += `${indent}  > ${notes}\n`;
      }

      exportSubtree(childId, depth + 1);
    }
  }

  exportSubtree(rootNode.id, 1);

  // Catch any orphan nodes that weren't connected to root
  const orphans = nodes.filter((n) => !visited.has(n.id));
  if (orphans.length > 0) {
    markdown += `\n## Additional Concepts\n`;
    for (const orphan of orphans) {
      markdown += `- ${orphan.data?.label || 'Node'}${orphan.data?.sublabel ? ` - ${orphan.data.sublabel}` : ''}\n`;
    }
  }

  return markdown;
}
