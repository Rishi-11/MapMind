import { Workspace } from '@/types/notebook';

export const BACKUP_FORMAT = 'MapMindNotes';
export const CURRENT_BACKUP_VERSION = 1;
export const BACKUP_SECURITY_WARNING =
  'IMPORTANT NOTICE: This backup file is stored as UNENCRYPTED PLAINTEXT. Keep it in a secure location on your device. It can be used to recover all your notes and mind maps if you lose your cloud encryption password.';

export interface PlaintextBackupFile {
  format: 'MapMindNotes';
  version: number;
  exportedAt: string;
  app: string;
  warning: string;
  workspace: Workspace;
}

/**
 * Creates a versioned unencrypted plaintext backup bundle for the user's local disk
 */
export function createPlaintextBackup(workspace: Workspace): PlaintextBackupFile {
  return {
    format: BACKUP_FORMAT,
    version: CURRENT_BACKUP_VERSION,
    app: 'MapMind Knowledge Suite',
    exportedAt: new Date().toISOString(),
    warning: BACKUP_SECURITY_WARNING,
    workspace: { ...workspace },
  };
}

/**
 * Downloads a plaintext .mapnote / .json backup file to the user's machine
 */
export function exportPlaintextBackupFile(workspace: Workspace): void {
  const backup = createPlaintextBackup(workspace);
  const jsonStr = JSON.stringify(backup, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  
  const safeName = workspace.name.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  const dateStr = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `${safeName}-backup-${dateStr}.mapnote`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Validates, migrates, and imports a plaintext backup file
 */
export function parseAndMigrateBackup(jsonString: string): Workspace {
  let parsed: any;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    throw new Error('INVALID_BACKUP_FORMAT: File is not valid JSON.');
  }

  // Handle direct legacy Workspace exports (format version 0)
  if (parsed.notebooks && Array.isArray(parsed.notebooks)) {
    return parsed as Workspace;
  }

  // Handle MapMindNotes versioned backup
  if (parsed.format !== BACKUP_FORMAT || !parsed.workspace) {
    throw new Error('UNRECOGNIZED_BACKUP_FORMAT: Missing MapMindNotes signature.');
  }

  const version = Number(parsed.version || 1);

  if (version === 1) {
    return parsed.workspace as Workspace;
  }

  if (version > CURRENT_BACKUP_VERSION) {
    throw new Error(`UNSUPPORTED_FUTURE_VERSION: Backup version ${version} is newer than current app version ${CURRENT_BACKUP_VERSION}. Please update MapMind.`);
  }

  // Default fallback migration
  return parsed.workspace as Workspace;
}
