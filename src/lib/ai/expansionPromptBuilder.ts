import { NodeExpansionContext } from './nodeContextExtractor';

export interface ExpansionPreset {
  id: string;
  title: string;
  iconName: string;
  description: string;
  directive: string;
}

export const EXPANSION_PRESETS: ExpansionPreset[] = [
  {
    id: 'deep-dive',
    title: '🔬 Deep Dive & Inner Mechanisms',
    iconName: 'Microscope',
    description: 'Explains underlying mechanisms, components, how it works, and key concepts',
    directive:
      'Provide 4 to 6 detailed sub-branches that explain the internal mechanisms, how this concept operates in detail, its core components, and why it works.',
  },
  {
    id: 'examples',
    title: '💡 Practical Examples & Use Cases',
    iconName: 'Lightbulb',
    description: 'Adds real-world industry examples, practical scenarios, and case studies',
    directive:
      'Provide 4 to 5 concrete, practical real-world examples, industry applications, or case studies demonstrating this topic in practice.',
  },
  {
    id: 'risks-troubleshooting',
    title: '⚠️ Risks, Edge Cases & Failure Modes',
    iconName: 'AlertTriangle',
    description: 'Explores failure points, common bugs/pitfalls, edge cases, and mitigations',
    directive:
      'Provide 4 to 5 sub-branches detailing common pitfalls, potential risks, failure modes, edge cases, and best-practice mitigations.',
  },
  {
    id: 'process-flow',
    title: '⚡ Sequential Steps & Next Actions',
    iconName: 'Workflow',
    description: 'Breaks down this topic into ordered execution steps and downstream outcomes',
    directive:
      'Break this concept into 4 to 6 sequential process steps, workflows, or chronological phases with connection comments.',
  },
  {
    id: 'sub-categories',
    title: '🎯 4-6 Core Sub-Categories',
    iconName: 'Layers',
    description: 'Generates structured, non-overlapping category branches',
    directive:
      'Generate 4 to 6 distinct, mutually exclusive sub-categories or pillars that divide this topic cleanly.',
  },
];

export interface PromptBuildOptions {
  customDirective?: string;
  presetId?: string;
  numBranches?: number;
}

/**
 * Dynamically compiles a context-grounded, loop-immune expansion prompt.
 */
export function buildExpansionPrompt(
  context: NodeExpansionContext,
  options: PromptBuildOptions = {}
): string {
  const { customDirective, presetId = 'deep-dive' } = options;

  const preset = EXPANSION_PRESETS.find((p) => p.id === presetId) || EXPANSION_PRESETS[0];
  const directiveText = (customDirective && customDirective.trim().length > 0)
    ? customDirective.trim()
    : preset.directive;

  const targetName = context.targetNode.label;
  const tagsString = context.targetNode.tags && context.targetNode.tags.length > 0
    ? `[${context.targetNode.tags.join(', ')}]`
    : '';

  // Format exclusion list items
  const exclusionBlock = context.exclusionList.length > 0
    ? context.exclusionList.map((item) => `- "${item}"`).join('\n')
    : '(None currently)';

  return `I am building a structured, educational Mind Map in MapMind and need you to expand a specific node.

=== HIERARCHICAL CONTEXT & DOMAIN GROUNDING ===
- Root-to-Node Hierarchy: ${context.ancestorPathString}
- Target Node to Expand: "${targetName}" ${tagsString}
${context.targetNode.sublabel ? `- Target Sub-Notes: "${context.targetNode.sublabel}"\n` : ''}

=== YOUR EXPANSION GOAL ===
${directiveText}

=== STRICT LOOP PREVENTION (NEGATIVE CONSTRAINTS) ===
CRITICAL: Do NOT generate, duplicate, or repeat any of the following concepts, as they ALREADY exist in this branch or its siblings:
${exclusionBlock}

=== SYNTAX & OUTPUT FORMAT RULES ===
1. Output ONLY the new sub-branches in indented Markdown bullet list format inside a markdown code block.
2. The direct children of "${targetName}" MUST start with a single dash:
   - [New Subtopic 1] [Tag] : Concise educational explanation of what it is, how it works, or why it matters
   - [New Subtopic 2] [Tag] : Concise explanation
3. Sub-children (grandchildren of "${targetName}") must use double dashes:
   -- [Sub-detail A] : Explanation
   -- [Sub-detail B] : Explanation
4. If describing steps or sequences, you can add connection comments inside arrows:
   - (step 1) --> [Phase 1 Title] : Description
5. Card styles/shapes (optional): add {diamond} for decisions, {pill} for categories, {cloud} for theories.
6. Do NOT re-output the parent node "${targetName}" as a top header. Start directly with its new children (- New Subtopic).`;
}
