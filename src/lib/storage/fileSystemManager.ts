import { fileOpen, fileSave, supported } from 'browser-fs-access';
import { MapMindNode, MapMindEdge, MindMapGraphState } from '@/types/graph';

export interface FileData {
  version: string;
  savedAt: string;
  name: string;
  graph: MindMapGraphState;
  metadata?: {
    app: string;
    nodeCount: number;
    edgeCount: number;
  };
}

class FileSystemManager {
  private currentHandle: FileSystemFileHandle | null = null;
  private currentFileName: string | null = null;

  public isSupported(): boolean {
    return supported;
  }

  public getCurrentFileName(): string | null {
    return this.currentFileName;
  }

  public hasActiveFile(): boolean {
    return this.currentHandle !== null;
  }

  public resetActiveFile(): void {
    this.currentHandle = null;
    this.currentFileName = null;
  }

  /**
   * Save graph state. If an existing file handle exists (e.g., after initial save or open),
   * silently overwrites that file. Otherwise prompts the user for save location.
   */
  public async saveToFile(
    nodes: MapMindNode[],
    edges: MapMindEdge[],
    fileName = 'diagram.mapmind.json',
    forceSaveAs = false
  ): Promise<{ success: boolean; fileName: string; isNewFile: boolean }> {
    const payload: FileData = {
      version: '1.0.0',
      savedAt: new Date().toISOString(),
      name: this.currentFileName || fileName.replace(/\.mapmind\.json$/, ''),
      graph: {
        nodes,
        edges,
      },
      metadata: {
        app: 'MapMind',
        nodeCount: nodes.length,
        edgeCount: edges.length,
      },
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });

    const isOverwritingExisting = !forceSaveAs && this.currentHandle !== null;

    try {
      const handle = await fileSave(
        blob,
        {
          fileName: this.currentFileName || fileName,
          extensions: ['.mapmind.json', '.json'],
          description: 'MapMind Diagram Files (*.mapmind.json, *.json)',
        },
        forceSaveAs ? null : this.currentHandle
      );

      // Store the retained file handle for silent Ctrl+S overwrite
      if (handle) {
        this.currentHandle = handle as unknown as FileSystemFileHandle;
        if ('name' in handle && typeof handle.name === 'string') {
          this.currentFileName = handle.name;
        }
      }

      return {
        success: true,
        fileName: this.currentFileName || fileName,
        isNewFile: !isOverwritingExisting,
      };
    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError') {
        return { success: false, fileName: '', isNewFile: false };
      }
      console.error('Failed to save file:', err);
      throw err;
    }
  }

  /**
   * Open a saved .mapmind.json or .json diagram file from local disk.
   * Retains the file handle for subsequent Ctrl+S silent overwrite.
   */
  public async openFromFile(): Promise<{
    success: boolean;
    data?: FileData;
    fileName?: string;
  }> {
    try {
      const blob = await fileOpen({
        mimeTypes: ['application/json', 'text/plain'],
        extensions: ['.mapmind.json', '.json'],
        description: 'MapMind Diagram Files (*.mapmind.json, *.json)',
      });

      const text = await blob.text();
      const parsed = JSON.parse(text) as FileData | { nodes?: MapMindNode[]; edges?: MapMindEdge[] };

      // Retain handle if available on the blob
      if ('handle' in blob && blob.handle) {
        this.currentHandle = blob.handle as unknown as FileSystemFileHandle;
      }
      this.currentFileName = blob.name || 'diagram.mapmind.json';

      // Normalize older or raw ReactFlow formats
      let normalizedData: FileData;
      if ('graph' in parsed && parsed.graph?.nodes) {
        normalizedData = parsed as FileData;
      } else if ('nodes' in parsed && Array.isArray(parsed.nodes)) {
        normalizedData = {
          version: '1.0.0',
          savedAt: new Date().toISOString(),
          name: blob.name.replace(/\.[^/.]+$/, ''),
          graph: {
            nodes: parsed.nodes,
            edges: parsed.edges || [],
          },
        };
      } else {
        throw new Error('Invalid MapMind diagram JSON format');
      }

      return {
        success: true,
        data: normalizedData,
        fileName: this.currentFileName,
      };
    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError') {
        return { success: false };
      }
      console.error('Failed to open file:', err);
      throw err;
    }
  }
}

export const fileSystemManager = new FileSystemManager();
