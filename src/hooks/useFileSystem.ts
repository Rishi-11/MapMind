import { useState, useCallback, useEffect } from 'react';
import { fileSystemManager, FileData } from '@/lib/storage/fileSystemManager';
import { MapMindNode, MapMindEdge } from '@/types/graph';

export function useFileSystem(
  nodes: MapMindNode[],
  edges: MapMindEdge[],
  onLoadGraph: (graph: FileData['graph'], fileName?: string) => void,
  onNotify?: (message: string, type: 'success' | 'error' | 'info') => void
) {
  const [activeFileName, setActiveFileName] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = useCallback(
    async (forceSaveAs = false) => {
      if (nodes.length === 0) {
        onNotify?.('Canvas is empty. Add some nodes before saving.', 'info');
        return;
      }

      setIsSaving(true);
      try {
        const result = await fileSystemManager.saveToFile(
          nodes,
          edges,
          activeFileName || 'diagram.mapmind.json',
          forceSaveAs
        );

        if (result.success) {
          setActiveFileName(result.fileName);
          onNotify?.(
            result.isNewFile
              ? `Saved as ${result.fileName}`
              : `Saved to ${result.fileName}`,
            'success'
          );
        }
      } catch (err) {
        console.error('File save error:', err);
        onNotify?.('Failed to save file.', 'error');
      } finally {
        setIsSaving(false);
      }
    },
    [nodes, edges, activeFileName, onNotify]
  );

  const handleOpen = useCallback(async () => {
    try {
      const result = await fileSystemManager.openFromFile();
      if (result.success && result.data) {
        onLoadGraph(result.data.graph, result.fileName);
        setActiveFileName(result.fileName || null);
        onNotify?.(`Loaded ${result.fileName || 'diagram'}`, 'success');
      }
    } catch (err) {
      console.error('File open error:', err);
      onNotify?.('Failed to open file. Please check file format.', 'error');
    }
  }, [onLoadGraph, onNotify]);

  const handleNew = useCallback(() => {
    fileSystemManager.resetActiveFile();
    setActiveFileName(null);
  }, []);

  // Keyboard shortcut listener for Ctrl+S, Ctrl+Shift+S, Ctrl+O
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isS = e.key === 's' || e.key === 'S' || e.code === 'KeyS';
      const isO = e.key === 'o' || e.key === 'O' || e.code === 'KeyO';

      if ((e.ctrlKey || e.metaKey) && isS) {
        e.preventDefault();
        e.stopPropagation();
        if (e.shiftKey) {
          handleSave(true); // Force Save As file picker modal
        } else {
          handleSave(false); // Silent Save to active file or prompt if new
        }
      } else if ((e.ctrlKey || e.metaKey) && isO) {
        e.preventDefault();
        e.stopPropagation();
        handleOpen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, handleOpen]);

  return {
    activeFileName,
    isSaving,
    handleSave,
    handleOpen,
    handleNew,
    isFsSupported: fileSystemManager.isSupported(),
  };
}
