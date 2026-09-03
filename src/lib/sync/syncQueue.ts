import { openDB, IDBPDatabase } from 'idb';
import { SyncQueueItem, AuthUser } from '@/types/auth';
import { generateSecureId } from '@/lib/crypto/clientCrypto';

const SYNC_DB_NAME = 'mapmind_sync_db';
const SYNC_DB_VERSION = 1;
const QUEUE_STORE = 'sync_queue';
const META_STORE = 'sync_metadata';
const SESSION_STORE = 'auth_session';

const DEVICE_ID_KEY = 'persistent_device_id';
const ACTIVE_SESSION_KEY = 'current_auth_user';
const VERSION_MAP_KEY = 'object_version_map';

let syncDbPromise: Promise<IDBPDatabase> | null = null;

function getSyncDb(): Promise<IDBPDatabase> {
  if (!syncDbPromise) {
    syncDbPromise = openDB(SYNC_DB_NAME, SYNC_DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(QUEUE_STORE)) {
          const queue = db.createObjectStore(QUEUE_STORE, { keyPath: 'requestId' });
          queue.createIndex('by_user', 'userId');
          queue.createIndex('by_time', 'timestamp');
        }
        if (!db.objectStoreNames.contains(META_STORE)) {
          db.createObjectStore(META_STORE);
        }
        if (!db.objectStoreNames.contains(SESSION_STORE)) {
          db.createObjectStore(SESSION_STORE);
        }
      },
    });
  }
  return syncDbPromise;
}

/**
 * Get or initialize persistent Device ID (dev_...)
 */
export async function getPersistentDeviceId(): Promise<string> {
  const db = await getSyncDb();
  let devId = (await db.get(META_STORE, DEVICE_ID_KEY)) as string | undefined;
  if (!devId) {
    devId = generateSecureId('dev');
    await db.put(META_STORE, devId, DEVICE_ID_KEY);
  }
  return devId;
}

/**
 * Load current authenticated user session from local IndexedDB
 */
export async function getStoredAuthSession(): Promise<AuthUser | null> {
  const db = await getSyncDb();
  const session = (await db.get(SESSION_STORE, ACTIVE_SESSION_KEY)) as AuthUser | undefined;
  return session || null;
}

/**
 * Persist or clear authenticated user session
 */
export async function setStoredAuthSession(session: AuthUser | null): Promise<void> {
  const db = await getSyncDb();
  if (session) {
    await db.put(SESSION_STORE, session, ACTIVE_SESSION_KEY);
  } else {
    await db.delete(SESSION_STORE, ACTIVE_SESSION_KEY);
  }
}

/**
 * Enqueue a sync operation for background or immediate synchronization.
 * Automatically deduplicates and collapses rapid intermediate updates for the same object.
 */
export async function enqueueSyncOperation(
  item: Omit<SyncQueueItem, 'requestId' | 'retries'>
): Promise<SyncQueueItem> {
  const db = await getSyncDb();

  // If there is already a pending UPDATE operation for this object, replace it with latest payload
  if (item.operation === 'UPDATE_PAGE' || item.operation === 'UPDATE_NOTEBOOK') {
    const existing = (await db.getAllFromIndex(QUEUE_STORE, 'by_user', item.userId)) as SyncQueueItem[];
    const match = existing.find((op) => op.objectId === item.objectId && op.operation === item.operation);
    if (match) {
      const updated: SyncQueueItem = {
        ...match,
        timestamp: item.timestamp,
        encryptedPayload: item.encryptedPayload,
        baseVersion: Math.max(match.baseVersion, item.baseVersion),
      };
      await db.put(QUEUE_STORE, updated);
      return updated;
    }
  }

  const fullItem: SyncQueueItem = {
    ...item,
    requestId: generateSecureId('req'),
    retries: 0,
  };
  await db.put(QUEUE_STORE, fullItem);
  return fullItem;
}

/**
 * Get all pending sync operations for a user, sorted chronologically
 */
export async function getPendingSyncOperations(userId: string): Promise<SyncQueueItem[]> {
  const db = await getSyncDb();
  const all = (await db.getAllFromIndex(QUEUE_STORE, 'by_user', userId)) as SyncQueueItem[];
  return all.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

/**
 * Mark sync operations as successfully processed by removing them from queue
 */
export async function removeProcessedSyncOps(requestIds: string[]): Promise<void> {
  const db = await getSyncDb();
  const tx = db.transaction(QUEUE_STORE, 'readwrite');
  for (const id of requestIds) {
    await tx.store.delete(id);
  }
  await tx.done;
}

/**
 * Increment retry count on failed attempt
 */
export async function incrementOpRetries(requestIds: string[]): Promise<void> {
  const db = await getSyncDb();
  const tx = db.transaction(QUEUE_STORE, 'readwrite');
  for (const id of requestIds) {
    const item = (await tx.store.get(id)) as SyncQueueItem | undefined;
    if (item) {
      item.retries += 1;
      await tx.store.put(item);
    }
  }
  await tx.done;
}

/**
 * Get the version map (maps object_id to known cloud base version number)
 */
export async function getLocalObjectVersions(): Promise<Record<string, number>> {
  const db = await getSyncDb();
  const map = (await db.get(META_STORE, VERSION_MAP_KEY)) as Record<string, number> | undefined;
  return map || {};
}

/**
 * Update version numbers for objects after successful sync
 */
export async function updateLocalObjectVersions(updates: Record<string, number>): Promise<void> {
  const db = await getSyncDb();
  const current = await getLocalObjectVersions();
  const merged = { ...current, ...updates };
  await db.put(META_STORE, merged, VERSION_MAP_KEY);
}

/**
 * Clear the sync queue (e.g. on full wipe or logout)
 */
export async function clearSyncQueue(): Promise<void> {
  const db = await getSyncDb();
  await db.clear(QUEUE_STORE);
}

/**
 * Explicitly close and release the sync database connection handle
 */
export async function closeAndWipeSyncDb(): Promise<void> {
  if (syncDbPromise) {
    try {
      const db = await syncDbPromise;
      db.close();
    } catch (e) {}
    syncDbPromise = null;
  }
}
