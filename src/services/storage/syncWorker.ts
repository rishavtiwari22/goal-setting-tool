import { writeQueue } from './writeQueue';
import { batchWriteQueueItems } from './firebaseStorage';
import {
  markSynced,
  setSyncInProgress,
  incrementFailedWrites,
  decrementPendingWrites,
} from './syncStatus';
import type { WriteQueueItem } from '../firebase/types';

const DEBOUNCE_INTERVAL = 5000;
const MAX_BATCH_SIZE = 10;

class SyncWorker {
  private debounceTimer: NodeJS.Timeout | null = null;
  private isOnline: boolean = true;
  private isSyncing: boolean = false;

  constructor() {
    this.setupNetworkListeners();
    this.setupVisibilityListeners();
    this.setupBeforeUnloadListener();
  }

  private setupNetworkListeners(): void {
    if (typeof window === 'undefined') return;

    this.isOnline = navigator.onLine;

    window.addEventListener('online', () => {
      this.isOnline = true;
      this.triggerSync();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = null;
      }
    });
  }

  private setupVisibilityListeners(): void {
    if (typeof document === 'undefined') return;

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && this.isOnline) {
        this.flushSync();
      }
    });
  }

  private setupBeforeUnloadListener(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('beforeunload', () => {
      if (this.isOnline && !this.isSyncing) {
        this.flushSync();
      }
    });
  }

  private async processBatch(items: WriteQueueItem[]): Promise<void> {
    if (items.length === 0) return;

    const criticalItems = items.filter((item) => item.priority === 'critical');
    const normalItems = items.filter((item) => item.priority === 'normal');

    const itemsToProcess = [...criticalItems, ...normalItems].slice(0, MAX_BATCH_SIZE);

    for (const item of itemsToProcess) {
      setSyncInProgress(item.sessionId, true);
      decrementPendingWrites(item.sessionId);
    }

    try {
      await batchWriteQueueItems(itemsToProcess);

      for (const item of itemsToProcess) {
        markSynced(item.sessionId);
        writeQueue.removeItem(item.sessionId, item.operation);
      }
    } catch (error) {
      console.error('Batch sync failed:', error);
      for (const item of itemsToProcess) {
        incrementFailedWrites(item.sessionId);
        setSyncInProgress(item.sessionId, false);
      }
    }
  }

  private async sync(): Promise<void> {
    if (!this.isOnline || this.isSyncing) {
      return;
    }

    if (writeQueue.isEmpty()) {
      return;
    }

    this.isSyncing = true;

    try {
      const criticalItems = writeQueue.getCriticalItems();
      const normalItems = writeQueue.getNormalItems();

      if (criticalItems.length > 0) {
        await this.processBatch(criticalItems.slice(0, MAX_BATCH_SIZE));
      }

      if (normalItems.length > 0 && !writeQueue.isEmpty()) {
        const batch = normalItems.slice(0, MAX_BATCH_SIZE);
        await this.processBatch(batch);
      }
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      this.isSyncing = false;

      if (!writeQueue.isEmpty() && this.isOnline) {
        this.scheduleSync();
      }
    }
  }

  private scheduleSync(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.sync();
      this.debounceTimer = null;
    }, DEBOUNCE_INTERVAL);
  }

  triggerSync(): void {
    if (!this.isOnline) {
      return;
    }

    if (this.isSyncing) {
      this.scheduleSync();
      return;
    }

    this.scheduleSync();
  }

  async flushSync(): Promise<void> {
    if (!this.isOnline || this.isSyncing) {
      return;
    }

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    this.isSyncing = true;

    try {
      while (!writeQueue.isEmpty()) {
        const criticalItems = writeQueue.getCriticalItems();
        const normalItems = writeQueue.getNormalItems();
        const allItems = [...criticalItems, ...normalItems].slice(0, MAX_BATCH_SIZE);

        if (allItems.length === 0) break;

        await this.processBatch(allItems);
      }
    } catch (error) {
      console.error('Flush sync failed:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  isOnlineStatus(): boolean {
    return this.isOnline;
  }
}

export const syncWorker = new SyncWorker();

