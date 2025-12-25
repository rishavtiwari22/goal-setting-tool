import type { SyncStatus } from '../firebase/types';

const SYNC_STATUS_PREFIX = 'sync_status_';

export function getSyncStatusKey(sessionId: string): string {
  return `${SYNC_STATUS_PREFIX}${sessionId}`;
}

export function getSyncStatus(sessionId: string): SyncStatus | null {
  try {
    const key = getSyncStatusKey(sessionId);
    const data = localStorage.getItem(key);
    if (!data) return null;
    return JSON.parse(data) as SyncStatus;
  } catch (error) {
    console.error('Failed to load sync status:', error);
    return null;
  }
}

export function setSyncStatus(sessionId: string, status: Partial<SyncStatus>): void {
  try {
    const key = getSyncStatusKey(sessionId);
    const existing = getSyncStatus(sessionId) || {
      sessionId,
      lastSyncedAt: '',
      pendingWrites: 0,
      failedWrites: 0,
      syncInProgress: false,
      fieldSyncStatus: {},
    };

    const updated: SyncStatus = {
      ...existing,
      ...status,
      sessionId,
    };

    localStorage.setItem(key, JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to save sync status:', error);
  }
}

export function updateSyncStatus(
  sessionId: string,
  updates: Partial<SyncStatus>
): void {
  setSyncStatus(sessionId, updates);
}

export function markFieldSynced(sessionId: string, field: string): void {
  const status = getSyncStatus(sessionId);
  if (status) {
    const fieldSyncStatus = { ...status.fieldSyncStatus };
    fieldSyncStatus[field] = true;
    updateSyncStatus(sessionId, { fieldSyncStatus });
  }
}

export function markFieldUnsynced(sessionId: string, field: string): void {
  const status = getSyncStatus(sessionId);
  if (status) {
    const fieldSyncStatus = { ...status.fieldSyncStatus };
    fieldSyncStatus[field] = false;
    updateSyncStatus(sessionId, { fieldSyncStatus });
  }
}

export function clearSyncStatus(sessionId: string): void {
  try {
    const key = getSyncStatusKey(sessionId);
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Failed to clear sync status:', error);
  }
}

export function incrementPendingWrites(sessionId: string): void {
  const status = getSyncStatus(sessionId);
  if (status) {
    updateSyncStatus(sessionId, {
      pendingWrites: status.pendingWrites + 1,
    });
  } else {
    setSyncStatus(sessionId, { pendingWrites: 1 });
  }
}

export function decrementPendingWrites(sessionId: string): void {
  const status = getSyncStatus(sessionId);
  if (status && status.pendingWrites > 0) {
    updateSyncStatus(sessionId, {
      pendingWrites: status.pendingWrites - 1,
    });
  }
}

export function incrementFailedWrites(sessionId: string): void {
  const status = getSyncStatus(sessionId);
  if (status) {
    updateSyncStatus(sessionId, {
      failedWrites: status.failedWrites + 1,
    });
  } else {
    setSyncStatus(sessionId, { failedWrites: 1 });
  }
}

export function markSynced(sessionId: string): void {
  updateSyncStatus(sessionId, {
    lastSyncedAt: new Date().toISOString(),
    pendingWrites: 0,
    syncInProgress: false,
  });
}

export function setSyncInProgress(sessionId: string, inProgress: boolean): void {
  updateSyncStatus(sessionId, { syncInProgress: inProgress });
}

