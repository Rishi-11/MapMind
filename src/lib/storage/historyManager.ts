import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { HistorySnapshot } from '@/types/history';
import { MapMindNode, MapMindEdge } from '@/types/graph';

interface MapMindDB extends DBSchema {
  snapshots: {
    key: string;
    value: HistorySnapshot;
    indexes: {
      'by-timestamp': number;
      'by-trigger': string;
    };
  };
  settings: {
    key: string;
    value: unknown;
  };
}

const DB_NAME = 'mapmind-timemachine-db';
const DB_VERSION = 1;
const MAX_SNAPSHOTS = 100;

class HistoryManager {
  private dbPromise: Promise<IDBPDatabase<MapMindDB>> | null = null;

  private getDB(): Promise<IDBPDatabase<MapMindDB>> {
    if (!this.dbPromise) {
      this.dbPromise = openDB<MapMindDB>(DB_NAME, DB_VERSION, {
        upgrade(db) {
          if (!db.objectStoreNames.contains('snapshots')) {
            const store = db.createObjectStore('snapshots', { keyPath: 'id' });
            store.createIndex('by-timestamp', 'timestamp');
            store.createIndex('by-trigger', 'trigger');
          }
          if (!db.objectStoreNames.contains('settings')) {
            db.createObjectStore('settings');
          }
        },
      });
    }
    return this.dbPromise;
  }

  /**
   * Save a new snapshot of the canvas into IndexedDB
   */
  public async saveSnapshot(
    nodes: MapMindNode[],
    edges: MapMindEdge[],
    trigger: 'auto-save' | 'manual-save' | 'layout-change' | 'import' = 'auto-save',
    customName?: string
  ): Promise<HistorySnapshot> {
    const db = await this.getDB();
    const now = Date.now();
    const dateObj = new Date(now);

    const snapshot: HistorySnapshot = {
      id: `snap_${now}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: now,
      formattedTime: dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      name: customName || `${trigger === 'auto-save' ? 'Auto-Save' : 'Manual'} (${dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`,
      nodeCount: nodes.length,
      edgeCount: edges.length,
      state: {
        // Deep clone state to prevent mutation issues
        nodes: JSON.parse(JSON.stringify(nodes)),
        edges: JSON.parse(JSON.stringify(edges)),
      },
      trigger,
    };

    await db.put('snapshots', snapshot);
    await this.pruneOldSnapshots();
    return snapshot;
  }

  /**
   * Fetch all snapshots ordered by timestamp descending (newest first)
   */
  public async getAllSnapshots(): Promise<HistorySnapshot[]> {
    const db = await this.getDB();
    const snapshots = await db.getAllFromIndex('snapshots', 'by-timestamp');
    return snapshots.reverse();
  }

  /**
   * Get single snapshot by ID
   */
  public async getSnapshot(id: string): Promise<HistorySnapshot | undefined> {
    const db = await this.getDB();
    return db.get('snapshots', id);
  }

  /**
   * Delete a single snapshot
   */
  public async deleteSnapshot(id: string): Promise<void> {
    const db = await this.getDB();
    await db.delete('snapshots', id);
  }

  /**
   * Clear all history snapshots
   */
  public async clearAllSnapshots(): Promise<void> {
    const db = await this.getDB();
    await db.clear('snapshots');
  }

  /**
   * Keep database size bounded by removing the oldest snapshots past limit
   */
  private async pruneOldSnapshots(): Promise<void> {
    try {
      const db = await this.getDB();
      const all = await db.getAllFromIndex('snapshots', 'by-timestamp');
      if (all.length > MAX_SNAPSHOTS) {
        const excess = all.length - MAX_SNAPSHOTS;
        const tx = db.transaction('snapshots', 'readwrite');
        for (let i = 0; i < excess; i++) {
          await tx.store.delete(all[i].id);
        }
        await tx.done;
      }
    } catch (e) {
      console.warn('Error during snapshot pruning:', e);
    }
  }
}

export const historyManager = new HistoryManager();
