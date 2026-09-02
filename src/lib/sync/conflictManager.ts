import { ConflictRecord, AuthUser, SyncQueueItem } from '@/types/auth';
import { Workspace, Page, Notebook } from '@/types/notebook';
import { encryptData, generateSecureId } from '@/lib/crypto/clientCrypto';
import { enqueueSyncOperation } from '@/lib/sync/syncQueue';

/**
 * Apply cloud version to local workspace (Keep Cloud Version)
 */
export function applyCloudVersionToWorkspace(
  workspace: Workspace,
  conflict: ConflictRecord
): Workspace {
  if (conflict.objectType === 'page') {
    const cloudPage = conflict.cloudContent as Page;
    if (!cloudPage) return workspace;

    const newNotebooks = workspace.notebooks.map((nb) => {
      const newSections = nb.sections.map((sec) => {
        const pageIdx = sec.pages.findIndex((p) => p.id === cloudPage.id);
        if (pageIdx >= 0) {
          const updatedPages = [...sec.pages];
          updatedPages[pageIdx] = { ...cloudPage };
          return { ...sec, pages: updatedPages };
        }
        return sec;
      });
      return { ...nb, sections: newSections };
    });

    return { ...workspace, notebooks: newNotebooks };
  }

  if (conflict.objectType === 'notebook') {
    const cloudNb = conflict.cloudContent as Notebook;
    if (!cloudNb) return workspace;

    const nbIdx = workspace.notebooks.findIndex((nb) => nb.id === cloudNb.id);
    if (nbIdx >= 0) {
      const newNotebooks = [...workspace.notebooks];
      newNotebooks[nbIdx] = { ...cloudNb };
      return { ...workspace, notebooks: newNotebooks };
    }
  }

  return workspace;
}

/**
 * Force local version to cloud by creating a new sync operation with baseVersion = cloudVersion
 * (Keep My Local Version)
 */
export async function forceLocalVersionToCloud(
  conflict: ConflictRecord,
  encryptionKey: CryptoKey,
  user: AuthUser
): Promise<SyncQueueItem> {
  const encrypted = await encryptData(conflict.localContent, encryptionKey);
  
  return await enqueueSyncOperation({
    userId: user.userId,
    deviceId: user.deviceId,
    operation: conflict.objectType === 'page' ? 'UPDATE_PAGE' : 'UPDATE_NOTEBOOK',
    objectId: conflict.objectId,
    baseVersion: conflict.cloudVersion, // Set base to current cloud version so server accepts it
    timestamp: new Date().toISOString(),
    encryptedPayload: JSON.stringify(encrypted),
  });
}

/**
 * Duplicate both versions to avoid any data loss:
 * Local page is renamed to "... (Local Copy)" and cloud version is inserted alongside it.
 */
export function duplicateBothVersionsInWorkspace(
  workspace: Workspace,
  conflict: ConflictRecord
): Workspace {
  if (conflict.objectType === 'page') {
    const cloudPage = conflict.cloudContent as Page;
    const localPage = conflict.localContent as Page;
    if (!cloudPage || !localPage) return workspace;

    const renamedLocalPage: Page = {
      ...localPage,
      id: generateSecureId('pg'),
      title: `${localPage.title} (Local Copy)`,
      updatedAt: new Date().toISOString(),
    };

    const newNotebooks = workspace.notebooks.map((nb) => {
      const newSections = nb.sections.map((sec) => {
        const pageIdx = sec.pages.findIndex((p) => p.id === localPage.id);
        if (pageIdx >= 0) {
          const updatedPages = [...sec.pages];
          updatedPages[pageIdx] = { ...cloudPage }; // Keep original ID for cloud page
          updatedPages.push(renamedLocalPage);      // Add local duplicate
          return { ...sec, pages: updatedPages };
        }
        return sec;
      });
      return { ...nb, sections: newSections };
    });

    return { ...workspace, notebooks: newNotebooks };
  }

  return applyCloudVersionToWorkspace(workspace, conflict);
}
