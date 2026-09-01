import { Page } from '@/types/notebook';
import { Flashcard, QuizQuestion, ExecutiveSummary } from '@/types/learning';
import { parseFrontmatter, extractTags } from './links';

/**
 * Automatically extracts Flashcards from a note's markdown content
 */
export function generateFlashcards(
  page: Page,
  notebookName = 'Notebook'
): Flashcard[] {
  const { body } = parseFrontmatter(page.content);
  const cards: Flashcard[] = [];
  const lines = body.split(/\r?\n/);

  // 1. Definition patterns: "Term: Definition" or "**Term** - Definition"
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Match "**Term**: Definition" or "**Term** - Definition"
    const boldDefMatch = trimmed.match(/^\*?\*?([^*:\-–—]{2,50})\*?\*?\s*[:\-–—]\s*(.+)$/);
    if (boldDefMatch) {
      const term = boldDefMatch[1].replace(/[*_`#]/g, '').trim();
      const def = boldDefMatch[2].trim();

      if (term.length > 2 && def.length > 10 && !term.toLowerCase().startsWith('http')) {
        cards.push({
          id: `card-${page.id}-${cards.length + 1}`,
          sourcePageId: page.id,
          sourcePageTitle: page.title,
          notebookName,
          question: `What is **${term}**?`,
          answer: def,
          category: page.tags[0] || 'General',
          difficulty: 'medium',
          intervalDays: 1,
          reviewCount: 0,
          easeFactor: 2.5,
        });
      }
    }
  }

  // 2. Headings as Questions (e.g. "## What is Riverpod?", "### Clean Architecture Layers")
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const headingMatch = line.match(/^#{2,4}\s+(.*)$/);
    if (headingMatch) {
      const heading = headingMatch[1].replace(/[#*`]/g, '').trim();
      // Collect the following paragraph as answer
      let answer = '';
      for (let j = i + 1; j < lines.length; j++) {
        const nextLine = lines[j].trim();
        if (nextLine.startsWith('#')) break;
        if (nextLine) {
          answer += (answer ? ' ' : '') + nextLine;
          if (answer.length > 250) break;
        }
      }

      if (heading.length > 3 && answer.length > 25) {
        cards.push({
          id: `card-${page.id}-h-${cards.length + 1}`,
          sourcePageId: page.id,
          sourcePageTitle: page.title,
          notebookName,
          question: heading.endsWith('?') ? heading : `Explain the concept of **${heading}**`,
          answer: answer.slice(0, 300),
          category: page.tags[0] || 'Concepts',
          difficulty: 'medium',
          intervalDays: 1,
          reviewCount: 0,
          easeFactor: 2.5,
        });
      }
    }
  }

  // Fallback card if notes are very brief
  if (cards.length === 0) {
    cards.push({
      id: `card-${page.id}-summary`,
      sourcePageId: page.id,
      sourcePageTitle: page.title,
      notebookName,
      question: `What is the core purpose of **${page.title}**?`,
      answer: body.slice(0, 250) || 'Review the page notes for complete details.',
      category: page.tags[0] || 'Core',
      difficulty: 'easy',
      intervalDays: 1,
      reviewCount: 0,
      easeFactor: 2.5,
    });
  }

  return cards;
}

/**
 * Generates an interactive Quiz from one or more pages
 */
export function generateQuiz(
  pages: Page[],
  activePageId?: string
): QuizQuestion[] {
  const targetPages = activePageId
    ? pages.filter((p) => p.id === activePageId)
    : pages.slice(0, 5);

  const allFlashcards: Flashcard[] = [];
  targetPages.forEach((p) => {
    allFlashcards.push(...generateFlashcards(p));
  });

  const quizQuestions: QuizQuestion[] = [];

  for (let i = 0; i < Math.min(8, allFlashcards.length); i++) {
    const card = allFlashcards[i];
    const correctAnswer = card.answer.slice(0, 140);

    // Pick 3 distractor answers from other cards or plausible alternatives
    const otherAnswers = allFlashcards
      .filter((_, idx) => idx !== i)
      .map((c) => c.answer.slice(0, 140));

    const options = [
      {
        id: `opt-correct-${i}`,
        text: correctAnswer,
        isCorrect: true,
        explanation: `Correct! ${card.answer}`,
      },
    ];

    // Add distractors
    const distractors = [
      ...otherAnswers,
      'None of the above concepts apply to this architectural layer.',
      'An external third-party cloud service rather than a local pattern.',
      'A deprecated legacy protocol replaced by modern web standards.',
    ];

    for (let d = 0; d < 3; d++) {
      options.push({
        id: `opt-distract-${i}-${d}`,
        text: distractors[d % distractors.length],
        isCorrect: false,
        explanation: 'Incorrect based on your notebook documentation.',
      });
    }

    // Shuffle options
    options.sort(() => Math.random() - 0.5);

    quizQuestions.push({
      id: `quiz-${card.id}`,
      sourcePageId: card.sourcePageId,
      sourcePageTitle: card.sourcePageTitle,
      question: card.question,
      options,
      conceptExplanation: card.answer,
    });
  }

  return quizQuestions;
}

/**
 * Generates an Executive Summary and Key Takeaways
 */
export function generateExecutiveSummary(page: Page): ExecutiveSummary {
  const { body } = parseFrontmatter(page.content);
  const words = body.trim().split(/\s+/).filter(Boolean);
  const readingTimeMinutes = Math.max(1, Math.ceil(words.length / 200));

  const paragraphs = body.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const highLevelSummary =
    paragraphs[0] || `${page.title} is a core document in your knowledge notebook.`;

  const keyTakeaways: string[] = [];
  const bulletLines = body.split(/\r?\n/).filter((l) => l.trim().match(/^[-*+]\s+/));

  if (bulletLines.length > 0) {
    bulletLines.slice(0, 5).forEach((b) => {
      keyTakeaways.push(b.replace(/^[-*+]\s+/, '').replace(/[*_#]/g, '').trim());
    });
  } else {
    paragraphs.slice(1, 4).forEach((p) => {
      keyTakeaways.push(p.slice(0, 120) + (p.length > 120 ? '...' : ''));
    });
  }

  const tags = extractTags(page.content);

  return {
    pageId: page.id,
    pageTitle: page.title,
    highLevelSummary,
    keyTakeaways: keyTakeaways.length > 0 ? keyTakeaways : [`Foundational overview of ${page.title}.`],
    prerequisites: tags.length > 0 ? tags.map((t) => `#${t}`) : ['Core fundamentals'],
    relatedTopics: page.tags || [],
    readingTimeMinutes,
  };
}

/**
 * Calculates updated spaced repetition interval using SM-2 algorithm
 */
export function calculateNextReview(
  card: Flashcard,
  rating: 'hard' | 'medium' | 'easy'
): { intervalDays: number; easeFactor: number; reviewCount: number } {
  let ease = card.easeFactor || 2.5;
  let count = (card.reviewCount || 0) + 1;
  let interval = 1;

  if (rating === 'hard') {
    ease = Math.max(1.3, ease - 0.2);
    interval = 1;
  } else if (rating === 'medium') {
    interval = count === 1 ? 1 : count === 2 ? 3 : Math.round((card.intervalDays || 1) * ease);
  } else {
    // easy
    ease = Math.min(3.0, ease + 0.15);
    interval = count === 1 ? 2 : count === 2 ? 6 : Math.round((card.intervalDays || 1) * ease * 1.3);
  }

  return {
    intervalDays: Math.max(1, interval),
    easeFactor: Math.round(ease * 100) / 100,
    reviewCount: count,
  };
}
