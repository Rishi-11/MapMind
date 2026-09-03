import {
  AuthUser,
  SyncQueueItem,
  CloudNotebookRecord,
  CloudPageRecord,
} from '@/types/auth';
import {
  deriveEncryptionKey,
  deriveAuthVerifier,
  generateRandomSalt,
  generateSecureId,
} from '@/lib/crypto/clientCrypto';
import { getPersistentDeviceId } from '@/lib/sync/syncQueue';

/**
 * Sanitize and auto-correct Google Apps Script URLs
 * - Trims whitespace
 * - Replaces test /dev suffix with production /exec suffix
 * - Ensures /exec is present at the end of web app URLs
 */
export function sanitizeAppsScriptUrl(rawUrl: string): string {
  let url = (rawUrl || '').trim();
  if (!url) return '';

  // Remove multi-account indicators e.g. /u/0/ or /u/1/
  url = url.replace(/\/u\/\d+\//, '/');

  if (url.endsWith('/dev')) {
    url = url.slice(0, -4) + '/exec';
  }

  if (url.includes('/macros/s/') && !url.endsWith('/exec')) {
    url = url.replace(/\/+$/, '') + '/exec';
  }

  return url;
}

/**
 * Send POST request to Google Apps Script Web App
 */
async function callAppsScriptApi<T = any>(rawUrl: string, action: string, payload: any): Promise<T> {
  const url = sanitizeAppsScriptUrl(rawUrl);
  if (!url || !url.startsWith('https://script.google.com/')) {
    throw new Error('INVALID_URL: Web App URL must start with https://script.google.com/macros/s/.../exec');
  }

  if (url.includes('/edit') || url.includes('/projects/')) {
    throw new Error('You pasted the Apps Script Editor URL. Please click "Deploy -> New deployment -> Web app" and copy the Web App URL that ends in /exec.');
  }

  const body = JSON.stringify({
    action,
    payload,
    requestId: generateSecureId('req'),
    timestamp: new Date().toISOString(),
  });

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8', // Apps Script accepts text/plain to avoid CORS preflight issues
      },
      body,
      redirect: 'follow',
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('404 Not Found: Check that your Web App is deployed (Deploy -> New deployment -> Web app -> Anyone -> Deploy).');
      }
      throw new Error(`HTTP_${response.status}`);
    }

    const data = await response.json();
    return data as T;
  } catch (err: any) {
    if (!navigator.onLine) {
      throw new Error('OFFLINE: Your device is currently offline.');
    }
    if (err.name === 'TypeError' || err.message?.includes('fetch')) {
      throw new Error(
        'CONNECTION_FAILED: Could not reach Google Apps Script. Please verify in Apps Script: "Deploy -> Manage deployments -> Edit -> set "Who has access" to "Anyone" -> Deploy new version".'
      );
    }
    throw err;
  }
}

/**
 * Ping and verify Google Apps Script endpoint configuration
 */
export async function testAppsScriptEndpoint(url: string): Promise<{ success: boolean; schemaVersion?: number; error?: string }> {
  try {
    const res = await callAppsScriptApi(url, 'ping', {});
    if (res.success) {
      return { success: true, schemaVersion: res.schemaVersion };
    }
    return { success: false, error: res.message || res.error || 'PING_FAILED' };
  } catch (err: any) {
    return { success: false, error: err.message || 'CONNECTION_ERROR' };
  }
}

/**
 * Get user salt for login
 */
export async function fetchUserSalt(url: string, username: string): Promise<{ success: boolean; userId?: string; salt?: string; error?: string }> {
  try {
    const res = await callAppsScriptApi(url, 'getUserSalt', { username });
    return res;
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Register a new user account with zero-knowledge client-side encryption.
 * The raw password is NEVER sent to Google Sheets.
 */
export async function registerUserAccount(
  url: string,
  username: string,
  password: string
): Promise<{ success: boolean; user?: AuthUser; encryptionKey?: CryptoKey; authVerifier?: string; error?: string }> {
  try {
    const cleanUsername = username.trim().toLowerCase();
    const userId = generateSecureId('usr');
    const salt = generateRandomSalt();
    const deviceId = await getPersistentDeviceId();

    // 1. Derive client-side AES encryption key (kept in memory, never transmitted)
    const encryptionKey = await deriveEncryptionKey(password, salt);

    // 2. Derive domain-separated authentication verifier (transmitted to server)
    const authVerifier = await deriveAuthVerifier(password, salt);

    // 3. Register user with Google Apps Script
    const res = await callAppsScriptApi(url, 'register', {
      userId,
      username: cleanUsername,
      salt,
      authVerifier,
    });

    if (!res.success) {
      return { success: false, error: res.error };
    }

    const user: AuthUser = {
      userId,
      username: cleanUsername,
      salt,
      deviceId,
      appsScriptUrl: url,
      lastLoginAt: new Date().toISOString(),
    };

    return { success: true, user, encryptionKey, authVerifier };
  } catch (err: any) {
    return { success: false, error: err.message || 'REGISTRATION_FAILED' };
  }
}

/**
 * Login user: retrieves salt, derives auth verifier and encryption key locally, verifies credentials.
 */
export async function loginUserAccount(
  url: string,
  username: string,
  password: string
): Promise<{ success: boolean; user?: AuthUser; encryptionKey?: CryptoKey; authVerifier?: string; error?: string }> {
  try {
    const cleanUsername = username.trim().toLowerCase();
    
    // 1. Fetch user salt from Sheets
    const saltRes = await fetchUserSalt(url, cleanUsername);
    if (!saltRes.success || !saltRes.salt || !saltRes.userId) {
      return { success: false, error: saltRes.error || 'USER_NOT_FOUND' };
    }

    const salt = saltRes.salt;
    const userId = saltRes.userId;
    const deviceId = await getPersistentDeviceId();

    // 2. Derive encryption key & auth verifier locally in browser
    const encryptionKey = await deriveEncryptionKey(password, salt);
    const authVerifier = await deriveAuthVerifier(password, salt);

    // 3. Authenticate with server using auth verifier
    const loginRes = await callAppsScriptApi(url, 'login', {
      username: cleanUsername,
      authVerifier,
    });

    if (!loginRes.success) {
      return { success: false, error: loginRes.error || 'INVALID_CREDENTIALS' };
    }

    const user: AuthUser = {
      userId,
      username: cleanUsername,
      salt,
      deviceId,
      appsScriptUrl: url,
      lastLoginAt: new Date().toISOString(),
    };

    return { success: true, user, encryptionKey, authVerifier };
  } catch (err: any) {
    return { success: false, error: err.message || 'LOGIN_FAILED' };
  }
}

/**
 * Fetch all encrypted cloud records belonging to user
 */
export async function fetchUserCloudChanges(
  url: string,
  userId: string,
  authVerifier: string
): Promise<{ success: boolean; notebooks: CloudNotebookRecord[]; pages: CloudPageRecord[]; serverTime?: string; error?: string }> {
  try {
    const res = await callAppsScriptApi(url, 'fetchChanges', {
      userId,
      authVerifier,
    });
    return res;
  } catch (err: any) {
    return { success: false, notebooks: [], pages: [], error: err.message };
  }
}

/**
 * Push a batch of pending encrypted sync operations to Google Sheets.
 * Automatically chunks large queues into batches of 15 to stay within Apps Script timeout limits.
 */
export async function pushSyncOperations(
  url: string,
  userId: string,
  authVerifier: string,
  deviceId: string,
  operations: SyncQueueItem[]
): Promise<{ success: boolean; processedRequestIds: string[]; conflicts: any[]; serverTime?: string; error?: string }> {
  if (operations.length === 0) {
    return { success: true, processedRequestIds: [], conflicts: [] };
  }

  const allProcessed: string[] = [];
  const allConflicts: any[] = [];
  const BATCH_SIZE = 15;

  for (let i = 0; i < operations.length; i += BATCH_SIZE) {
    const chunk = operations.slice(i, i + BATCH_SIZE);
    try {
      const res = await callAppsScriptApi(url, 'sync', {
        userId,
        authVerifier,
        deviceId,
        operations: chunk,
      });

      if (!res.success) {
        return {
          success: false,
          processedRequestIds: allProcessed,
          conflicts: allConflicts,
          error: res.error || 'SYNC_FAILED',
        };
      }

      if (res.processedRequestIds) {
        allProcessed.push(...res.processedRequestIds);
      }
      if (res.conflicts) {
        allConflicts.push(...res.conflicts);
      }
    } catch (err: any) {
      return {
        success: false,
        processedRequestIds: allProcessed,
        conflicts: allConflicts,
        error: err.message || 'NETWORK_ERROR',
      };
    }
  }

  return {
    success: true,
    processedRequestIds: allProcessed,
    conflicts: allConflicts,
    serverTime: new Date().toISOString(),
  };
}
