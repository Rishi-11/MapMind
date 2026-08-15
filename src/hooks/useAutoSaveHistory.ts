import { useState, useEffect, useRef, useCallback } from 'react';
import { historyManager } from '@/lib/storage/historyManager';
import { MapMindNode, MapMindEdge } from '@/types/graph';
import { HistorySnapshot } from '@/types/history';

const DEFAULT_INTERVAL_MS = 3 * 60 * 1000; // 3 minutes

export function useAutoSaveHistory(
  nodes: MapMindNode[],
  edges: MapMindEdge[],
  onRestore: (nodes: MapMindNode[], edges: MapMindEdge[]) => void,
  intervalMs: number = DEFAULT_INTERVAL_MS
) {
  const [snapshots, setSnapshots] = useState<HistorySnapshot[]>([]);
  const [lastSavedTimestamp, setLastSavedTimestamp] = useState<number | null>(null);
  const [secondsUntilNextSave, setSecondsUntilNextSave] = useState<number>(Math.round(intervalMs / 1000));
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const lastSavedStateHash = useRef<string>('');
  const nodesRef = useRef<MapMindNode[]>(nodes);
  const edgesRef = useRef<MapMindEdge[]>(edges);

  useEffect(() => {
    nodesRef.current = nodes;
    edgesRef.current = edges;
  }, [nodes, edges]);

  // Load existing snapshots on mount
  const refreshSnapshots = useCallback(async () => {
    try {
      const list = await historyManager.getAllSnapshots();
      setSnapshots(list);
      if (list.length > 0 && !lastSavedTimestamp) {
        setLastSavedTimestamp(list[0].timestamp);
      }
    } catch (err) {
      console.error('Failed to load history snapshots:', err);
    }
  }, [lastSavedTimestamp]);

  useEffect(() => {
    refreshSnapshots();
  }, [refreshSnapshots]);

  // Save current state snapshot
  const triggerSave = useCallback(
    async (trigger: 'auto-save' | 'manual-save' | 'layout-change' | 'import' = 'manual-save', name?: string) => {
      const currentNodes = nodesRef.current;
      const currentEdges = edgesRef.current;

      if (currentNodes.length === 0) return null;

      const currentHash = JSON.stringify({
        n: currentNodes.map((n) => ({ id: n.id, pos: n.position, data: n.data })),
        e: currentEdges.map((e) => ({ id: e.id, s: e.source, t: e.target })),
      });

      // Avoid duplicating identical state if auto-saving
      if (trigger === 'auto-save' && currentHash === lastSavedStateHash.current) {
        return null;
      }

      setIsSaving(true);
      try {
        const snapshot = await historyManager.saveSnapshot(currentNodes, currentEdges, trigger, name);
        lastSavedStateHash.current = currentHash;
        setLastSavedTimestamp(snapshot.timestamp);
        await refreshSnapshots();
        return snapshot;
      } catch (err) {
        console.error('Snapshot save failed:', err);
        return null;
      } finally {
        setIsSaving(false);
      }
    },
    [refreshSnapshots]
  );

  // Auto-save timer interval (every 3 minutes)
  useEffect(() => {
    let remaining = Math.round(intervalMs / 1000);
    setSecondsUntilNextSave(remaining);

    const countdownTimer = setInterval(() => {
      setSecondsUntilNextSave((prev) => {
        if (prev <= 1) {
          return Math.round(intervalMs / 1000);
        }
        return prev - 1;
      });
    }, 1000);

    const autoSaveTimer = setInterval(() => {
      triggerSave('auto-save');
    }, intervalMs);

    return () => {
      clearInterval(countdownTimer);
      clearInterval(autoSaveTimer);
    };
  }, [intervalMs, triggerSave]);

  // Restore snapshot
  const restoreSnapshot = useCallback(
    (snapshot: HistorySnapshot) => {
      if (snapshot && snapshot.state) {
        onRestore(snapshot.state.nodes, snapshot.state.edges);
      }
    },
    [onRestore]
  );

  // Delete snapshot
  const deleteSnapshot = useCallback(
    async (id: string) => {
      await historyManager.deleteSnapshot(id);
      await refreshSnapshots();
    },
    [refreshSnapshots]
  );

  // Clear all history
  const clearHistory = useCallback(async () => {
    await historyManager.clearAllSnapshots();
    await refreshSnapshots();
  }, [refreshSnapshots]);

  return {
    snapshots,
    lastSavedTimestamp,
    secondsUntilNextSave,
    isSaving,
    triggerSave,
    restoreSnapshot,
    deleteSnapshot,
    clearHistory,
    refreshSnapshots,
  };
}
