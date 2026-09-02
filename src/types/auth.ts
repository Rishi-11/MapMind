/**
 * Authentication, Zero-Knowledge Encryption, and Cloud Synchronization Types
 */

export interface AuthUser {
  userId: string;
  username: string;
  salt: string; // Hex or base64 encoded salt for key derivation
  deviceId: string;
  appsScriptUrl: string;
  lastLoginAt: string;
}

export type SyncStatusState =
  | 'local_saved'
  | 'syncing'
  | 'cloud_saved'
  | 'offline_waiting'
  | 'conflict'
  | 'error';

export interface SyncStatusInfo {
  state: SyncStatusState;
  pendingCount: number;
  lastSyncedAt: string | null;
  errorMessage?: string;
}

export interface EncryptedCryptoPayload {
  version: number;
  algorithm: 'AES-256-GCM';
  kdf: 'PBKDF2-HMAC-SHA256';
  iterations: number;
  iv: string; // Base64 encoded 12-byte IV
  ciphertext: string; // Base64 encoded ciphertext + auth tag
}

export type SyncOperationType =
  | 'CREATE_PAGE'
  | 'UPDATE_PAGE'
  | 'DELETE_PAGE'
  | 'CREATE_NOTEBOOK'
  | 'UPDATE_NOTEBOOK'
  | 'DELETE_NOTEBOOK'
  | 'FULL_SYNC';

export interface SyncQueueItem {
  requestId: string;
  userId: string;
  deviceId: string;
  operation: SyncOperationType;
  objectId: string; // page_id or notebook_id
  baseVersion: number;
  timestamp: string;
  encryptedPayload: string; // Serialized JSON string of EncryptedCryptoPayload
  retries: number;
}

export interface CloudNotebookRecord {
  notebook_id: string;
  user_id: string;
  encrypted_metadata: string;
  created_at: string;
  updated_at: string;
  version: number;
  device_id: string;
  deleted: boolean;
}

export interface CloudPageRecord {
  page_id: string;
  notebook_id: string;
  user_id: string;
  encrypted_content: string;
  created_at: string;
  updated_at: string;
  version: number;
  device_id: string;
  deleted: boolean;
}

export interface ConflictRecord {
  objectId: string;
  objectType: 'page' | 'notebook';
  localVersion: number;
  cloudVersion: number;
  localContent: any; // Decrypted local object
  cloudContent: any; // Decrypted cloud object
  cloudTimestamp: string;
  localTimestamp: string;
}

export interface CloudSyncSettings {
  appsScriptUrl: string;
  autoSyncEnabled: boolean;
  syncIntervalMs: number;
  lastSyncTimestamp?: string;
}
