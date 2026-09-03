import { Page } from '@/types/notebook';
import { AiConnectionSuggestion, AiConnectionMode, ScoreBreakdown, KnowledgeAssistantMessage, KnowledgeAssistantCitation } from '@/types/ai';
import { parseFrontmatter, extractWikiLinks } from './links';

// Common English stop words
const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'aren', 'as', 'at',
  'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', 'can', 'cannot', 'could',
  'did', 'do', 'does', 'doing', 'down', 'during', 'each', 'few', 'for', 'from', 'further', 'had', 'has', 'have',
  'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'i', 'if', 'in', 'into', 'is',
  'it', 'its', 'itself', 'just', 'me', 'more', 'most', 'my', 'myself', 'no', 'nor', 'not', 'now', 'of', 'off',
  'on', 'once', 'only', 'or', 'other', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same', 'she', 'should',
  'so', 'some', 'such', 'than', 'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these',
  'they', 'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'we', 'were', 'what',
  'when', 'where', 'which', 'while', 'who', 'whom', 'why', 'with', 'would', 'you', 'your', 'yours', 'yourself'
]);

/**
 * Tokenizes and normalizes text into word frequency map
 */
export function tokenizeText(text: string): Map<string, number> {
  const clean = text
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\s+/g, ' ');

  const tokens = clean.split(' ');
  const freqMap = new Map<string, number>();

  for (const token of tokens) {
    if (token.length > 2 && !STOP_WORDS.has(token)) {
      freqMap.set(token, (freqMap.get(token) || 0) + 1);
    }
  }

  return freqMap;
}

/**
 * Computes cosine similarity between two term-frequency maps
 */
export function computeCosineSimilarity(vecA: Map<string, number>, vecB: Map<string, number>): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (const count of vecA.values()) {
    normA += count * count;
  }
  for (const count of vecB.values()) {
    normB += count * count;
  }

  if (normA === 0 || normB === 0) return 0;

  for (const [term, countA] of vecA.entries()) {
    const countB = vecB.get(term);
    if (countB) {
      dotProduct += countA * countB;
    }
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Extracts key technical concepts & noun phrases from text and title
 */
export function extractKeyConcepts(text: string, title = ''): string[] {
  const concepts = new Set<string>();
  const lines = text.split(/\r?\n/);

  // Add words from title
  if (title) {
    const titleWords = title.split(/[\s,/:_()-]+/).filter((w) => w.length > 2 && !STOP_WORDS.has(w.toLowerCase()));
    titleWords.forEach((w) => concepts.add(w.toLowerCase()));
  }

  for (const line of lines) {
    // Markdown headings often contain core concepts
    if (line.startsWith('#')) {
      const headingText = line.replace(/^#+\s*/, '').trim();
      if (headingText.length > 2) concepts.add(headingText.toLowerCase());
    }

    // Bold terms often highlight key concepts
    const boldMatches = line.match(/\*\*([^*]+)\*\*/g);
    if (boldMatches) {
      for (const m of boldMatches) {
        const cleaned = m.replace(/\*\*/g, '').trim().toLowerCase();
        if (cleaned.length > 2 && cleaned.length < 40) concepts.add(cleaned);
      }
    }

    // Extract capitalized words & key nouns (length >= 4)
    const words = line.split(/[\s,/:_().-]+/);
    for (const w of words) {
      const cleanW = w.trim().toLowerCase();
      if (cleanW.length >= 4 && !STOP_WORDS.has(cleanW) && !/^\d+$/.test(cleanW)) {
        concepts.add(cleanW);
      }
    }
  }

  return Array.from(concepts).slice(0, 30);
}

// Local user feedback cache in localStorage
const FEEDBACK_STORAGE_KEY = 'mapmind_ai_user_feedback';

function getLocalFeedback(): Record<string, 'accepted' | 'rejected'> {
  try {
    const data = localStorage.getItem(FEEDBACK_STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

export function recordAiFeedback(sourceTitle: string, targetTitle: string, action: 'accepted' | 'rejected'): void {
  try {
    const feedback = getLocalFeedback();
    const key = [sourceTitle.toLowerCase(), targetTitle.toLowerCase()].sort().join(':::');
    feedback[key] = action;
    localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(feedback));
  } catch (err) {
    console.error('Failed to save AI feedback:', err);
  }
}

/**
 * Computes multi-signal connection confidence between two pages
 */
export function analyzeRelationship(
  pageA: Page,
  pageB: Page,
  existingLinks: Set<string>
): { confidence: number; reason: string; suggestedRelationship: string; breakdown: ScoreBreakdown } {
  const { body: bodyA } = parseFrontmatter(pageA.content);
  const { body: bodyB } = parseFrontmatter(pageB.content);

  const tokensA = tokenizeText(`${pageA.title} ${pageA.title} ${bodyA}`);
  const tokensB = tokenizeText(`${pageB.title} ${pageB.title} ${bodyB}`);

  // 1. Semantic TF-IDF cosine similarity (40% weight)
  const semantic = computeCosineSimilarity(tokensA, tokensB);

  // 2. Shared concepts & keywords (30% weight)
  const conceptsA = new Set(extractKeyConcepts(bodyA, pageA.title));
  const conceptsB = new Set(extractKeyConcepts(bodyB, pageB.title));
  let sharedConceptCount = 0;
  const commonConcepts: string[] = [];
  for (const c of conceptsA) {
    if (conceptsB.has(c)) {
      sharedConceptCount++;
      commonConcepts.push(c);
    }
  }
  const maxConcepts = Math.max(1, Math.min(conceptsA.size, conceptsB.size));
  const sharedConceptsScore = Math.min(1.0, sharedConceptCount / Math.max(1, maxConcepts * 0.5));

  // 3. Proximity / Link distance (10% weight)
  const linkKeyAB = `${pageA.title.toLowerCase()}:::${pageB.title.toLowerCase()}`;
  const linkKeyBA = `${pageB.title.toLowerCase()}:::${pageA.title.toLowerCase()}`;
  const isDirectlyLinked = existingLinks.has(linkKeyAB) || existingLinks.has(linkKeyBA);
  const isSameSection = pageA.sectionId === pageB.sectionId;
  const isSameNotebook = pageA.notebookId === pageB.notebookId;
  const linkDistanceScore = isDirectlyLinked ? 1.0 : isSameSection ? 0.8 : isSameNotebook ? 0.5 : 0.2;

  // 4. Shared tags & properties (10% weight)
  const tagsA = new Set((pageA.tags || []).map((t) => t.toLowerCase()));
  const tagsB = new Set((pageB.tags || []).map((t) => t.toLowerCase()));
  let sharedTagsCount = 0;
  for (const t of tagsA) {
    if (tagsB.has(t)) sharedTagsCount++;
  }
  const sharedTagsScore = tagsA.size > 0 && tagsB.size > 0 ? sharedTagsCount / Math.max(1, Math.max(tagsA.size, tagsB.size)) : 0.1;

  // 5. Title token similarity (10% weight)
  const titleTokensA = new Set(tokenizeText(pageA.title).keys());
  const titleTokensB = new Set(tokenizeText(pageB.title).keys());
  let titleIntersection = 0;
  for (const t of titleTokensA) {
    if (titleTokensB.has(t)) titleIntersection++;
  }
  const titleUnion = new Set([...titleTokensA, ...titleTokensB]).size;
  const titleMatchScore = titleUnion > 0 ? titleIntersection / titleUnion : 0;

  // Calibrated weighted combination
  let rawScore =
    semantic * 0.35 +
    sharedConceptsScore * 0.30 +
    titleMatchScore * 0.15 +
    sharedTagsScore * 0.10 +
    linkDistanceScore * 0.10;

  // Intelligent boost curve so that notes with meaningful overlap score 60% - 95%
  if (rawScore > 0.35) {
    rawScore = Math.min(0.96, rawScore * 1.35 + 0.15);
  } else if (rawScore > 0.15 || sharedConceptCount >= 2 || titleIntersection > 0) {
    rawScore = Math.min(0.85, rawScore * 1.5 + 0.20);
  } else if (isSameSection) {
    rawScore = Math.min(0.70, rawScore + 0.30);
  }

  // Check learned feedback
  const feedback = getLocalFeedback();
  const pairKey = [pageA.title.toLowerCase(), pageB.title.toLowerCase()].sort().join(':::');
  if (feedback[pairKey] === 'accepted') {
    rawScore = Math.min(0.99, rawScore * 1.3);
  } else if (feedback[pairKey] === 'rejected') {
    rawScore = rawScore * 0.3;
  }

  const confidence = Math.min(0.99, Math.max(0.05, Math.round(rawScore * 100) / 100));

  // Determine relationship & reasoning
  let suggestedRelationship = 'related';
  let reason = `Semantic overlap (${Math.round(semantic * 100)}%) across core knowledge topics.`;

  if (commonConcepts.length > 0) {
    reason = `Shares foundational concepts including "${commonConcepts.slice(0, 3).join('", "')}".`;
    suggestedRelationship = 'uses';
  } else if (sharedTagsCount > 0) {
    reason = `Both categorized under shared tags (#${Array.from(tagsA).filter((t) => tagsB.has(t)).slice(0, 2).join(', #')}).`;
    suggestedRelationship = 'part_of';
  } else if (isSameSection) {
    reason = `Co-located in the same notebook section and related by context.`;
    suggestedRelationship = 'related';
  } else if (semantic > 0.5) {
    reason = `High architectural and conceptual overlap between ${pageA.title} and ${pageB.title}.`;
    suggestedRelationship = 'depends_on';
  }

  return {
    confidence,
    reason,
    suggestedRelationship,
    breakdown: {
      semantic: Math.round(semantic * 100) / 100,
      sharedConcepts: Math.round(sharedConceptsScore * 100) / 100,
      linkDistance: Math.round(linkDistanceScore * 100) / 100,
      sharedTags: Math.round(sharedTagsScore * 100) / 100,
      titleMatch: Math.round(titleMatchScore * 100) / 100,
    },
  };
}

/**
 * Discovers AI connection suggestions for a single page or whole workspace
 */
export function discoverAiSuggestions(
  targetPage: Page,
  allPages: Page[],
  mode: AiConnectionMode = 'suggest',
  threshold = 0.35
): AiConnectionSuggestion[] {
  if (mode === 'off' || allPages.length < 2) return [];

  // Effective threshold: allow generous matching so suggestions appear reliably
  const effectiveThreshold = Math.min(threshold, 0.40);

  // Build existing direct links set
  const existingLinks = new Set<string>();
  for (const page of allPages) {
    const links = extractWikiLinks(page.content);
    for (const link of links) {
      existingLinks.add(`${page.title.toLowerCase()}:::${link.targetTitle.toLowerCase()}`);
    }
  }

  const suggestions: AiConnectionSuggestion[] = [];
  const candidates: Array<{ page: Page; analysis: ReturnType<typeof analyzeRelationship> }> = [];

  for (const otherPage of allPages) {
    if (otherPage.id === targetPage.id) continue;

    // Check if already explicitly wiki-linked from targetPage to otherPage
    const isAlreadyLinked =
      existingLinks.has(`${targetPage.title.toLowerCase()}:::${otherPage.title.toLowerCase()}`) ||
      existingLinks.has(`${otherPage.title.toLowerCase()}:::${targetPage.title.toLowerCase()}`);

    const analysis = analyzeRelationship(targetPage, otherPage, existingLinks);

    if (!isAlreadyLinked || mode === 'assisted') {
      candidates.push({ page: otherPage, analysis });
      if (analysis.confidence >= effectiveThreshold) {
        suggestions.push({
          id: `ai-sug-${targetPage.id}-${otherPage.id}`,
          sourcePageId: targetPage.id,
          targetPageId: otherPage.id,
          sourceTitle: targetPage.title,
          targetTitle: otherPage.title,
          confidence: analysis.confidence,
          reason: analysis.reason,
          suggestedRelationship: analysis.suggestedRelationship,
          status: 'pending',
          mode,
          scoreBreakdown: analysis.breakdown,
          createdAt: new Date().toISOString(),
        });
      }
    }
  }

  // Fallback: If no suggestions exceeded effectiveThreshold, provide the top 3 highest scoring candidates
  if (suggestions.length === 0 && candidates.length > 0) {
    candidates.sort((a, b) => b.analysis.confidence - a.analysis.confidence);
    for (const c of candidates.slice(0, 3)) {
      if (c.analysis.confidence >= 0.15) {
        suggestions.push({
          id: `ai-sug-${targetPage.id}-${c.page.id}`,
          sourcePageId: targetPage.id,
          targetPageId: c.page.id,
          sourceTitle: targetPage.title,
          targetTitle: c.page.title,
          confidence: c.analysis.confidence,
          reason: c.analysis.reason,
          suggestedRelationship: c.analysis.suggestedRelationship,
          status: 'pending',
          mode,
          scoreBreakdown: c.analysis.breakdown,
          createdAt: new Date().toISOString(),
        });
      }
    }
  }

  // Sort by confidence descending
  return suggestions.sort((a, b) => b.confidence - a.confidence).slice(0, 10);
}

/**
 * "Ask My Knowledge" Local RAG Assistant
 * Retrieves top matching pages and synthesizes a structured answer citing sources [[Source]]
 */
export function queryKnowledgeAssistant(
  query: string,
  pages: Page[],
  notebookMap: Map<string, string>
): KnowledgeAssistantMessage {
  const queryTokens = tokenizeText(query);
  const scoredPages: Array<{ page: Page; score: number; bestSnippet: string }> = [];

  for (const page of pages) {
    const { body } = parseFrontmatter(page.content);
    const titleTokens = tokenizeText(page.title);
    const bodyTokens = tokenizeText(body);

    const titleSim = computeCosineSimilarity(queryTokens, titleTokens);
    const bodySim = computeCosineSimilarity(queryTokens, bodyTokens);

    const score = titleSim * 0.6 + bodySim * 0.4;

    if (score > 0.08 || page.title.toLowerCase().includes(query.toLowerCase())) {
      // Find the most relevant paragraph snippet
      const paragraphs = body.split(/\n\s*\n/);
      let bestSnippet = body.slice(0, 200);
      let bestParaScore = 0;

      for (const p of paragraphs) {
        const pTokens = tokenizeText(p);
        const pSim = computeCosineSimilarity(queryTokens, pTokens);
        if (pSim > bestParaScore) {
          bestParaScore = pSim;
          bestSnippet = p.trim().slice(0, 220);
        }
      }

      scoredPages.push({
        page,
        score: Math.max(score, bestParaScore),
        bestSnippet,
      });
    }
  }

  scoredPages.sort((a, b) => b.score - a.score);
  const topResults = scoredPages.slice(0, 4);

  if (topResults.length === 0) {
    return {
      id: `msg-${Date.now()}`,
      sender: 'assistant',
      content: `I searched across your notes but couldn't find any direct matches for "${query}".\n\nTry searching for broader keywords, topics, or tags stored in your notebooks.`,
      citations: [],
      timestamp: new Date().toISOString(),
    };
  }

  const citations: KnowledgeAssistantCitation[] = topResults.map((r) => ({
    pageId: r.page.id,
    pageTitle: r.page.title,
    notebookName: notebookMap.get(r.page.notebookId) || 'Notebook',
    snippet: r.bestSnippet,
    relevanceScore: Math.round(r.score * 100),
  }));

  const sourceList = topResults.map((r) => `- [[${r.page.title}]]: ${r.bestSnippet.replace(/\n/g, ' ')}`).join('\n\n');

  const answer = `Based on your local knowledge base, here is what I found regarding **"${query}"**:\n\n${sourceList}\n\n**Key Takeaway:**\nYour notes connect these concepts through architectural patterns, dependencies, and implementation references.`;

  return {
    id: `msg-${Date.now()}`,
    sender: 'assistant',
    content: answer,
    citations,
    timestamp: new Date().toISOString(),
  };
}
