export interface Flashcard {
  id: string;
  sourcePageId: string;
  sourcePageTitle: string;
  notebookName: string;
  question: string;
  answer: string;
  category?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  intervalDays?: number;
  lastReviewed?: string;
  reviewCount?: number;
  easeFactor?: number;
}

export interface QuizOption {
  id: string;
  text: string;
  isCorrect: boolean;
  explanation?: string;
}

export interface QuizQuestion {
  id: string;
  sourcePageId: string;
  sourcePageTitle: string;
  question: string;
  options: QuizOption[];
  conceptExplanation: string;
  selectedOptionId?: string;
}

export interface SummarySection {
  title: string;
  content: string;
}

export interface ExecutiveSummary {
  pageId: string;
  pageTitle: string;
  highLevelSummary: string;
  keyTakeaways: string[];
  prerequisites: string[];
  relatedTopics: string[];
  readingTimeMinutes: number;
}

export interface StudySessionState {
  deckTitle: string;
  cards: Flashcard[];
  currentIndex: number;
  isFlipped: boolean;
  reviewedCardsCount: number;
  correctCount: number;
  isCompleted: boolean;
}
