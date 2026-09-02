/**
 * MapMind Google Apps Script Backend Database & Cloud Sync
 * Version: 1.0.0
 * 
 * End-to-End Zero-Knowledge Storage Architecture:
 * - All note content and notebook metadata is encrypted client-side in the user's browser using AES-256-GCM.
 * - This backend NEVER receives plaintext notes, master keys, or raw passwords.
 * - Every operation enforces server-side ownership verification and version-based conflict detection.
 */

const SCHEMA_VERSION = 1;
const RATE_LIMIT_MAX_PER_MINUTE = 120;

/**
 * Run this function once in the Apps Script Editor (Run -> setupDatabase)
 * to automatically initialize or upgrade the Google Spreadsheet schema.
 */
function setupDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Users Sheet
  getOrCreateSheet(ss, 'Users', [
    'user_id',
    'username',
    'salt',
    'auth_verifier',
    'created_at',
    'updated_at',
    'schema_version'
  ]);

  // 2. Notebooks Sheet
  getOrCreateSheet(ss, 'Notebooks', [
    'notebook_id',
    'user_id',
    'encrypted_metadata',
    'created_at',
    'updated_at',
    'version',
    'device_id',
    'deleted'
  ]);

  // 3. Pages Sheet
  getOrCreateSheet(ss, 'Pages', [
    'page_id',
    'notebook_id',
    'user_id',
    'encrypted_content',
    'created_at',
    'updated_at',
    'version',
    'device_id',
    'deleted'
  ]);

  // 4. Sync Sheet
  getOrCreateSheet(ss, 'Sync', [
    'user_id',
    'device_id',
    'last_sync',
    'schema_version',
    'updated_at'
  ]);

  Logger.log('MapMind Database setup completed successfully.');
}

function getOrCreateSheet(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  
  // Check headers
  const existingHeaders = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0];
  const isHeaderEmpty = !existingHeaders[0] || existingHeaders[0] === '';
  
  if (isHeaderEmpty) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.getRange(1, 1, 1, headers.length).setBackground('#f3f4f6');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/**
 * GET request handler for health checks and URL pinging
 */
function doGet(e) {
  return jsonResponse({
    success: true,
    status: 'MapMind Cloud Sync Web App Active',
    schemaVersion: SCHEMA_VERSION,
    serverTime: new Date().toISOString(),
  });
}

/**
 * Handle incoming API requests from MapMind Web App
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    // Acquire lock for 30s to prevent concurrent row corruption
    lock.waitLock(30000);

    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({ success: false, error: 'EMPTY_REQUEST_BODY' }, 400);
    }

    let request;
    try {
      request = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      return jsonResponse({ success: false, error: 'INVALID_JSON' }, 400);
    }

    const action = request.action;
    const payload = request.payload || {};
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // Auto-heal database schema if sheets are missing
    if (!ss.getSheetByName('Users') || !ss.getSheetByName('Notebooks') || !ss.getSheetByName('Pages')) {
      setupDatabase();
    }

    // Check rate limit
    if (payload.userId && isRateLimited(payload.userId)) {
      return jsonResponse({ success: false, error: 'RATE_LIMIT_EXCEEDED' }, 429);
    }

    switch (action) {
      case 'ping':
        return jsonResponse({
          success: true,
          serverTime: new Date().toISOString(),
          schemaVersion: SCHEMA_VERSION,
        });

      case 'register':
        return handleRegister(ss, payload);

      case 'login':
        return handleLogin(ss, payload);

      case 'getUserSalt':
        return handleGetUserSalt(ss, payload);

      case 'fetchChanges':
        return handleFetchChanges(ss, payload);

      case 'sync':
        return handleSync(ss, payload);

      default:
        return jsonResponse({ success: false, error: 'UNKNOWN_ACTION: ' + action }, 400);
    }
  } catch (err) {
    Logger.log('Error in doPost: ' + err.toString());
    return jsonResponse({ success: false, error: 'SERVER_ERROR', message: err.toString() }, 500);
  } finally {
    lock.releaseLock();
  }
}

function handleGetUserSalt(ss, payload) {
  const username = (payload.username || '').trim().toLowerCase();
  if (!username) {
    return jsonResponse({ success: false, error: 'INVALID_USERNAME' });
  }

  const usersSheet = ss.getSheetByName('Users');
  const data = usersSheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]).toLowerCase() === username) {
      return jsonResponse({
        success: true,
        userId: data[i][0],
        salt: data[i][2],
      });
    }
  }

  return jsonResponse({ success: false, error: 'USER_NOT_FOUND' });
}

function handleRegister(ss, payload) {
  const username = (payload.username || '').trim().toLowerCase();
  const userId = payload.userId;
  const salt = payload.salt;
  const authVerifier = payload.authVerifier;

  if (!username || username.length < 3 || username.length > 32) {
    return jsonResponse({ success: false, error: 'INVALID_USERNAME_LENGTH' });
  }
  if (!userId || !salt || !authVerifier) {
    return jsonResponse({ success: false, error: 'MISSING_REQUIRED_FIELDS' });
  }

  const usersSheet = ss.getSheetByName('Users');
  const data = usersSheet.getDataRange().getValues();

  // Check username uniqueness
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]).toLowerCase() === username) {
      return jsonResponse({ success: false, error: 'USERNAME_EXISTS' });
    }
  }

  const now = new Date().toISOString();
  usersSheet.appendRow([
    userId,
    username,
    salt,
    authVerifier,
    now,
    now,
    SCHEMA_VERSION
  ]);

  return jsonResponse({
    success: true,
    userId: userId,
    username: username,
    salt: salt,
  });
}

function handleLogin(ss, payload) {
  const username = (payload.username || '').trim().toLowerCase();
  const authVerifier = payload.authVerifier;

  if (!username || !authVerifier) {
    return jsonResponse({ success: false, error: 'MISSING_CREDENTIALS' });
  }

  const usersSheet = ss.getSheetByName('Users');
  const data = usersSheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]).toLowerCase() === username) {
      if (data[i][3] === authVerifier) {
        return jsonResponse({
          success: true,
          userId: data[i][0],
          username: data[i][1],
          salt: data[i][2],
        });
      } else {
        return jsonResponse({ success: false, error: 'INVALID_CREDENTIALS' });
      }
    }
  }

  return jsonResponse({ success: false, error: 'USER_NOT_FOUND' });
}

function verifyUserAuth(ss, userId, authVerifier) {
  if (!userId || !authVerifier) return false;
  const usersSheet = ss.getSheetByName('Users');
  if (!usersSheet) return false;
  const data = usersSheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === String(userId).trim() && String(data[i][3]).trim() === String(authVerifier).trim()) {
      return true;
    }
  }
  return false;
}

function handleFetchChanges(ss, payload) {
  const userId = payload.userId;
  const authVerifier = payload.authVerifier;

  if (!verifyUserAuth(ss, userId, authVerifier)) {
    return jsonResponse({ success: false, error: 'UNAUTHORIZED' }, 401);
  }

  // Fetch Notebooks for user
  const nbSheet = ss.getSheetByName('Notebooks');
  const nbData = nbSheet.getDataRange().getValues();
  const notebooks = [];
  for (let i = 1; i < nbData.length; i++) {
    if (nbData[i][1] === userId) {
      notebooks.push({
        notebook_id: nbData[i][0],
        user_id: nbData[i][1],
        encrypted_metadata: nbData[i][2],
        created_at: nbData[i][3],
        updated_at: nbData[i][4],
        version: Number(nbData[i][5]),
        device_id: nbData[i][6],
        deleted: Boolean(nbData[i][7]),
      });
    }
  }

  // Fetch Pages for user
  const pgSheet = ss.getSheetByName('Pages');
  const pgData = pgSheet.getDataRange().getValues();
  const pages = [];
  for (let i = 1; i < pgData.length; i++) {
    if (pgData[i][2] === userId) {
      pages.push({
        page_id: pgData[i][0],
        notebook_id: pgData[i][1],
        user_id: pgData[i][2],
        encrypted_content: pgData[i][3],
        created_at: pgData[i][4],
        updated_at: pgData[i][5],
        version: Number(pgData[i][6]),
        device_id: pgData[i][7],
        deleted: Boolean(pgData[i][8]),
      });
    }
  }

  return jsonResponse({
    success: true,
    notebooks: notebooks,
    pages: pages,
    serverTime: new Date().toISOString(),
  });
}

function handleSync(ss, payload) {
  const userId = payload.userId;
  const authVerifier = payload.authVerifier;
  const deviceId = payload.deviceId || 'unknown_device';
  const operations = payload.operations || [];

  if (!verifyUserAuth(ss, userId, authVerifier)) {
    return jsonResponse({ success: false, error: 'UNAUTHORIZED' }, 401);
  }

  const nbSheet = ss.getSheetByName('Notebooks');
  const pgSheet = ss.getSheetByName('Pages');
  const syncSheet = ss.getSheetByName('Sync');

  const conflicts = [];
  const processedOps = [];

  for (let i = 0; i < operations.length; i++) {
    const op = operations[i];
    
    // Authorization: User ID in operation MUST match authenticated user ID
    if (op.userId !== userId) {
      continue;
    }

    if (op.operation.includes('NOTEBOOK')) {
      const res = processNotebookOp(nbSheet, userId, deviceId, op);
      if (res.conflict) {
        conflicts.push(res.conflict);
      } else {
        processedOps.push(op.requestId);
      }
    } else if (op.operation.includes('PAGE')) {
      const res = processPageOp(pgSheet, userId, deviceId, op);
      if (res.conflict) {
        conflicts.push(res.conflict);
      } else {
        processedOps.push(op.requestId);
      }
    }
  }

  // Record sync event
  const now = new Date().toISOString();
  syncSheet.appendRow([userId, deviceId, now, SCHEMA_VERSION, now]);

  return jsonResponse({
    success: true,
    processedRequestIds: processedOps,
    conflicts: conflicts,
    serverTime: now,
  });
}

function processNotebookOp(sheet, userId, deviceId, op) {
  const data = sheet.getDataRange().getValues();
  let rowIndex = -1;
  let currentRecord = null;

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === op.objectId && data[i][1] === userId) {
      rowIndex = i + 1; // 1-indexed for Sheet API
      currentRecord = {
        notebook_id: data[i][0],
        user_id: data[i][1],
        encrypted_metadata: data[i][2],
        created_at: data[i][3],
        updated_at: data[i][4],
        version: Number(data[i][5]),
        device_id: data[i][6],
        deleted: Boolean(data[i][7]),
      };
      break;
    }
  }

  const now = new Date().toISOString();

  if (op.operation === 'CREATE_NOTEBOOK') {
    if (rowIndex > 0) {
      // Already exists, treat as update
      sheet.getRange(rowIndex, 3, 1, 6).setValues([[
        op.encryptedPayload,
        now,
        currentRecord.version + 1,
        deviceId,
        false,
        ''
      ]]);
    } else {
      sheet.appendRow([
        op.objectId,
        userId,
        op.encryptedPayload,
        now,
        now,
        1,
        deviceId,
        false
      ]);
    }
    return { success: true };
  }

  if (op.operation === 'UPDATE_NOTEBOOK') {
    if (rowIndex > 0) {
      // Check version conflict: only if another DIFFERENT device modified the cloud record
      const isDifferentDevice = currentRecord.device_id && currentRecord.device_id !== deviceId;
      if (isDifferentDevice && currentRecord.version > op.baseVersion && currentRecord.encrypted_metadata !== op.encryptedPayload) {
        return {
          conflict: {
            objectId: op.objectId,
            objectType: 'notebook',
            cloudVersion: currentRecord.version,
            localVersion: op.baseVersion,
            cloudEncryptedPayload: currentRecord.encrypted_metadata,
            cloudTimestamp: currentRecord.updated_at,
          }
        };
      }
      sheet.getRange(rowIndex, 3, 1, 5).setValues([[
        op.encryptedPayload,
        now,
        currentRecord.version + 1,
        deviceId,
        false
      ]]);
    } else {
      sheet.appendRow([
        op.objectId,
        userId,
        op.encryptedPayload,
        now,
        now,
        1,
        deviceId,
        false
      ]);
    }
    return { success: true };
  }

  if (op.operation === 'DELETE_NOTEBOOK') {
    if (rowIndex > 0) {
      sheet.getRange(rowIndex, 5, 1, 4).setValues([[
        now,
        currentRecord.version + 1,
        deviceId,
        true
      ]]);
    }
    return { success: true };
  }

  return { success: true };
}

function processPageOp(sheet, userId, deviceId, op) {
  const data = sheet.getDataRange().getValues();
  let rowIndex = -1;
  let currentRecord = null;

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === op.objectId && data[i][2] === userId) {
      rowIndex = i + 1;
      currentRecord = {
        page_id: data[i][0],
        notebook_id: data[i][1],
        user_id: data[i][2],
        encrypted_content: data[i][3],
        created_at: data[i][4],
        updated_at: data[i][5],
        version: Number(data[i][6]),
        device_id: data[i][7],
        deleted: Boolean(data[i][8]),
      };
      break;
    }
  }

  const now = new Date().toISOString();

  if (op.operation === 'CREATE_PAGE') {
    if (rowIndex > 0) {
      sheet.getRange(rowIndex, 4, 1, 6).setValues([[
        op.encryptedPayload,
        now,
        now,
        currentRecord.version + 1,
        deviceId,
        false
      ]]);
    } else {
      sheet.appendRow([
        op.objectId,
        op.notebookId || 'default',
        userId,
        op.encryptedPayload,
        now,
        now,
        1,
        deviceId,
        false
      ]);
    }
    return { success: true };
  }

  if (op.operation === 'UPDATE_PAGE') {
    if (rowIndex > 0) {
      // Conflict detection: only if another DIFFERENT device modified the cloud record
      const isDifferentDevice = currentRecord.device_id && currentRecord.device_id !== deviceId;
      if (isDifferentDevice && currentRecord.version > op.baseVersion && currentRecord.encrypted_content !== op.encryptedPayload) {
        return {
          conflict: {
            objectId: op.objectId,
            objectType: 'page',
            cloudVersion: currentRecord.version,
            localVersion: op.baseVersion,
            cloudEncryptedPayload: currentRecord.encrypted_content,
            cloudTimestamp: currentRecord.updated_at,
          }
        };
      }
      sheet.getRange(rowIndex, 4, 1, 6).setValues([[
        op.encryptedPayload,
        currentRecord.created_at,
        now,
        currentRecord.version + 1,
        deviceId,
        false
      ]]);
    } else {
      sheet.appendRow([
        op.objectId,
        op.notebookId || 'default',
        userId,
        op.encryptedPayload,
        now,
        now,
        1,
        deviceId,
        false
      ]);
    }
    return { success: true };
  }

  if (op.operation === 'DELETE_PAGE') {
    if (rowIndex > 0) {
      sheet.getRange(rowIndex, 6, 1, 4).setValues([[
        now,
        currentRecord.version + 1,
        deviceId,
        true
      ]]);
    }
    return { success: true };
  }

  return { success: true };
}

function isRateLimited(userId) {
  try {
    const cache = CacheService.getScriptCache();
    const key = 'rl_' + userId;
    const count = Number(cache.get(key) || 0);
    if (count > RATE_LIMIT_MAX_PER_MINUTE) {
      return true;
    }
    cache.put(key, String(count + 1), 60);
    return false;
  } catch {
    return false;
  }
}

function jsonResponse(obj, statusCode) {
  const output = ContentService.createTextOutput(JSON.stringify(obj));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}
