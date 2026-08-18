import { MapMindNode, MapMindEdge } from '@/types/graph';

export interface NodeExpansionContext {
  targetNode: {
    id: string;
    label: string;
    sublabel?: string;
    tags?: string[];
    colorTheme?: string;
  };
  ancestorBreadcrumbs: string[];
  ancestorPathString: string;
  existingChildren: string[];
  existingDescendants: string[];
  siblingTopics: string[];
  exclusionList: string[];
}

/**
 * Extracts comprehensive hierarchical context, ancestor breadcrumbs, and
 * negative-constraint exclusion lists for a selected node.
 */
export function extractNodeExpansionContext(
  targetNodeId: string,
  nodes: MapMindNode[],
  edges: MapMindEdge[]
): NodeExpansionContext | null {
  const nodeMap = new Map<string, MapMindNode>();
  nodes.forEach((n) => nodeMap.set(n.id, n));

  const targetNode = nodeMap.get(targetNodeId);
  if (!targetNode) return null;

  // 1. Trace Ancestor Path (Root -> ... -> Target)
  const incomingParentMap = new Map<string, string>();
  edges.forEach((e) => {
    if (e.source !== e.target && !incomingParentMap.has(e.target)) {
      incomingParentMap.set(e.target, e.source);
    }
  });

  const ancestorChain: MapMindNode[] = [];
  const visitedAncestors = new Set<string>([targetNodeId]);
  let currentParentId = incomingParentMap.get(targetNodeId);

  while (currentParentId && !visitedAncestors.has(currentParentId)) {
    visitedAncestors.add(currentParentId);
    const parentNode = nodeMap.get(currentParentId);
    if (parentNode) {
      ancestorChain.unshift(parentNode);
    }
    currentParentId = incomingParentMap.get(currentParentId);
  }

  const ancestorBreadcrumbs = ancestorChain.map((n) => n.data?.label || 'Untitled Topic');
  const fullPath = [...ancestorBreadcrumbs, targetNode.data?.label || 'Untitled Topic'];
  const ancestorPathString = fullPath.join(' → ');

  // 2. Direct Siblings (other children of immediate parent)
  const immediateParentId = incomingParentMap.get(targetNodeId);
  const siblingTopics: string[] = [];

  if (immediateParentId) {
    const siblingEdges = edges.filter(
      (e) => e.source === immediateParentId && e.target !== targetNodeId && e.source !== e.target
    );
    siblingEdges.forEach((e) => {
      const sibNode = nodeMap.get(e.target);
      if (sibNode?.data?.label) {
        siblingTopics.push(sibNode.data.label.trim());
      }
    });
  }

  // 3. Existing Direct Children
  const directChildEdges = edges.filter(
    (e) => e.source === targetNodeId && e.target !== targetNodeId
  );
  const existingChildren: string[] = [];
  directChildEdges.forEach((e) => {
    const childNode = nodeMap.get(e.target);
    if (childNode?.data?.label) {
      existingChildren.push(childNode.data.label.trim());
    }
  });

  // 4. Existing All Descendants (Subtree Reachability)
  const existingDescendants: string[] = [];
  const queue: string[] = [...directChildEdges.map((e) => e.target)];
  const visitedDescendants = new Set<string>(queue);

  while (queue.length > 0) {
    const currId = queue.shift()!;
    const currNode = nodeMap.get(currId);
    if (currNode?.data?.label && !existingDescendants.includes(currNode.data.label.trim())) {
      existingDescendants.push(currNode.data.label.trim());
    }

    const subEdges = edges.filter((e) => e.source === currId && e.source !== e.target);
    for (const edge of subEdges) {
      if (!visitedDescendants.has(edge.target)) {
        visitedDescendants.add(edge.target);
        queue.push(edge.target);
      }
    }
  }

  // 5. Compile Exclusion List (Unique set of existing descendants + siblings)
  const exclusionSet = new Set<string>();
  existingDescendants.forEach((d) => exclusionSet.add(d));
  siblingTopics.forEach((s) => exclusionSet.add(s));
  const exclusionList = Array.from(exclusionSet).filter(Boolean);

  return {
    targetNode: {
      id: targetNode.id,
      label: targetNode.data?.label || 'Untitled Topic',
      sublabel: targetNode.data?.sublabel,
      tags: targetNode.data?.tags,
      colorTheme: targetNode.data?.colorTheme,
    },
    ancestorBreadcrumbs,
    ancestorPathString,
    existingChildren,
    existingDescendants,
    siblingTopics,
    exclusionList,
  };
}
