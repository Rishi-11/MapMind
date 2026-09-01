export type PageType =
  | 'note'
  | 'concept'
  | 'idea'
  | 'project'
  | 'task'
  | 'meeting'
  | 'book'
  | 'article'
  | 'daily'
  | 'reference'
  | 'canvas'
  | 'mindmap';

export type RelationshipType =
  | 'related'
  | 'uses'
  | 'depends_on'
  | 'part_of'
  | 'example_of'
  | 'prerequisite_of'
  | 'extends'
  | 'contrasts_with'
  | 'references'
  | 'custom';

export type ViewMode = 'editor' | 'mindmap' | 'graph' | 'study' | 'tasks' | 'dashboard';

export interface PageProperties {
  type?: PageType;
  status?: 'draft' | 'in_progress' | 'learning' | 'completed' | 'archived';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  tags?: string[];
  author?: string;
  dueDate?: string;
  rating?: number;
  [key: string]: any;
}

export interface Page {
  id: string;
  notebookId: string;
  sectionId: string;
  title: string;
  content: string; // Markdown source of truth
  pageType: PageType;
  tags: string[];
  properties: PageProperties;
  createdAt: string;
  updatedAt: string;
  favorite?: boolean;
  collectionIds?: string[];
  derivedMindMapId?: string;
}

export interface Section {
  id: string;
  notebookId: string;
  name: string;
  icon?: string;
  pages: Page[];
  collapsed?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Notebook {
  id: string;
  name: string;
  icon: string;
  color: string;
  description?: string;
  sections: Section[];
  collapsed?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  notebooks: Notebook[];
  collections: Collection[];
  activeNotebookId: string | null;
  activeSectionId: string | null;
  activePageId: string | null;
  settings: WorkspaceSettings;
}

export interface WorkspaceSettings {
  defaultPageType: PageType;
  autoSaveIntervalMs: number;
  aiConnectionMode: 'off' | 'suggest' | 'assisted' | 'autonomous';
  aiConfidenceThreshold: number; // 0.0 to 1.0 (default 0.65)
  theme: 'light' | 'dark' | 'system';
  vaultPathName?: string;
  isLocalFolderConnected?: boolean;
}

export interface Collection {
  id: string;
  name: string;
  icon: string;
  color: string;
  description?: string;
  pageIds: string[];
}

export interface WikiLink {
  raw: string;
  targetTitle: string;
  displayText?: string;
  sourcePageId: string;
  sourcePageTitle: string;
}

export interface BacklinkItem {
  sourcePageId: string;
  sourcePageTitle: string;
  notebookName: string;
  sectionName: string;
  snippet: string;
  contextBefore: string;
  contextAfter: string;
  relationshipType?: RelationshipType;
}

export interface UnlinkedMentionItem {
  sourcePageId: string;
  sourcePageTitle: string;
  notebookName: string;
  sectionName: string;
  snippet: string;
  matchedText: string;
  startIndex: number;
  endIndex: number;
}

export interface ManualConnection {
  id: string;
  sourcePageId: string;
  targetPageId: string;
  sourceTitle: string;
  targetTitle: string;
  relationshipType: RelationshipType;
  description?: string;
  createdAt: string;
}

export interface MarkdownTask {
  id: string;
  pageId: string;
  pageTitle: string;
  notebookName: string;
  sectionName: string;
  text: string;
  completed: boolean;
  lineIndex: number;
  dueDate?: string;
  priority?: 'low' | 'medium' | 'high';
}

export interface VaultStats {
  totalNotebooks: number;
  totalSections: number;
  totalPages: number;
  totalWords: number;
  totalLinks: number;
  totalBacklinks: number;
  totalTags: number;
  totalTasks: number;
  completedTasks: number;
  totalAiSuggestions: number;
}
