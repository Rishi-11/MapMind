export type AiConnectionMode = 'off' | 'suggest' | 'assisted' | 'autonomous';

export interface ScoreBreakdown {
  semantic: number;      // 0.0 to 1.0 (50% weight)
  sharedConcepts: number; // 0.0 to 1.0 (20% weight)
  linkDistance: number;   // 0.0 to 1.0 (15% weight)
  sharedTags: number;     // 0.0 to 1.0 (10% weight)
  titleMatch: number;     // 0.0 to 1.0 (5% weight)
}

export interface AiConnectionSuggestion {
  id: string;
  sourcePageId: string;
  targetPageId: string;
  sourceTitle: string;
  targetTitle: string;
  confidence: number; // 0.0 to 1.0
  reason: string;
  suggestedRelationship?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'ignored';
  mode: AiConnectionMode;
  scoreBreakdown: ScoreBreakdown;
  createdAt: string;
}

export interface AiReasoningResult {
  confidence: number;
  reason: string;
  suggestedRelationship: string;
  keyConcepts: string[];
}

export interface KnowledgeAssistantCitation {
  pageId: string;
  pageTitle: string;
  notebookName: string;
  snippet: string;
  relevanceScore: number;
}

export interface KnowledgeAssistantMessage {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  citations?: KnowledgeAssistantCitation[];
  timestamp: string;
}

export interface AiUserFeedback {
  sourceTitle: string;
  targetTitle: string;
  action: 'accepted' | 'rejected';
  timestamp: string;
}
