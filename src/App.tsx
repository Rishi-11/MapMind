import { useState, useCallback, useMemo, useEffect, useRef, lazy, Suspense } from 'react';
import {
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import { BookOpen } from 'lucide-react';

import { MapMindNode, MapMindEdge, CanvasSettings, LayoutDirection, LayoutDensity, NodeColorTheme } from '@/types/graph';
import { Workspace, Page, Section, Notebook, ViewMode, BacklinkItem, UnlinkedMentionItem } from '@/types/notebook';
import { AiConnectionSuggestion } from '@/types/ai';

import { DiagramCanvas } from '@/components/canvas/DiagramCanvas';
import { HeaderToolbar } from '@/components/ui/HeaderToolbar';
import { NodeInspector } from '@/components/ui/NodeInspector';
import { FloatingActionDock } from '@/components/ui/FloatingActionDock';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { UnifiedHeader } from '@/components/ui/UnifiedHeader';
import { UniversalCommandPalette } from '@/components/ui/UniversalCommandPalette';

import { NotebookSidebar } from '@/components/notebook/NotebookSidebar';
import { MarkdownEditor } from '@/components/notebook/MarkdownEditor';
import { NotebookInspectorPanel } from '@/components/notebook/NotebookInspectorPanel';
import { KnowledgeGraphView } from '@/components/notebook/KnowledgeGraphView';
import { StudyHubView } from '@/components/notebook/StudyHubView';
import { TasksView } from '@/components/notebook/TasksView';
import { DashboardView } from '@/components/notebook/DashboardView';

import {
  loadWorkspace,
  saveWorkspace,
  exportWorkspaceAsJson,
  saveVaultToFileSystem,
  openVaultFromFileSystem,
  exportAllVaultsBackupBundle,
  wipeAllLocalDeviceData,
  listAllVaults,
  loadVaultById,
  createNewVault,
  deleteVaultById,
  importVaultFromJsonFile,
  ONBOARDING_GUIDE_VAULT,
  INITIAL_STARTER_WORKSPACE,
  VaultMetadata,
} from '@/lib/notebook/storage';
import { VaultManagerModal } from '@/components/notebook/VaultManagerModal';
import { buildBacklinkIndex, detectUnlinkedMentions, convertMentionToWikiLink } from '@/lib/notebook/links';
import { discoverAiSuggestions } from '@/lib/notebook/knowledgeAiEngine';
import { markdownToMindMap, mindMapToMarkdown } from '@/lib/notebook/mindmapBridge';

// 🚀 Lazy-Loaded Heavy Modals
const ExportMenu = lazy(() => import('@/components/ui/ExportMenu').then((m) => ({ default: m.ExportMenu })));
const KeyboardShortcutsModal = lazy(() => import('@/components/ui/KeyboardShortcutsModal').then((m) => ({ default: m.KeyboardShortcutsModal })));
const CanvasThemeModal = lazy(() => import('@/components/ui/CanvasThemeModal').then((m) => ({ default: m.CanvasThemeModal })));
const CleanBoardModal = lazy(() => import('@/components/ui/CleanBoardModal').then((m) => ({ default: m.CleanBoardModal })));
const AiChatMindMapModal = lazy(() => import('@/components/ui/AiChatMindMapModal').then((m) => ({ default: m.AiChatMindMapModal })));
const NodeExpansionModal = lazy(() => import('@/components/ui/NodeExpansionModal').then((m) => ({ default: m.NodeExpansionModal })));

import { getDagreLayout } from '@/lib/layouts/dagreLayout';
import { getElkLayout } from '@/lib/layouts/elkLayout';

// Initial Starter Mind Map Nodes
const INITIAL_NODES: MapMindNode[] = [
  {
    id: 'root-1',
    type: 'custom',
    position: { x: 0, y: 0 },
    selected: true,
    data: {
      label: 'MapMind Knowledge Studio',
      sublabel: 'Interactive Mind Mapping & Local-First Notes',
      isRoot: true,
      colorTheme: 'blue',
      shape: 'pill',
      tags: ['Core', 'Local-First'],
    },
  },
  {
    id: 'node-notes',
    type: 'custom',
    position: { x: 320, y: -100 },
    data: {
      label: 'Knowledge Notebook',
      sublabel: 'Markdown, Backlinks & Tags',
      colorTheme: 'purple',
      tags: ['Notebook'],
    },
  },
  {
    id: 'node-mindmap',
    type: 'custom',
    position: { x: 320, y: 100 },
    data: {
      label: 'Visual Whiteboard',
      sublabel: 'Radial, Dagre & ELK Trees',
      colorTheme: 'emerald',
      tags: ['MindMap'],
    },
  },
  {
    id: 'node-ai',
    type: 'custom',
    position: { x: -320, y: -80 },
    data: {
      label: 'Local Multi-Signal AI',
      sublabel: 'Connection Reasoning & RAG',
      colorTheme: 'amber',
      tags: ['AI'],
    },
  },
  {
    id: 'node-study',
    type: 'custom',
    position: { x: -320, y: 80 },
    data: {
      label: 'Study & Learning Hub',
      sublabel: 'Spaced Repetition & Quizzes',
      colorTheme: 'rose',
      tags: ['Learning'],
    },
  },
];

const INITIAL_EDGES: MapMindEdge[] = [
  { id: 'e-root-notes', source: 'root-1', target: 'node-notes', type: 'custom', data: { routingStyle: 'curved' } },
  { id: 'e-root-mindmap', source: 'root-1', target: 'node-mindmap', type: 'custom', data: { routingStyle: 'curved' } },
  { id: 'e-root-ai', source: 'root-1', target: 'node-ai', type: 'custom', data: { routingStyle: 'curved' } },
  { id: 'e-root-study', source: 'root-1', target: 'node-study', type: 'custom', data: { routingStyle: 'curved' } },
];

export function AppContent() {
  // Application View Mode: 'editor' | 'mindmap' | 'graph' | 'study' | 'tasks' | 'dashboard'
  const [viewMode, setViewMode] = useState<ViewMode>('editor');

  // Unified Workspace State
  const [workspace, setWorkspace] = useState<Workspace>(INITIAL_STARTER_WORKSPACE);
  const [vaultList, setVaultList] = useState<VaultMetadata[]>([]);
  const [isVaultManagerOpen, setIsVaultManagerOpen] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return typeof window !== 'undefined' && window.innerWidth < 960;
  });
  const [isInspectorCollapsed, setIsInspectorCollapsed] = useState(() => {
    return typeof window !== 'undefined' && window.innerWidth < 1280;
  });
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // MapMind Canvas Graph State
  const [nodes, setNodes, onNodesChange] = useNodesState<MapMindNode>(INITIAL_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState<MapMindEdge>(INITIAL_EDGES);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>('root-1');
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isCanvasThemeOpen, setIsCanvasThemeOpen] = useState(false);
  const [isCleanBoardOpen, setIsCleanBoardOpen] = useState(false);
  const [isAiImportOpen, setIsAiImportOpen] = useState(false);
  const [isAiExpandModalOpen, setIsAiExpandModalOpen] = useState(false);
  const [aiExpandTargetNodeId, setAiExpandTargetNodeId] = useState<string | null>(null);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [currentLayout, setCurrentLayout] = useState<LayoutDirection>('BALANCED_MINDMAP');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const [settings, setSettings] = useState<CanvasSettings>({
    sketchMode: false,
    gridSnap: true,
    gridSize: 20,
    gridType: 'dots',
    theme: 'light',
    backgroundPreset: 'warm',
    edgeRoutingStyle: 'curved',
    layoutDensity: 'compact',
    collisionAvoidance: true,
  });

  const { fitView } = useReactFlow();

  const showNotification = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const refreshVaultList = useCallback(async () => {
    const list = await listAllVaults();
    setVaultList(list);
  }, []);

  // Load Workspace on Initial Mount
  useEffect(() => {
    loadWorkspace().then((ws) => {
      setWorkspace(ws);
      refreshVaultList();
    });
  }, [refreshVaultList]);

  // Debounced auto-save workspace to IndexedDB
  const workspaceSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const persistWorkspace = useCallback((updated: Workspace) => {
    setWorkspace(updated);
    setIsAutoSaving(true);
    if (workspaceSaveTimerRef.current) clearTimeout(workspaceSaveTimerRef.current);
    workspaceSaveTimerRef.current = setTimeout(async () => {
      await saveWorkspace(updated);
      setIsAutoSaving(false);
      refreshVaultList();
    }, 600);
  }, [refreshVaultList]);

  // Multi-Vault Management Actions
  const handleSwitchVault = useCallback(async (vaultId: string) => {
    const loaded = await loadVaultById(vaultId);
    if (loaded) {
      setWorkspace(loaded);
      showNotification(`Opened vault "${loaded.name}"`, 'success');
      refreshVaultList();
    }
  }, [showNotification, refreshVaultList]);

  const handleCreateVault = useCallback(async (name: string, template: 'empty' | 'guide') => {
    const newV = createNewVault(name, template);
    await saveWorkspace(newV);
    setWorkspace(newV);
    showNotification(`Created new vault "${name}"`, 'success');
    refreshVaultList();
  }, [showNotification, refreshVaultList]);

  // Modern File System Access API: Native Disk Save (Ctrl+S) & Direct Sync
  const handleSaveCurrentVault = useCallback(async (forcePrompt = false) => {
    if (!workspace) return;
    const res = await saveVaultToFileSystem(workspace, forcePrompt);
    if (res.success && res.fileName) {
      if (res.fallback) {
        showNotification(`Exported backup for "${workspace.name}"`, 'success');
      } else {
        showNotification(`Saved to "${res.fileName}" (Direct Disk Sync)`, 'success');
      }
    }
  }, [workspace, showNotification]);

  const handleOpenLocalVaultFile = useCallback(async () => {
    try {
      const res = await openVaultFromFileSystem();
      if (res) {
        setWorkspace(res.workspace);
        showNotification(`Opened & synced with "${res.fileName}"!`, 'success');
        refreshVaultList();
      }
    } catch (err: any) {
      showNotification(err.message || 'Failed to open vault file.', 'error');
    }
  }, [showNotification, refreshVaultList]);

  const handleExportCurrentVault = useCallback(() => {
    if (!workspace) return;
    exportWorkspaceAsJson(workspace);
    showNotification(`Exported backup for "${workspace.name}"`, 'success');
  }, [workspace, showNotification]);

  const handleExportAllVaultsBundle = useCallback(async () => {
    await exportAllVaultsBackupBundle();
    showNotification('Exported complete multi-vault backup bundle!', 'success');
  }, [showNotification]);

  const handleWipeDeviceData = useCallback(async () => {
    await wipeAllLocalDeviceData();
    await saveWorkspace(ONBOARDING_GUIDE_VAULT);
    setWorkspace(ONBOARDING_GUIDE_VAULT);
    refreshVaultList();
    showNotification('All local data wiped. Reset to initial guide.', 'info');
  }, [showNotification, refreshVaultList]);

  const handleImportVaultFile = useCallback(async (file: File) => {
    try {
      const imported = await importVaultFromJsonFile(file);
      setWorkspace(imported);
      showNotification(`Successfully imported "${imported.name}"!`, 'success');
      refreshVaultList();
    } catch (err: any) {
      showNotification(err.message || 'Failed to import vault file.', 'error');
    }
  }, [showNotification, refreshVaultList]);

  const handleDeleteVault = useCallback(async (vaultId: string) => {
    await deleteVaultById(vaultId);
    showNotification('Vault deleted.', 'info');
    refreshVaultList();
  }, [showNotification, refreshVaultList]);

  // Theme Sync
  useEffect(() => {
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.theme]);

  // Flatten all pages across workspace
  const allPages = useMemo(() => {
    if (!workspace) return [];
    const list: Page[] = [];
    workspace.notebooks.forEach((nb) => {
      nb.sections.forEach((sec) => {
        list.push(...sec.pages);
      });
    });
    return list;
  }, [workspace]);

  // Notebook & Section lookup maps
  const { notebookMap, sectionMap } = useMemo(() => {
    const nbMap = new Map<string, string>();
    const secMap = new Map<string, string>();
    if (workspace) {
      workspace.notebooks.forEach((nb) => {
        nbMap.set(nb.id, nb.name);
        nb.sections.forEach((sec) => {
          secMap.set(sec.id, sec.name);
        });
      });
    }
    return { notebookMap: nbMap, sectionMap: secMap };
  }, [workspace]);

  // Active page
  const activePage: Page | null = useMemo(() => {
    if (!workspace || !workspace.activePageId) return allPages[0] || null;
    return allPages.find((p) => p.id === workspace.activePageId) || allPages[0] || null;
  }, [workspace, allPages]);

  // Backlinks & Unlinked Mentions for active page
  const backlinks: BacklinkItem[] = useMemo(() => {
    if (!activePage || allPages.length === 0) return [];
    const map = buildBacklinkIndex(allPages, notebookMap, sectionMap);
    return map.get(activePage.id) || [];
  }, [activePage, allPages, notebookMap, sectionMap]);

  const unlinkedMentions: UnlinkedMentionItem[] = useMemo(() => {
    if (!activePage || allPages.length === 0) return [];
    return detectUnlinkedMentions(activePage, allPages, notebookMap, sectionMap);
  }, [activePage, allPages, notebookMap, sectionMap]);

  // AI Connection Suggestions for active page
  const aiSuggestions: AiConnectionSuggestion[] = useMemo(() => {
    if (!activePage || allPages.length < 2 || !workspace) return [];
    return discoverAiSuggestions(
      activePage,
      allPages,
      workspace.settings.aiConnectionMode,
      workspace.settings.aiConfidenceThreshold
    );
  }, [activePage, allPages, workspace]);

  // Workspace CRUD Operations
  const handleSelectPage = useCallback(
    (notebookId: string, sectionId: string, pageId: string) => {
      if (!workspace) return;
      persistWorkspace({
        ...workspace,
        activeNotebookId: notebookId,
        activeSectionId: sectionId,
        activePageId: pageId,
      });
    },
    [workspace, persistWorkspace]
  );

  const handleSelectNotebook = useCallback(
    (notebookId: string) => {
      if (!workspace) return;
      const nb = workspace.notebooks.find((n) => n.id === notebookId);
      if (nb) {
        const sec = nb.sections[0];
        const page = sec ? sec.pages[0] : null;
        persistWorkspace({
          ...workspace,
          activeNotebookId: nb.id,
          activeSectionId: sec ? sec.id : null,
          activePageId: page ? page.id : null,
        });
      }
    },
    [workspace, persistWorkspace]
  );

  const handleCreateNotebook = useCallback(
    (name: string, icon: string, color: string) => {
      if (!workspace) return;
      const nbId = `nb-${Date.now()}`;
      const secId = `sec-${Date.now()}-1`;
      const pageId = `page-${Date.now()}-1`;

      const newNb: Notebook = {
        id: nbId,
        name,
        icon,
        color,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sections: [
          {
            id: secId,
            notebookId: nbId,
            name: 'General',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            pages: [
              {
                id: pageId,
                notebookId: nbId,
                sectionId: secId,
                title: 'Overview',
                pageType: 'concept',
                tags: ['notes'],
                properties: { type: 'concept', status: 'learning' },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                content: `# ${name} Overview\n\nStart writing notes for ${name}...\n`,
              },
            ],
          },
        ],
      };

      persistWorkspace({
        ...workspace,
        notebooks: [...workspace.notebooks, newNb],
        activeNotebookId: newNb.id,
        activeSectionId: newNb.sections[0].id,
        activePageId: newNb.sections[0].pages[0].id,
      });
      setViewMode('editor');
      showNotification(`Created notebook "${name}"`, 'success');
    },
    [workspace, persistWorkspace, showNotification]
  );

  const handleCreateSection = useCallback(
    (notebookId: string, name: string) => {
      if (!workspace) return;
      const newSec: Section = {
        id: `sec-${Date.now()}`,
        notebookId,
        name,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        pages: [],
      };

      const updatedNotebooks = workspace.notebooks.map((nb) =>
        nb.id === notebookId ? { ...nb, sections: [...nb.sections, newSec] } : nb
      );

      persistWorkspace({ ...workspace, notebooks: updatedNotebooks, activeSectionId: newSec.id });
      showNotification(`Added section "${name}"`, 'success');
    },
    [workspace, persistWorkspace, showNotification]
  );

  const handleCreatePage = useCallback(
    (notebookId?: string, sectionId?: string, title = 'Untitled Note') => {
      if (!workspace || workspace.notebooks.length === 0) return;

      // 1. Resolve target notebook
      const targetNbId = notebookId || workspace.activeNotebookId || workspace.notebooks[0]?.id;
      const targetNb = workspace.notebooks.find((n) => n.id === targetNbId) || workspace.notebooks[0];
      if (!targetNb) return;

      // 2. Resolve target section within the target notebook
      const targetSec =
        (sectionId ? targetNb.sections.find((s) => s.id === sectionId) : null) ||
        (workspace.activeSectionId ? targetNb.sections.find((s) => s.id === workspace.activeSectionId) : null) ||
        targetNb.sections[0];

      const newPageId = `page-${Date.now()}`;
      const newSecId = targetSec ? targetSec.id : `sec-${Date.now()}`;

      const newPage: Page = {
        id: newPageId,
        notebookId: targetNb.id,
        sectionId: newSecId,
        title,
        pageType: 'note',
        tags: [],
        properties: { type: 'note', status: 'draft' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        content: `# ${title}\n\nStart typing here...\n`,
      };

      let updatedNotebooks: Notebook[];

      if (!targetSec) {
        // If notebook had no sections at all, create a default "General" section with this new note
        const createdSec: Section = {
          id: newSecId,
          notebookId: targetNb.id,
          name: 'General',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          pages: [newPage],
        };
        updatedNotebooks = workspace.notebooks.map((nb) =>
          nb.id === targetNb.id ? { ...nb, sections: [createdSec] } : nb
        );
      } else {
        updatedNotebooks = workspace.notebooks.map((nb) => {
          if (nb.id !== targetNb.id) return nb;
          return {
            ...nb,
            sections: nb.sections.map((sec) =>
              sec.id === newSecId ? { ...sec, pages: [newPage, ...sec.pages] } : sec
            ),
          };
        });
      }

      persistWorkspace({
        ...workspace,
        notebooks: updatedNotebooks,
        activeNotebookId: targetNb.id,
        activeSectionId: newSecId,
        activePageId: newPage.id,
      });

      setViewMode('editor');
      showNotification(`Created note "${title}"`, 'success');
    },
    [workspace, persistWorkspace, showNotification]
  );

  const handleUpdatePageContent = useCallback(
    (pageId: string, content: string) => {
      if (!workspace) return;
      const updatedNotebooks = workspace.notebooks.map((nb) => ({
        ...nb,
        sections: nb.sections.map((sec) => ({
          ...sec,
          pages: sec.pages.map((p) =>
            p.id === pageId ? { ...p, content, updatedAt: new Date().toISOString() } : p
          ),
        })),
      }));

      persistWorkspace({ ...workspace, notebooks: updatedNotebooks });
    },
    [workspace, persistWorkspace]
  );

  const handleUpdatePageTitle = useCallback(
    (pageId: string, title: string) => {
      if (!workspace) return;
      const updatedNotebooks = workspace.notebooks.map((nb) => ({
        ...nb,
        sections: nb.sections.map((sec) => ({
          ...sec,
          pages: sec.pages.map((p) =>
            p.id === pageId ? { ...p, title, updatedAt: new Date().toISOString() } : p
          ),
        })),
      }));

      persistWorkspace({ ...workspace, notebooks: updatedNotebooks });
    },
    [workspace, persistWorkspace]
  );

  const handleToggleFavorite = useCallback(
    (pageId: string) => {
      if (!workspace) return;
      const updatedNotebooks = workspace.notebooks.map((nb) => ({
        ...nb,
        sections: nb.sections.map((sec) => ({
          ...sec,
          pages: sec.pages.map((p) =>
            p.id === pageId ? { ...p, favorite: !p.favorite } : p
          ),
        })),
      }));

      persistWorkspace({ ...workspace, notebooks: updatedNotebooks });
    },
    [workspace, persistWorkspace]
  );

  const handleDeletePage = useCallback(
    (pageId: string) => {
      if (!workspace) return;
      const updatedNotebooks = workspace.notebooks.map((nb) => ({
        ...nb,
        sections: nb.sections.map((sec) => ({
          ...sec,
          pages: sec.pages.filter((p) => p.id !== pageId),
        })),
      }));

      const nextActivePage = allPages.find((p) => p.id !== pageId)?.id || null;
      persistWorkspace({
        ...workspace,
        notebooks: updatedNotebooks,
        activePageId: nextActivePage,
      });
      showNotification('Note deleted', 'info');
    },
    [workspace, allPages, persistWorkspace, showNotification]
  );

  const handleDeleteNotebook = useCallback(
    (notebookId: string) => {
      if (!workspace) return;
      const updated = workspace.notebooks.filter((nb) => nb.id !== notebookId);
      persistWorkspace({
        ...workspace,
        notebooks: updated,
        activeNotebookId: updated[0]?.id || null,
        activeSectionId: updated[0]?.sections[0]?.id || null,
        activePageId: updated[0]?.sections[0]?.pages[0]?.id || null,
      });
      showNotification('Notebook deleted', 'info');
    },
    [workspace, persistWorkspace, showNotification]
  );

  const handleDeleteSection = useCallback(
    (sectionId: string) => {
      if (!workspace) return;
      const updated = workspace.notebooks.map((nb) => ({
        ...nb,
        sections: nb.sections.filter((s) => s.id !== sectionId),
      }));
      persistWorkspace({ ...workspace, notebooks: updated });
      showNotification('Section deleted', 'info');
    },
    [workspace, persistWorkspace, showNotification]
  );

  // Rename Handlers
  const handleRenameNotebook = useCallback(
    (notebookId: string, newName: string) => {
      if (!workspace) return;
      const updated = workspace.notebooks.map((nb) =>
        nb.id === notebookId ? { ...nb, name: newName, updatedAt: new Date().toISOString() } : nb
      );
      persistWorkspace({ ...workspace, notebooks: updated });
      showNotification(`Renamed notebook to "${newName}"`, 'info');
    },
    [workspace, persistWorkspace, showNotification]
  );

  const handleRenameSection = useCallback(
    (notebookId: string, sectionId: string, newName: string) => {
      if (!workspace) return;
      const updated = workspace.notebooks.map((nb) => {
        if (nb.id !== notebookId) return nb;
        return {
          ...nb,
          sections: nb.sections.map((sec) =>
            sec.id === sectionId ? { ...sec, name: newName, updatedAt: new Date().toISOString() } : sec
          ),
        };
      });
      persistWorkspace({ ...workspace, notebooks: updated });
      showNotification(`Renamed section to "${newName}"`, 'info');
    },
    [workspace, persistWorkspace, showNotification]
  );

  const handleRenamePage = useCallback(
    (pageId: string, newTitle: string) => {
      handleUpdatePageTitle(pageId, newTitle);
      showNotification(`Renamed note to "${newTitle}"`, 'info');
    },
    [handleUpdatePageTitle, showNotification]
  );

  // Reorder Handlers (Move Up / Move Down)
  const handleReorderNotebooks = useCallback(
    (notebookId: string, direction: 'up' | 'down') => {
      if (!workspace) return;
      const list = [...workspace.notebooks];
      const idx = list.findIndex((n) => n.id === notebookId);
      if (idx === -1) return;
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= list.length) return;
      const temp = list[idx];
      list[idx] = list[targetIdx];
      list[targetIdx] = temp;
      persistWorkspace({ ...workspace, notebooks: list });
    },
    [workspace, persistWorkspace]
  );

  const handleReorderSections = useCallback(
    (notebookId: string, sectionId: string, direction: 'up' | 'down') => {
      if (!workspace) return;
      const updated = workspace.notebooks.map((nb) => {
        if (nb.id !== notebookId) return nb;
        const sections = [...nb.sections];
        const idx = sections.findIndex((s) => s.id === sectionId);
        if (idx === -1) return nb;
        const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (targetIdx < 0 || targetIdx >= sections.length) return nb;
        const temp = sections[idx];
        sections[idx] = sections[targetIdx];
        sections[targetIdx] = temp;
        return { ...nb, sections };
      });
      persistWorkspace({ ...workspace, notebooks: updated });
    },
    [workspace, persistWorkspace]
  );

  const handleReorderPages = useCallback(
    (sectionId: string, pageId: string, direction: 'up' | 'down') => {
      if (!workspace) return;
      const updated = workspace.notebooks.map((nb) => ({
        ...nb,
        sections: nb.sections.map((sec) => {
          if (sec.id !== sectionId) return sec;
          const pages = [...sec.pages];
          const idx = pages.findIndex((p) => p.id === pageId);
          if (idx === -1) return sec;
          const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
          if (targetIdx < 0 || targetIdx >= pages.length) return sec;
          const temp = pages[idx];
          pages[idx] = pages[targetIdx];
          pages[targetIdx] = temp;
          return { ...sec, pages };
        }),
      }));
      persistWorkspace({ ...workspace, notebooks: updated });
    },
    [workspace, persistWorkspace]
  );

  // Navigate to page by title (from WikiLinks, Backlinks, etc.), auto-creating note if it does not exist
  const handleNavigateToPage = useCallback(
    (pageTitle: string) => {
      const trimmed = pageTitle.trim();
      const found = allPages.find(
        (p) => p.title.toLowerCase().trim() === trimmed.toLowerCase()
      );
      if (found) {
        handleSelectPage(found.notebookId, found.sectionId, found.id);
        setViewMode('editor');
      } else {
        // Auto-create new note in the active or first notebook & section
        const targetNbId = workspace?.activeNotebookId || workspace?.notebooks[0]?.id;
        const targetSecId = workspace?.activeSectionId || workspace?.notebooks[0]?.sections[0]?.id;

        handleCreatePage(targetNbId, targetSecId, trimmed);
        setViewMode('editor');
        showNotification(`Created new note [[${trimmed}]]`, 'success');
      }
    },
    [allPages, workspace, handleSelectPage, handleCreatePage, showNotification]
  );

  // Bi-Directional Mind Map Bridge: Note -> Mind Map
  const handleOpenMindMapForPage = useCallback(
    (page: Page) => {
      const { nodes: parsedNodes, edges: parsedEdges } = markdownToMindMap(page.title, page.content, page.id);
      setNodes(parsedNodes);
      setEdges(parsedEdges);
      setSelectedNodeId(parsedNodes[0]?.id || null);
      setViewMode('mindmap');
      showNotification(`Generated interactive mind map for "${page.title}"`, 'success');
      setTimeout(() => fitView({ duration: 600 }), 150);
    },
    [setNodes, setEdges, fitView, showNotification]
  );

  // Bi-Directional Mind Map Bridge: Mind Map -> Note Export
  const handleExportMindMapToNote = useCallback(() => {
    if (!workspace || nodes.length === 0) return;
    const markdown = mindMapToMarkdown(nodes, edges);
    const rootLabel = nodes.find((n) => n.data?.isRoot)?.data?.label || 'MindMap Note';

    handleCreatePage(undefined, undefined, rootLabel);
    setTimeout(() => {
      if (activePage) {
        handleUpdatePageContent(activePage.id, markdown);
      }
    }, 100);
    setViewMode('editor');
    showNotification('Exported Mind Map to new Markdown Note!', 'success');
  }, [workspace, nodes, edges, handleCreatePage, activePage, handleUpdatePageContent, showNotification]);

  // Open or Create Today's Daily Note (Daily/YYYY-MM-DD.md)
  const handleOpenDailyNote = useCallback(() => {
    if (!workspace) return;
    const todayStr = new Date().toISOString().slice(0, 10);
    const title = `Daily Note - ${todayStr}`;
    const found = allPages.find((p) => p.title === title || (p.pageType === 'daily' && p.title.includes(todayStr)));

    if (found) {
      handleSelectPage(found.notebookId, found.sectionId, found.id);
      setViewMode('editor');
      showNotification(`Opened Today's Daily Note (${todayStr})`, 'info');
      return;
    }

    // Find or create a "Daily Notes" section in the active notebook
    const targetNb = workspace.notebooks.find((n) => n.id === workspace.activeNotebookId) || workspace.notebooks[0];
    if (!targetNb) return;

    let targetSec = targetNb.sections.find((s) => s.name.toLowerCase().includes('daily'));
    const targetSecId = targetSec ? targetSec.id : targetNb.sections[0]?.id || `sec-${Date.now()}`;

    const newPageId = `page-daily-${Date.now()}`;
    const initialContent = `# 📅 ${title}

## 🎯 Today's Focus & Action Items
- [ ] 

## 📝 Quick Thoughts & Log

## 🔗 Connected Notes
`;

    const newDailyPage: Page = {
      id: newPageId,
      notebookId: targetNb.id,
      sectionId: targetSecId,
      title,
      pageType: 'daily',
      tags: ['daily'],
      properties: { type: 'daily', status: 'in_progress', tags: ['daily'] },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      content: initialContent,
    };

    const updatedNotebooks = workspace.notebooks.map((nb) => {
      if (nb.id !== targetNb.id) return nb;
      const secExists = nb.sections.some((s) => s.id === targetSecId);
      if (secExists) {
        return {
          ...nb,
          sections: nb.sections.map((sec) =>
            sec.id === targetSecId ? { ...sec, pages: [newDailyPage, ...sec.pages] } : sec
          ),
        };
      } else {
        return {
          ...nb,
          sections: [
            {
              id: targetSecId,
              notebookId: targetNb.id,
              name: '📅 Daily Notes',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              pages: [newDailyPage],
            },
            ...nb.sections,
          ],
        };
      }
    });

    persistWorkspace({
      ...workspace,
      notebooks: updatedNotebooks,
      activeNotebookId: targetNb.id,
      activeSectionId: targetSecId,
      activePageId: newDailyPage.id,
    });

    setViewMode('editor');
    showNotification(`Created Today's Daily Note (${todayStr})`, 'success');
  }, [workspace, allPages, handleSelectPage, persistWorkspace, showNotification]);

  // Accept AI Connection Suggestion
  const handleAcceptAiSuggestion = useCallback(
    (suggestion: AiConnectionSuggestion) => {
      if (!activePage) return;
      const linkText = `\n\n## Related Connections\n- [[${suggestion.targetTitle}]]: ${suggestion.reason}\n`;
      handleUpdatePageContent(activePage.id, activePage.content + linkText);
      showNotification(`Connected [[${suggestion.targetTitle}]]!`, 'success');
    },
    [activePage, handleUpdatePageContent, showNotification]
  );

  // Convert Unlinked Mention to WikiLink
  const handleConvertMentionToLink = useCallback(
    (mention: UnlinkedMentionItem) => {
      const targetPage = allPages.find((p) => p.id === mention.sourcePageId);
      if (!targetPage || !activePage) return;

      const newContent = convertMentionToWikiLink(targetPage.content, activePage.title);
      handleUpdatePageContent(targetPage.id, newContent);
      showNotification(`Linked "${activePage.title}" inside [[${targetPage.title}]]`, 'success');
    },
    [allPages, activePage, handleUpdatePageContent, showNotification]
  );

  // MapMind Layout Handlers
  const handleApplyLayout = useCallback(
    async (dir: LayoutDirection, density?: LayoutDensity) => {
      try {
        if (dir === 'BALANCED_MINDMAP') {
          const res = await getElkLayout(nodes, edges, { density: density || settings.layoutDensity });
          setNodes(res.nodes);
          setEdges(res.edges);
        } else {
          const res = await getDagreLayout(nodes, edges, {
            direction: dir as 'TB' | 'LR' | 'BT' | 'RL',
            density: density || settings.layoutDensity,
          });
          setNodes(res.nodes);
          setEdges(res.edges);
        }
        setCurrentLayout(dir);
        setTimeout(() => fitView({ duration: 500 }), 50);
      } catch (err) {
        console.error('Layout error:', err);
      }
    },
    [nodes, edges, settings.layoutDensity, setNodes, setEdges, fitView]
  );

  // Node editing handlers in MapMind canvas
  const handleUpdateNode = useCallback(
    (nodeId: string, updates: Partial<MapMindNode['data']>) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId
            ? { ...n, data: { ...n.data, ...updates } }
            : n
        )
      );
    },
    [setNodes]
  );

  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
      setSelectedNodeId(null);
    },
    [setNodes, setEdges]
  );

  // Dedicated Add Child Node action (Tab / Floating Dock)
  const handleAddChildToNode = useCallback(
    (parentId?: string | null) => {
      const targetParent = (parentId ? nodes.find((n) => n.id === parentId) : null) || nodes[0];
      if (!targetParent) return;

      const newId = `node-${Date.now()}`;
      const childCount = edges.filter((e) => e.source === targetParent.id).length;
      const newNode: MapMindNode = {
        id: newId,
        type: 'custom',
        position: {
          x: targetParent.position.x + 280,
          y: targetParent.position.y + (childCount - 1) * 75,
        },
        selected: true,
        data: {
          label: 'New Idea',
          colorTheme: (targetParent.data?.colorTheme || 'purple') as NodeColorTheme,
          shape: 'pill',
          isEditing: true,
        },
      };
      const newEdge: MapMindEdge = {
        id: `edge-${targetParent.id}-${newId}`,
        source: targetParent.id,
        target: newId,
        type: 'custom',
      };
      setNodes((nds) => [...nds.map((n) => ({ ...n, selected: false })), newNode]);
      setEdges((eds) => [...eds, newEdge]);
      setSelectedNodeId(newId);
      showNotification('Added child node! Type to edit.', 'success');
    },
    [nodes, edges, setNodes, setEdges, showNotification]
  );

  // Dedicated Add Sibling Node action (Enter / Floating Dock)
  const handleAddSiblingToNode = useCallback(
    (siblingId?: string | null) => {
      const targetSibling = (siblingId ? nodes.find((n) => n.id === siblingId) : null) || nodes[0];
      if (!targetSibling) return;

      const incoming = edges.find((e) => e.target === targetSibling.id);
      const parentId = incoming ? incoming.source : targetSibling.data?.isRoot ? null : nodes[0]?.id;

      const newId = `node-${Date.now()}`;
      const newNode: MapMindNode = {
        id: newId,
        type: 'custom',
        position: {
          x: targetSibling.position.x,
          y: targetSibling.position.y + 90,
        },
        selected: true,
        data: {
          label: 'New Branch',
          colorTheme: (targetSibling.data?.colorTheme || 'purple') as NodeColorTheme,
          shape: 'pill',
          isEditing: true,
        },
      };

      setNodes((nds) => [...nds.map((n) => ({ ...n, selected: false })), newNode]);

      if (parentId) {
        const newEdge: MapMindEdge = {
          id: `edge-${parentId}-${newId}`,
          source: parentId,
          target: newId,
          type: 'custom',
        };
        setEdges((eds) => [...eds, newEdge]);
      }

      setSelectedNodeId(newId);
      showNotification('Added sibling branch! Type to edit.', 'success');
    },
    [nodes, edges, setNodes, setEdges, showNotification]
  );

  // Canvas Keyboard Shortcuts (Tab, Enter, Space/F2, Delete in Mind Map mode)
  useEffect(() => {
    if (viewMode !== 'mindmap') return;

    const handleCanvasKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isTyping =
        activeEl instanceof HTMLInputElement ||
        activeEl instanceof HTMLTextAreaElement ||
        activeEl?.getAttribute('contenteditable') === 'true';

      if (isTyping) return;

      // 1. Tab -> Add Child to Selected Node
      if (e.key === 'Tab') {
        e.preventDefault();
        const targetId = selectedNodeId || nodes[0]?.id;
        if (targetId) handleAddChildToNode(targetId);
        return;
      }

      // 2. Enter -> Add Sibling to Selected Node
      if (e.key === 'Enter') {
        e.preventDefault();
        const targetId = selectedNodeId || nodes[0]?.id;
        if (targetId) handleAddSiblingToNode(targetId);
        return;
      }

      // 3. Space or F2 -> Start Editing Selected Node
      if (e.key === ' ' || e.key === 'F2') {
        e.preventDefault();
        const targetId = selectedNodeId || nodes[0]?.id;
        if (targetId) handleUpdateNode(targetId, { isEditing: true });
        return;
      }

      // 4. Delete or Backspace -> Delete Selected Node
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNodeId && nodes.find((n) => n.id === selectedNodeId && !n.data?.isRoot)) {
          e.preventDefault();
          handleDeleteNode(selectedNodeId);
          showNotification('Deleted node', 'info');
        }
        return;
      }
    };

    window.addEventListener('keydown', handleCanvasKeyDown);
    return () => window.removeEventListener('keydown', handleCanvasKeyDown);
  }, [
    viewMode,
    selectedNodeId,
    nodes,
    handleAddChildToNode,
    handleAddSiblingToNode,
    handleUpdateNode,
    handleDeleteNode,
    showNotification,
  ]);

  // Universal Keyboard Shortcuts (Ctrl+K, Ctrl+P, Ctrl+1..6, Ctrl+S, Ctrl+O, Ctrl+Alt+N, Ctrl+Alt+V)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K or Cmd+K -> Universal Command Palette
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
        return;
      }

      // Ctrl+P -> Quick Open
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
        return;
      }

      // Ctrl+Alt+N -> Create New Vault
      if ((e.ctrlKey || e.metaKey) && e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setIsVaultManagerOpen(true);
        return;
      }

      // Ctrl+Alt+V -> Open Vault Switcher
      if ((e.ctrlKey || e.metaKey) && e.altKey && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        setIsVaultManagerOpen((prev) => !prev);
        return;
      }

      // Ctrl+S -> Save / Sync to Local File (Direct Disk Write, Shift for Save As)
      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveCurrentVault(e.shiftKey);
        return;
      }

      // Ctrl+O -> Open Local Vault File from Disk
      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        handleOpenLocalVaultFile();
        return;
      }

      // Ctrl+D -> Open Today's Daily Note
      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        handleOpenDailyNote();
        return;
      }

      // Ctrl+J -> Toggle Knowledge Inspector Panel
      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        setIsInspectorCollapsed((prev) => !prev);
        return;
      }

      // Ctrl+1..6 View Mode shortcuts
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
        if (e.key === '1') { e.preventDefault(); setViewMode('editor'); }
        if (e.key === '2') { e.preventDefault(); setViewMode('mindmap'); }
        if (e.key === '3') { e.preventDefault(); setViewMode('graph'); }
        if (e.key === '4') { e.preventDefault(); setViewMode('study'); }
        if (e.key === '5') { e.preventDefault(); setViewMode('tasks'); }
        if (e.key === '6') { e.preventDefault(); setViewMode('dashboard'); }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleSaveCurrentVault, handleOpenLocalVaultFile, handleOpenDailyNote]);

  if (!workspace) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <span className="font-bold text-sm">Loading Local Knowledge Vault...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen flex flex-col bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden font-sans">
      {/* Top Application Header */}
      <UnifiedHeader
        workspace={workspace}
        currentMode={viewMode}
        onSelectMode={(mode) => setViewMode(mode)}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onCreatePage={() => {
          handleCreatePage();
          setViewMode('editor');
        }}
        onOpenDailyNote={handleOpenDailyNote}
        onExportVault={handleExportCurrentVault}
        onOpenVaultManager={() => setIsVaultManagerOpen(true)}
        isAutoSaving={isAutoSaving}
        isDarkMode={settings.theme === 'dark'}
        onToggleTheme={() =>
          setSettings((s) => ({ ...s, theme: s.theme === 'dark' ? 'light' : 'dark' }))
        }
        aiMode={workspace.settings.aiConnectionMode}
        isInspectorOpen={!isInspectorCollapsed}
        onToggleInspector={() => setIsInspectorCollapsed((prev) => !prev)}
      />

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* VIEW 1: Knowledge Notebooks & Markdown Editor */}
        {viewMode === 'editor' && (
          <div className="flex-1 flex h-full overflow-hidden">
            {/* Left Sidebar Tree */}
            <NotebookSidebar
              workspace={workspace}
              activeNotebookId={workspace.activeNotebookId}
              activeSectionId={workspace.activeSectionId}
              activePageId={workspace.activePageId}
              onSelectPage={handleSelectPage}
              onSelectNotebook={handleSelectNotebook}
              onCreateNotebook={handleCreateNotebook}
              onCreateSection={handleCreateSection}
              onCreatePage={(nbId, secId) => handleCreatePage(nbId, secId)}
              onDeletePage={handleDeletePage}
              onDeleteNotebook={handleDeleteNotebook}
              onDeleteSection={handleDeleteSection}
              onRenameNotebook={handleRenameNotebook}
              onRenameSection={handleRenameSection}
              onRenamePage={handleRenamePage}
              onReorderNotebooks={handleReorderNotebooks}
              onReorderSections={handleReorderSections}
              onReorderPages={handleReorderPages}
              onToggleFavorite={handleToggleFavorite}
              onOpenDailyNote={handleOpenDailyNote}
              onOpenTasksView={() => setViewMode('tasks')}
              onOpenStudyView={() => setViewMode('study')}
              selectedTag={selectedTag}
              onSelectTag={setSelectedTag}
              isCollapsed={isSidebarCollapsed}
              onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
            />

            {/* Center Editor / Live Preview */}
            {activePage ? (
              <MarkdownEditor
                page={activePage}
                allPages={allPages}
                onUpdateContent={handleUpdatePageContent}
                onUpdateTitle={handleUpdatePageTitle}
                onToggleFavorite={handleToggleFavorite}
                onNavigateToPage={handleNavigateToPage}
                onOpenMindMapForPage={handleOpenMindMapForPage}
                onGenerateStudyDeck={() => setViewMode('study')}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 bg-white dark:bg-slate-950">
                <p className="text-sm font-medium mb-3">No page selected</p>
                <button
                  onClick={() => handleCreatePage()}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-purple-600 text-white"
                >
                  Create Note
                </button>
              </div>
            )}

            {/* Right Inspector Panel */}
            {activePage && (
              <NotebookInspectorPanel
                page={activePage}
                allPages={allPages}
                backlinks={backlinks}
                unlinkedMentions={unlinkedMentions}
                aiSuggestions={aiSuggestions}
                aiMode={workspace.settings.aiConnectionMode}
                onChangeAiMode={(mode) =>
                  persistWorkspace({
                    ...workspace,
                    settings: { ...workspace.settings, aiConnectionMode: mode },
                  })
                }
                onAcceptAiSuggestion={handleAcceptAiSuggestion}
                onRejectAiSuggestion={() => showNotification(`Ignored connection`, 'info')}
                onConvertMentionToLink={handleConvertMentionToLink}
                onNavigateToPage={handleNavigateToPage}
                notebookMap={notebookMap}
                sectionMap={sectionMap}
                isCollapsed={isInspectorCollapsed}
                onToggleCollapse={() => setIsInspectorCollapsed((prev) => !prev)}
              />
            )}
          </div>
        )}

        {/* VIEW 2: MapMind Visual Whiteboard Canvas */}
        {viewMode === 'mindmap' && (
          <div className="flex-1 h-full flex flex-col relative overflow-hidden">
            {/* Whiteboard Header Toolbar */}
            <HeaderToolbar
              fileName="Whiteboard Diagram"
              isSaving={false}
              onNew={() => setIsCleanBoardOpen(true)}
              onOpen={() => {}}
              onSave={() => handleExportMindMapToNote()}
              onOpenCleanBoard={() => setIsCleanBoardOpen(true)}
              onOpenSearch={() => setIsCommandPaletteOpen(true)}
              onToggleOutline={() => {}}
              isOutlineOpen={false}
              onFoldLevel={() => {}}
              onToggleTheme={() =>
                setSettings((s) => ({ ...s, theme: s.theme === 'dark' ? 'light' : 'dark' }))
              }
              isDarkTheme={settings.theme === 'dark'}
              onOpenTimeMachine={() => {}}
              onOpenExport={() => setIsExportOpen(true)}
              snapshotCount={0}
              secondsUntilNextSave={180}
            />

            {/* Canvas Diagram Viewport */}
            <div className="flex-1 w-full h-full relative">
              <DiagramCanvas
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                setEdges={setEdges}
                setNodes={setNodes}
                settings={settings}
                onToggleCollapse={(nodeId) => {
                  const node = nodes.find(n => n.id === nodeId);
                  if (node) handleUpdateNode(nodeId, { collapsed: !node.data?.collapsed });
                }}
                onToggleLock={(nodeId) => {
                  const node = nodes.find(n => n.id === nodeId);
                  if (node) handleUpdateNode(nodeId, { locked: !node.data?.locked });
                }}
                onUpdateNodeLabel={(nodeId, label) => handleUpdateNode(nodeId, { label })}
                onCommitNodeLabel={(nodeId, label, action) => {
                  handleUpdateNode(nodeId, { label, isEditing: false });
                  if (action === 'add-child') {
                    const parent = nodes.find((n) => n.id === nodeId);
                    if (!parent) return;
                    const newId = `node-${Date.now()}`;
                    const newNode: MapMindNode = {
                      id: newId,
                      type: 'custom',
                      position: { x: parent.position.x + 260, y: parent.position.y + 60 },
                      data: { label: 'New Topic', colorTheme: 'purple', shape: 'pill', isEditing: true },
                    };
                    const newEdge: MapMindEdge = {
                      id: `edge-${nodeId}-${newId}`,
                      source: nodeId,
                      target: newId,
                      type: 'custom',
                    };
                    setNodes((nds) => [...nds, newNode]);
                    setEdges((eds) => [...eds, newEdge]);
                    setSelectedNodeId(newId);
                  }
                }}
                onAddChildNode={(parentId) => {
                  const parent = nodes.find((n) => n.id === parentId);
                  if (!parent) return;
                  const newId = `node-${Date.now()}`;
                  const newNode: MapMindNode = {
                    id: newId,
                    type: 'custom',
                    position: { x: parent.position.x + 260, y: parent.position.y + 60 },
                    data: { label: 'New Topic', colorTheme: 'purple', shape: 'pill' },
                  };
                  const newEdge: MapMindEdge = {
                    id: `edge-${parentId}-${newId}`,
                    source: parentId,
                    target: newId,
                    type: 'custom',
                  };
                  setNodes((nds) => [...nds, newNode]);
                  setEdges((eds) => [...eds, newEdge]);
                  setSelectedNodeId(newId);
                }}
                onAddSiblingNode={(siblingId) => {
                  const incoming = edges.find((e) => e.target === siblingId);
                  const parentId = incoming ? incoming.source : 'root-1';
                  const sibling = nodes.find((n) => n.id === siblingId);
                  if (!sibling) return;

                  const newId = `node-${Date.now()}`;
                  const newNode: MapMindNode = {
                    id: newId,
                    type: 'custom',
                    position: { x: sibling.position.x, y: sibling.position.y + 80 },
                    data: { label: 'New Sibling', colorTheme: 'purple', shape: 'pill' },
                  };
                  const newEdge: MapMindEdge = {
                    id: `edge-${parentId}-${newId}`,
                    source: parentId,
                    target: newId,
                    type: 'custom',
                  };
                  setNodes((nds) => [...nds, newNode]);
                  setEdges((eds) => [...eds, newEdge]);
                  setSelectedNodeId(newId);
                }}
                onStartEditingNode={(nodeId) => handleUpdateNode(nodeId, { isEditing: true })}
                onStopEditingNode={(nodeId) => handleUpdateNode(nodeId, { isEditing: false })}
                onSelectNode={(node) => setSelectedNodeId(node ? node.id : null)}
                onExpandWithAi={(nodeId) => {
                  setAiExpandTargetNodeId(nodeId);
                  setIsAiExpandModalOpen(true);
                }}
              />

              {/* Whiteboard Floating Action Dock */}
              <FloatingActionDock
                onAddNode={() => handleAddChildToNode(selectedNodeId || nodes[0]?.id)}
                onAddChild={() => handleAddChildToNode(selectedNodeId || nodes[0]?.id)}
                onAddSibling={() => handleAddSiblingToNode(selectedNodeId || nodes[0]?.id)}
                onStartEditing={() => selectedNodeId && handleUpdateNode(selectedNodeId, { isEditing: true })}
                onDeleteNode={() => selectedNodeId && handleDeleteNode(selectedNodeId)}
                onOpenAiImport={() => setIsAiImportOpen(true)}
                onOpenPresentation={() => {}}
                isSpotlightActive={false}
                onToggleSpotlight={() => {}}
                sketchMode={settings.sketchMode}
                onToggleSketchMode={() => setSettings((s) => ({ ...s, sketchMode: !s.sketchMode }))}
                onApplyLayout={(layout) => handleApplyLayout(layout)}
                isLayouting={false}
                onOpenCanvasTheme={() => setIsCanvasThemeOpen(true)}
                onOpenShortcuts={() => setIsShortcutsOpen(true)}
                edgeRoutingStyle={settings.edgeRoutingStyle}
                onChangeEdgeRoutingStyle={(style) => setSettings((s) => ({ ...s, edgeRoutingStyle: style }))}
                collisionAvoidance={settings.collisionAvoidance}
                onToggleCollisionAvoidance={() =>
                  setSettings((s) => ({ ...s, collisionAvoidance: !s.collisionAvoidance }))
                }
                layoutDensity={settings.layoutDensity}
                onChangeLayoutDensity={(density) => {
                  setSettings((s) => ({ ...s, layoutDensity: density }));
                  handleApplyLayout(currentLayout, density);
                }}
                selectedNodeId={selectedNodeId}
                onOpenNodeExpansion={(nodeId) => {
                  setAiExpandTargetNodeId(nodeId);
                  setIsAiExpandModalOpen(true);
                }}
              />

              {/* Node Inspector Drawer */}
              <NodeInspector
                selectedNode={nodes.find((n) => n.id === selectedNodeId) || null}
                incomingEdge={edges.find((e) => e.target === selectedNodeId) || null}
                onUpdateNode={handleUpdateNode}
                onUpdateEdgeLabel={(edgeId, label) => {
                  setEdges((eds) =>
                    eds.map((e) => (e.id === edgeId ? { ...e, label, data: { ...e.data, label } } : e))
                  );
                }}
                onDeleteNode={handleDeleteNode}
                onClose={() => setSelectedNodeId(null)}
              />

              {/* Export to Note Button Floating Top-Right */}
              <div className="absolute top-4 right-4 z-20">
                <button
                  onClick={handleExportMindMapToNote}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-300 shadow-lg border border-purple-200 dark:border-purple-800 hover:bg-purple-50 transition-all flex items-center gap-1.5"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Save as Markdown Note</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 3: 2D Interactive Knowledge Graph */}
        {viewMode === 'graph' && (
          <KnowledgeGraphView
            workspace={workspace}
            allPages={allPages}
            aiSuggestions={aiSuggestions}
            activePageId={workspace.activePageId}
            onSelectPage={(pageId) => {
              const p = allPages.find((item) => item.id === pageId);
              if (p) {
                handleSelectPage(p.notebookId, p.sectionId, p.id);
                setViewMode('editor');
              }
            }}
            onOpenMindMap={handleOpenMindMapForPage}
            isDarkMode={settings.theme === 'dark'}
          />
        )}

        {/* VIEW 4: Study & Learning Hub */}
        {viewMode === 'study' && (
          <StudyHubView
            workspace={workspace}
            allPages={allPages}
            activePageId={workspace.activePageId}
            onSelectPage={(pageId) => {
              const p = allPages.find((item) => item.id === pageId);
              if (p) {
                handleSelectPage(p.notebookId, p.sectionId, p.id);
                setViewMode('editor');
              }
            }}
          />
        )}

        {/* VIEW 5: Vault Tasks */}
        {viewMode === 'tasks' && (
          <TasksView
            allPages={allPages}
            notebookMap={notebookMap}
            sectionMap={sectionMap}
            onUpdateContent={handleUpdatePageContent}
            onSelectPage={(pageId) => {
              const p = allPages.find((item) => item.id === pageId);
              if (p) {
                handleSelectPage(p.notebookId, p.sectionId, p.id);
                setViewMode('editor');
              }
            }}
          />
        )}

        {/* VIEW 6: Home Dashboard */}
        {viewMode === 'dashboard' && (
          <DashboardView
            workspace={workspace}
            allPages={allPages}
            aiSuggestions={aiSuggestions}
            onSelectPage={(pageId) => {
              const p = allPages.find((item) => item.id === pageId);
              if (p) {
                handleSelectPage(p.notebookId, p.sectionId, p.id);
                setViewMode('editor');
              }
            }}
            onCreatePage={() => {
              handleCreatePage();
              setViewMode('editor');
            }}
            onSelectMode={(mode) => setViewMode(mode)}
            onAcceptAiSuggestion={handleAcceptAiSuggestion}
            notebookMap={notebookMap}
            sectionMap={sectionMap}
          />
        )}
      </div>

      {/* Universal Command Palette (Ctrl+K / Cmd+K) */}
      <UniversalCommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        workspace={workspace}
        allPages={allPages}
        onSelectPage={(pageId) => {
          const p = allPages.find((item) => item.id === pageId);
          if (p) {
            handleSelectPage(p.notebookId, p.sectionId, p.id);
            setViewMode('editor');
          }
        }}
        onSelectMode={(mode) => setViewMode(mode)}
        onCreatePage={() => {
          handleCreatePage();
          setViewMode('editor');
        }}
        onOpenDailyNote={handleOpenDailyNote}
        onExportVault={() => handleSaveCurrentVault(false)}
        onOpenVaultManager={() => setIsVaultManagerOpen(true)}
        onExportAllVaults={handleExportAllVaultsBundle}
        onWipeDeviceData={handleWipeDeviceData}
        onToggleTheme={() =>
          setSettings((s) => ({ ...s, theme: s.theme === 'dark' ? 'light' : 'dark' }))
        }
        isDarkMode={settings.theme === 'dark'}
      />

      {/* Canvas Modals */}
      {isExportOpen && (
        <Suspense fallback={null}>
          <ExportMenu
            onClose={() => setIsExportOpen(false)}
            nodes={nodes}
            edges={edges}
            settings={settings}
            onNotify={showNotification}
          />
        </Suspense>
      )}

      {isCanvasThemeOpen && (
        <Suspense fallback={null}>
          <CanvasThemeModal
            isOpen={isCanvasThemeOpen}
            onClose={() => setIsCanvasThemeOpen(false)}
            settings={settings}
            onUpdateSettings={(updates) => setSettings((s) => ({ ...s, ...updates }))}
          />
        </Suspense>
      )}

      {isAiImportOpen && (
        <Suspense fallback={null}>
          <ErrorBoundary fallbackTitle="AI Mind Map Generator">
            <AiChatMindMapModal
              isOpen={isAiImportOpen}
              onClose={() => setIsAiImportOpen(false)}
              selectedNodeId={selectedNodeId}
              currentNodes={nodes}
              currentEdges={edges}
              onApplyMindMap={(newNodes, newEdges) => {
                setNodes(newNodes);
                setEdges(newEdges);
                setIsAiImportOpen(false);
                setTimeout(() => fitView({ duration: 500 }), 100);
              }}
              onNotify={showNotification}
            />
          </ErrorBoundary>
        </Suspense>
      )}

      {isAiExpandModalOpen && (
        <Suspense fallback={null}>
          <ErrorBoundary fallbackTitle="AI Node Expansion">
            <NodeExpansionModal
              isOpen={isAiExpandModalOpen}
              onClose={() => setIsAiExpandModalOpen(false)}
              targetNodeId={aiExpandTargetNodeId}
              nodes={nodes}
              edges={edges}
              onApplyExpansion={(newNodes, newEdges) => {
                setNodes(newNodes);
                setEdges(newEdges);
                setIsAiExpandModalOpen(false);
                setTimeout(() => fitView({ duration: 500 }), 100);
              }}
              onNotify={showNotification}
            />
          </ErrorBoundary>
        </Suspense>
      )}

      {isCleanBoardOpen && (
        <Suspense fallback={null}>
          <CleanBoardModal
            isOpen={isCleanBoardOpen}
            onClose={() => setIsCleanBoardOpen(false)}
            onConfirmClean={() => {
              setNodes([
                {
                  id: 'root-1',
                  type: 'custom',
                  position: { x: 0, y: 0 },
                  selected: true,
                  data: {
                    label: 'Central Topic',
                    isRoot: true,
                    colorTheme: 'blue',
                    shape: 'pill',
                  },
                },
              ]);
              setEdges([]);
              setSelectedNodeId('root-1');
              setIsCleanBoardOpen(false);
            }}
            nodeCount={nodes.length}
          />
        </Suspense>
      )}

      {isShortcutsOpen && (
        <Suspense fallback={null}>
          <KeyboardShortcutsModal
            isOpen={isShortcutsOpen}
            onClose={() => setIsShortcutsOpen(false)}
          />
        </Suspense>
      )}

      {/* Vault Manager Modal */}
      <VaultManagerModal
        isOpen={isVaultManagerOpen}
        onClose={() => setIsVaultManagerOpen(false)}
        currentVault={workspace}
        vaultList={vaultList}
        onSwitchVault={handleSwitchVault}
        onCreateVault={handleCreateVault}
        onExportCurrentVault={() => handleSaveCurrentVault(false)}
        onSaveVaultAs={() => handleSaveCurrentVault(true)}
        onOpenLocalVaultFile={handleOpenLocalVaultFile}
        onExportAllVaultsBundle={handleExportAllVaultsBundle}
        onImportVaultFile={handleImportVaultFile}
        onDeleteVault={handleDeleteVault}
        onWipeDeviceData={handleWipeDeviceData}
      />

      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl text-xs font-semibold shadow-lg backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-150 flex items-center gap-2 ${
            toast.type === 'success'
              ? 'bg-emerald-600/95 text-white'
              : toast.type === 'error'
              ? 'bg-red-600/95 text-white'
              : 'bg-slate-800/95 text-white'
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary fallbackTitle="MapMind Application">
      <ReactFlowProvider>
        <AppContent />
      </ReactFlowProvider>
    </ErrorBoundary>
  );
}
