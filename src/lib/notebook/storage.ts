import { openDB, deleteDB, IDBPDatabase } from 'idb';
import { Workspace, Notebook, Section, Page } from '@/types/notebook';

const DB_NAME = 'mapmind_notebook_db';
const DB_VERSION = 2;
const STORE_NAME = 'workspace_store';
const VAULTS_INDEX_KEY = 'vaults_index_list';
const ACTIVE_VAULT_KEY = 'active_vault_id';

const NOW = new Date().toISOString();

export interface VaultMetadata {
  id: string;
  name: string;
  updatedAt: string;
  notebookCount: number;
  pageCount: number;
}

/**
 * The single clean onboarding guide vault that teaches users how to master MapMind
 */
export const ONBOARDING_GUIDE_VAULT: Workspace = {
  id: 'vault-mapmind-guide',
  name: '🚀 MapMind User Guide',
  activeNotebookId: 'nb-guide',
  activeSectionId: 'sec-getting-started',
  activePageId: 'page-welcome',
  settings: {
    defaultPageType: 'note',
    autoSaveIntervalMs: 1000,
    aiConnectionMode: 'suggest',
    aiConfidenceThreshold: 0.65,
    theme: 'system',
  },
  collections: [
    {
      id: 'col-core-guides',
      name: 'Essential Guides',
      icon: '⭐',
      color: '#f59e0b',
      description: 'Crucial walkthroughs to get the most out of MapMind',
      pageIds: ['page-welcome', 'page-markdown-wikilinks', 'page-mindmap-bridge'],
    },
    {
      id: 'col-visual-ai',
      name: 'Visual & AI Tools',
      icon: '🧠',
      color: '#8b5cf6',
      description: 'Knowledge Graph, Mind Map, and AI connection discovery',
      pageIds: ['page-knowledge-graph', 'page-study-hub'],
    },
    {
      id: 'col-shortcuts',
      name: 'Shortcuts & Vaults',
      icon: '⚡',
      color: '#3b82f6',
      description: 'Hotkey reference and local vault management',
      pageIds: ['page-vaults-and-shortcuts'],
    },
  ],
  notebooks: [
    {
      id: 'nb-guide',
      name: '📘 MapMind User Guide',
      icon: '📘',
      color: '#8b5cf6',
      description: 'Complete interactive walkthrough of MapMind notes, visual mind maps, and knowledge graph',
      createdAt: NOW,
      updatedAt: NOW,
      sections: [
        {
          id: 'sec-getting-started',
          notebookId: 'nb-guide',
          name: '🚀 Getting Started',
          icon: '🚀',
          createdAt: NOW,
          updatedAt: NOW,
          pages: [
            {
              id: 'page-welcome',
              notebookId: 'nb-guide',
              sectionId: 'sec-getting-started',
              title: 'Welcome to MapMind',
              pageType: 'note',
              tags: ['guide', 'overview', 'local-first'],
              properties: {
                type: 'note',
                status: 'learning',
                priority: 'urgent',
                tags: ['guide', 'overview', 'local-first'],
              },
              createdAt: NOW,
              updatedAt: NOW,
              favorite: true,
              content: `---
type: note
status: learning
priority: urgent
tags:
  - guide
  - overview
  - local-first
---

# 🚀 Welcome to MapMind

**MapMind** is a modern, local-first knowledge notebook designed to unite **Markdown note-taking**, **visual mind mapping**, and **interactive 2D knowledge graphs** into one seamless workspace.

> 🔒 **100% Local-First & Private**: All your notes, mind maps, and vaults are stored directly on your computer in your browser's IndexedDB. No accounts, telemetry, or external database required.

---

## 🧭 Platform Overview

MapMind features 6 integrated modes accessible via the top navigation bar:

1. 📝 **[[Markdown & WikiLinks]]** — Rich Markdown editor with Live Split View, auto-saving, and WikiLinks.
2. 🧠 **[[Bi-Directional Mind Map Bridge]]** — Instant note-to-canvas tree visualization and visual brainstorming.
3. 🕸️ **[[Interactive Knowledge Graph]]** — 2D vector force-directed knowledge graph with real-time physics and dragging.
4. 📚 **[[Study Hub & AI Flashcards]]** — Active recall flashcards with 3D flip animations and quiz generator.
5. ✅ **Tasks Hub** — Automatically aggregates all \`- [ ]\` checkboxes from every note across your vault.
6. ⚡ **[[Vaults & Keyboard Shortcuts]]** — Create new vaults, open/import backups, and keyboard shortcuts.

---

## ⚡ Quick Action Checklist
- [x] Open MapMind and explore the Welcome guide
- [ ] Try typing a WikiLink like \`[[My New Idea]]\`
- [ ] Switch to **🧠 Mind Map** to see this note rendered as a whiteboard tree
- [ ] Open **🕸️ Graph** to see all notes interconnected
- [ ] Press <kbd>Ctrl + Alt + N</kbd> to create your first personal custom vault!

*Next: Learn how to write and link notes in [[Markdown & WikiLinks]]*`,
            },
            {
              id: 'page-markdown-wikilinks',
              notebookId: 'nb-guide',
              sectionId: 'sec-getting-started',
              title: 'Markdown & WikiLinks',
              pageType: 'concept',
              tags: ['markdown', 'wikilinks', 'editor'],
              properties: {
                type: 'concept',
                status: 'learning',
                priority: 'high',
                tags: ['markdown', 'wikilinks', 'editor'],
              },
              createdAt: NOW,
              updatedAt: NOW,
              favorite: true,
              content: `---
type: concept
status: learning
priority: high
tags:
  - markdown
  - wikilinks
  - editor
---

# 📝 Markdown & WikiLinks in MapMind

MapMind features a responsive Markdown editor with 3 view modes:
- **◫ Split View** (Side-by-side editing and live rendered preview)
- **👁 Preview Mode** (Clean reading experience)
- **⟨/⟩ Source Mode** (Distraction-free raw markdown typing)

---

## 🔗 WikiLinks & Auto-Creation

You can link any two notes together using double brackets:
\`\`\`markdown
[[Welcome to MapMind]]
[[Bi-Directional Mind Map Bridge]]
\`\`\`

### ✨ Automatic Note Creation
1. Type \`[[\` in the editor.
2. Type any note name you want to create (e.g. \`[[Project Roadmap]]\`).
3. Press <kbd>Enter</kbd> or click the link in the preview.
4. MapMind will **automatically create that note** in your vault and link them together!

---

## 🧩 Rich Formatting Features Supported

### 1. Interactive Tasks
- [x] Completed task item
- [ ] Pending task item (Clicking checkboxes in preview toggles them in raw markdown!)

### 2. KaTeX Mathematical Formulas
Inline math: $E = mc^2$ or $\\sigma(z) = \\frac{1}{1 + e^{-z}}$

Display math block:
$$f(x) = \\int_{-\\infty}^{\\infty} \\hat{f}(\\xi)\\,e^{2 \\pi i \\xi x}\\,d\\xi$$

### 3. Syntax Highlighted Code Blocks
\`\`\`typescript
interface KnowledgeVault {
  id: string;
  name: string;
  localFirst: boolean;
}
\`\`\`

*Next: Explore the visual canvas in [[Bi-Directional Mind Map Bridge]]*`,
            },
          ],
        },
        {
          id: 'sec-visual-tools',
          notebookId: 'nb-guide',
          name: '🧠 Visual Mind Mapping',
          icon: '🧠',
          createdAt: NOW,
          updatedAt: NOW,
          pages: [
            {
              id: 'page-mindmap-bridge',
              notebookId: 'nb-guide',
              sectionId: 'sec-visual-tools',
              title: 'Bi-Directional Mind Map Bridge',
              pageType: 'concept',
              tags: ['mindmap', 'whiteboard', 'bridge'],
              properties: {
                type: 'concept',
                status: 'learning',
                priority: 'high',
                tags: ['mindmap', 'whiteboard', 'bridge'],
              },
              createdAt: NOW,
              updatedAt: NOW,
              favorite: true,
              content: `---
type: concept
status: learning
priority: high
tags:
  - mindmap
  - whiteboard
  - bridge
---

# 🧠 Bi-Directional Mind Map Bridge

MapMind bridges the gap between linear text and spatial thinking. You can seamlessly convert any Markdown note into a visual Mind Map and vice versa!

---

## 🔄 How the Bridge Works

1. **Note $\\rightarrow$ Mind Map**:
   - In the Notes editor, click **"🧠 Mind Map"** in the top right.
   - Headings (\`#\`, \`##\`, \`###\`) and bullet lists are automatically converted into a structured radial tree graph on the whiteboard.

2. **Interactive Canvas**:
   - **Click + Drag** to pan around the canvas.
   - **Click any node** to edit its text, change colors, or toggle collapsed child branches.
   - **Enter Key**: Commits label edit and can spawn child nodes.
   - **AI Expand**: Click the **✨ Expand** button on any node to generate intelligent sub-branches!

3. **Mind Map $\\rightarrow$ Markdown Export**:
   - On the Mind Map canvas, click **"Save as Markdown Note"** in the top right.
   - The tree hierarchy is converted back into structured Markdown and saved directly into your notebook.

*Related: See all notes connected in [[Interactive Knowledge Graph]]*`,
            },
          ],
        },
        {
          id: 'sec-graph-and-ai',
          notebookId: 'nb-guide',
          name: '🕸️ Knowledge Graph & AI',
          icon: '🕸️',
          createdAt: NOW,
          updatedAt: NOW,
          pages: [
            {
              id: 'page-knowledge-graph',
              notebookId: 'nb-guide',
              sectionId: 'sec-graph-and-ai',
              title: 'Interactive Knowledge Graph',
              pageType: 'concept',
              tags: ['graph', 'physics', 'ai'],
              properties: {
                type: 'concept',
                status: 'learning',
                priority: 'medium',
                tags: ['graph', 'physics', 'ai'],
              },
              createdAt: NOW,
              updatedAt: NOW,
              content: `---
type: concept
status: learning
priority: medium
tags:
  - graph
  - physics
  - ai
---

# 🕸️ 2D Interactive Knowledge Graph

The **Knowledge Graph View** (Hotkey: <kbd>Ctrl + 3</kbd>) visualizes your entire vault as an interactive vector graph with real-time physics!

---

## 🌟 Key Features

1. **Native SVG Rendering**:
   - Rendered using crisp, responsive vector elements that never go blank or blurry on any screen scaling.
2. **Coulomb Repulsion & Spring Attraction**:
   - Connected notes cluster together naturally while repelling non-connected notes to ensure clean visibility.
3. **🖱️ Interactive Dragging**:
   - **Click & Drag any node** to reposition it on the canvas and watch the physics adjust.
   - **Click & Drag the background** to pan around.
   - **Scroll Wheel** to zoom in and out.
4. **🔗 Dual Edge Types**:
   - **Solid Lines**: Deterministic manual \`[[WikiLinks]]\`.
   - **Dashed Purple Lines**: AI Multi-Signal Connection Suggestions.

---

## 🧠 Local Multi-Signal AI Connections
MapMind scans your notes locally and suggests non-obvious connections across your vault using 5 weighted signals:
- **TF-IDF Semantic Cosine Similarity (50%)**
- **Shared Headings & Key Concepts (20%)**
- **Graph Topology & Mutual Neighbors (15%)**
- **Shared Tags (10%)**
- **Title Token Matches (5%)**

*Next: Test your knowledge with [[Study Hub & AI Flashcards]]*`,
            },
            {
              id: 'page-study-hub',
              notebookId: 'nb-guide',
              sectionId: 'sec-graph-and-ai',
              title: 'Study Hub & AI Flashcards',
              pageType: 'concept',
              tags: ['study', 'flashcards', 'quiz'],
              properties: {
                type: 'concept',
                status: 'learning',
                priority: 'medium',
                tags: ['study', 'flashcards', 'quiz'],
              },
              createdAt: NOW,
              updatedAt: NOW,
              content: `---
type: concept
status: learning
priority: medium
tags:
  - study
  - flashcards
  - quiz
---

# 📚 Study Hub & AI Flashcards

Turn your notes into active recall study tools!

---

## 🎴 3D Flip Flashcards
- MapMind automatically parses key definitions and conceptual Q&A from your markdown pages.
- Click any card to **flip it with smooth 3D CSS animation**.
- Rate your recall (**Easy**, **Medium**, **Hard**) to track your mastery.

## 🎯 Multiple Choice Quizzes
- Generate interactive multiple-choice quizzes directly from your notes.
- Immediate feedback, score tallying, and explanation citations linking back to your source notes.

## 📋 Auto-Summaries
- View condensed executive summaries of long notes for rapid review.

*Next: Master vault management in [[Vaults & Keyboard Shortcuts]]*`,
            },
          ],
        },
        {
          id: 'sec-vaults-and-hotkeys',
          notebookId: 'nb-guide',
          name: '⚡ Vaults & Shortcuts',
          icon: '⚡',
          createdAt: NOW,
          updatedAt: NOW,
          pages: [
            {
              id: 'page-vaults-and-shortcuts',
              notebookId: 'nb-guide',
              sectionId: 'sec-vaults-and-hotkeys',
              title: 'Vaults & Keyboard Shortcuts',
              pageType: 'reference',
              tags: ['vaults', 'shortcuts', 'hotkeys'],
              properties: {
                type: 'reference',
                status: 'completed',
                priority: 'urgent',
                tags: ['vaults', 'shortcuts', 'hotkeys'],
              },
              createdAt: NOW,
              updatedAt: NOW,
              favorite: true,
              content: `---
type: reference
status: completed
priority: urgent
tags:
  - vaults
  - shortcuts
  - hotkeys
---

# ⚡ Vault Management & Keyboard Shortcuts

MapMind lets you create multiple independent vaults (e.g. *Personal*, *Work*, *University*, *Research*) stored locally in your browser.

---

## 🗄️ Vault Management

| Action | How To Do It | Shortcut |
| :--- | :--- | :--- |
| **➕ Create New Vault** | Click Vault title top-left $\\rightarrow$ *Create New Vault* | <kbd>Ctrl + Alt + N</kbd> |
| **📂 Open / Import Vault** | Click Vault title $\\rightarrow$ *Open / Import JSON* | <kbd>Ctrl + O</kbd> |
| **💾 Save / Export Backup** | Click Vault title $\\rightarrow$ *Export Vault Backup* | <kbd>Ctrl + S</kbd> |
| **🔄 Switch Vaults** | Click Vault title $\\rightarrow$ Select vault from list | <kbd>Ctrl + Alt + V</kbd> |
| **🟢 Auto-Save** | Automatic background save to IndexedDB | Continuous |

---

## ⌨️ Global Keyboard Shortcuts

### 🧭 Navigation & Views
- <kbd>Ctrl + 1</kbd> — 📝 Notes Editor
- <kbd>Ctrl + 2</kbd> — 🧠 Mind Map Whiteboard
- <kbd>Ctrl + 3</kbd> — 🕸️ Knowledge Graph
- <kbd>Ctrl + 4</kbd> — 📚 Study Hub
- <kbd>Ctrl + 5</kbd> — ✅ Tasks Hub
- <kbd>Ctrl + 6</kbd> — 🏠 Home Dashboard
- <kbd>Ctrl + K</kbd> — 🔍 Quick Search & Command Palette

### 📝 Editing & Notes
- <kbd>Ctrl + N</kbd> — Create New Note in Active Notebook
- <kbd>Ctrl + B</kbd> — **Bold** Text
- <kbd>Ctrl + I</kbd> — *Italic* Text
- <kbd>Ctrl + D</kbd> — Open Today's Daily Note
- <kbd>[[</kbd> — Open WikiLink Autocomplete & Note Creator

### 🧠 Mind Map Canvas
- <kbd>Enter</kbd> — Commit node text & add sibling
- <kbd>Tab</kbd> — Add child node
- <kbd>Delete</kbd> / <kbd>Backspace</kbd> — Delete selected node
- <kbd>Space + Drag</kbd> — Pan Canvas`,
            },
          ],
        },
      ],
    },
  ],
};

export const INITIAL_STARTER_WORKSPACE: Workspace = ONBOARDING_GUIDE_VAULT;

/**
 * Open or upgrade the IndexedDB database
 */
async function getDb(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    },
  });
}

/**
 * List all saved vaults metadata from IndexedDB
 */
export async function listAllVaults(): Promise<VaultMetadata[]> {
  try {
    const db = await getDb();
    const list = (await db.get(STORE_NAME, VAULTS_INDEX_KEY)) as VaultMetadata[] | undefined;
    if (list && Array.isArray(list) && list.length > 0) {
      return list;
    }
  } catch (err) {
    console.warn('Failed to list vaults from IndexedDB:', err);
  }

  // Default initial index with onboarding guide
  const defaultIndex: VaultMetadata[] = [
    {
      id: ONBOARDING_GUIDE_VAULT.id,
      name: ONBOARDING_GUIDE_VAULT.name,
      updatedAt: NOW,
      notebookCount: ONBOARDING_GUIDE_VAULT.notebooks.length,
      pageCount: ONBOARDING_GUIDE_VAULT.notebooks.reduce(
        (acc, nb) => acc + nb.sections.reduce((sAcc, s) => sAcc + s.pages.length, 0),
        0
      ),
    },
  ];

  try {
    const db = await getDb();
    await db.put(STORE_NAME, defaultIndex, VAULTS_INDEX_KEY);
    await db.put(STORE_NAME, ONBOARDING_GUIDE_VAULT, `vault_${ONBOARDING_GUIDE_VAULT.id}`);
  } catch (e) {
    console.error('Failed to initialize default vault index:', e);
  }

  return defaultIndex;
}

/**
 * Load the active vault workspace
 */
export async function loadWorkspace(): Promise<Workspace> {
  try {
    const db = await getDb();
    const activeId = (await db.get(STORE_NAME, ACTIVE_VAULT_KEY)) as string | undefined;
    const targetKey = activeId ? `vault_${activeId}` : 'current_workspace';
    const saved = await db.get(STORE_NAME, targetKey);

    if (saved && saved.notebooks && saved.notebooks.length > 0) {
      return saved as Workspace;
    }
  } catch (err) {
    console.warn('Failed to load workspace from IndexedDB, using onboarding guide:', err);
  }

  await saveWorkspace(ONBOARDING_GUIDE_VAULT);
  return ONBOARDING_GUIDE_VAULT;
}

/**
 * Save workspace / vault and update index
 */
export async function saveWorkspace(workspace: Workspace): Promise<void> {
  try {
    const db = await getDb();
    const key = `vault_${workspace.id}`;
    await db.put(STORE_NAME, workspace, key);
    await db.put(STORE_NAME, workspace, 'current_workspace');
    await db.put(STORE_NAME, workspace.id, ACTIVE_VAULT_KEY);

    // Update vaults index
    const list = ((await db.get(STORE_NAME, VAULTS_INDEX_KEY)) as VaultMetadata[] | undefined) || [];
    const pageCount = workspace.notebooks.reduce(
      (acc, nb) => acc + nb.sections.reduce((sAcc, s) => sAcc + s.pages.length, 0),
      0
    );

    const updatedIndex: VaultMetadata[] = [
      {
        id: workspace.id,
        name: workspace.name,
        updatedAt: new Date().toISOString(),
        notebookCount: workspace.notebooks.length,
        pageCount,
      },
      ...list.filter((v) => v.id !== workspace.id),
    ];

    await db.put(STORE_NAME, updatedIndex, VAULTS_INDEX_KEY);
  } catch (err) {
    console.error('Failed to save workspace to IndexedDB:', err);
  }
}

/**
 * Load a specific vault by ID
 */
export async function loadVaultById(vaultId: string): Promise<Workspace | null> {
  try {
    const db = await getDb();
    const vault = (await db.get(STORE_NAME, `vault_${vaultId}`)) as Workspace | undefined;
    if (vault) {
      await db.put(STORE_NAME, vault.id, ACTIVE_VAULT_KEY);
      await db.put(STORE_NAME, vault, 'current_workspace');
      return vault;
    }
  } catch (err) {
    console.error(`Failed to load vault ${vaultId}:`, err);
  }
  return null;
}

/**
 * Create a new vault workspace
 */
export function createNewVault(name: string, template: 'empty' | 'guide' = 'empty'): Workspace {
  const vaultId = `vault-${Date.now()}`;
  const now = new Date().toISOString();

  if (template === 'guide') {
    return {
      ...ONBOARDING_GUIDE_VAULT,
      id: vaultId,
      name,
    };
  }

  const defaultNbId = `nb-${Date.now()}`;
  const defaultSecId = `sec-${Date.now()}`;
  const defaultPageId = `page-${Date.now()}`;

  const initialPage: Page = {
    id: defaultPageId,
    notebookId: defaultNbId,
    sectionId: defaultSecId,
    title: 'First Note',
    pageType: 'note',
    tags: ['welcome'],
    properties: { type: 'note', status: 'in_progress' },
    createdAt: now,
    updatedAt: now,
    content: `# Welcome to ${name}\n\nThis is your fresh, local-first knowledge vault.\n\n- Start typing your thoughts\n- Link notes with \`[[WikiLinks]]\`\n- View your visual mind map in **🧠 Mind Map** mode\n`,
  };

  const initialSection: Section = {
    id: defaultSecId,
    notebookId: defaultNbId,
    name: 'General',
    icon: '📁',
    createdAt: now,
    updatedAt: now,
    pages: [initialPage],
  };

  const initialNotebook: Notebook = {
    id: defaultNbId,
    name: 'Main Notebook',
    icon: '📔',
    color: '#8b5cf6',
    description: 'Default primary notebook for your notes and ideas',
    createdAt: now,
    updatedAt: now,
    sections: [initialSection],
  };

  return {
    id: vaultId,
    name,
    activeNotebookId: defaultNbId,
    activeSectionId: defaultSecId,
    activePageId: defaultPageId,
    settings: {
      defaultPageType: 'note',
      autoSaveIntervalMs: 1000,
      aiConnectionMode: 'suggest',
      aiConfidenceThreshold: 0.65,
      theme: 'system',
    },
    collections: [],
    notebooks: [initialNotebook],
  };
}

/**
 * Delete a vault from IndexedDB
 */
export async function deleteVaultById(vaultId: string): Promise<void> {
  try {
    const db = await getDb();
    await db.delete(STORE_NAME, `vault_${vaultId}`);
    const list = ((await db.get(STORE_NAME, VAULTS_INDEX_KEY)) as VaultMetadata[] | undefined) || [];
    const updatedIndex = list.filter((v) => v.id !== vaultId);
    await db.put(STORE_NAME, updatedIndex, VAULTS_INDEX_KEY);
  } catch (err) {
    console.error(`Failed to delete vault ${vaultId}:`, err);
  }
}

/**
 * Export a single vault as formatted JSON file
 */
export function exportWorkspaceAsJson(workspace: Workspace): void {
  const jsonStr = JSON.stringify(workspace, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeName = workspace.name.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  a.href = url;
  a.download = `${safeName}-vault-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Export all saved vaults as a single multi-vault backup bundle JSON file
 */
export async function exportAllVaultsBackupBundle(): Promise<void> {
  const db = await getDb();
  const index = ((await db.get(STORE_NAME, VAULTS_INDEX_KEY)) as VaultMetadata[] | undefined) || [];
  const vaults: Workspace[] = [];

  for (const meta of index) {
    const vault = (await db.get(STORE_NAME, `vault_${meta.id}`)) as Workspace | undefined;
    if (vault) {
      vaults.push(vault);
    }
  }

  const current = (await db.get(STORE_NAME, 'current_workspace')) as Workspace | undefined;
  if (current && !vaults.some((v) => v.id === current.id)) {
    vaults.push(current);
  }

  const bundle = {
    app: 'MapMind',
    version: '1.0.0',
    exportDate: new Date().toISOString(),
    vaultCount: vaults.length,
    vaults,
  };

  const jsonStr = JSON.stringify(bundle, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mapmind-all-vaults-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Completely wipe all local data stored on this machine
 * Clears IndexedDB, localStorage, sessionStorage, and resets to clean state
 */
export async function wipeAllLocalDeviceData(): Promise<void> {
  try {
    const db = await getDb();
    await db.clear(STORE_NAME);
    db.close();
  } catch (e) {
    console.warn('Error clearing IndexedDB object store:', e);
  }

  try {
    await deleteDB(DB_NAME);
  } catch (e) {
    console.warn('Error deleting IndexedDB database:', e);
  }

  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch (e) {
    console.warn('Error clearing web storage:', e);
  }
}

/**
 * Import a vault from a JSON file
 */
export async function importVaultFromJsonFile(file: File): Promise<Workspace> {
  const text = await file.text();
  const parsed = JSON.parse(text);

  if (!parsed) {
    throw new Error('Empty or invalid JSON file.');
  }

  // Check if it's a multi-vault bundle
  if (Array.isArray(parsed.vaults) && parsed.vaults.length > 0) {
    for (const v of parsed.vaults) {
      if (v.id && v.notebooks) {
        await saveWorkspace(v);
      }
    }
    return parsed.vaults[0];
  }

  if (!parsed.notebooks || !Array.isArray(parsed.notebooks)) {
    throw new Error('Invalid MapMind vault file format. Missing notebooks structure.');
  }

  const newVaultId = `vault-${Date.now()}`;
  const importedVault: Workspace = {
    ...parsed,
    id: newVaultId,
    name: parsed.name ? `${parsed.name} (Imported)` : 'Imported Vault',
  };

  await saveWorkspace(importedVault);
  return importedVault;
}
