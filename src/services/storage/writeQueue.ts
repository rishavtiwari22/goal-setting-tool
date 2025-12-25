import type { WriteQueueItem } from '../firebase/types';

const MAX_QUEUE_SIZE = 100;
const QUEUE_STORAGE_KEY = 'firebase_write_queue';

export class WriteQueue {
  private queue: WriteQueueItem[] = [];

  constructor() {
    this.loadFromStorage();
  }

  enqueue(item: WriteQueueItem): void {
    if (this.queue.length >= MAX_QUEUE_SIZE) {
      this.queue.shift();
    }

    const existingIndex = this.queue.findIndex(
      (q) => q.sessionId === item.sessionId && q.operation === item.operation
    );

    if (existingIndex >= 0) {
      this.queue[existingIndex] = item;
    } else {
      this.queue.push(item);
    }

    this.saveToStorage();
  }

  dequeue(): WriteQueueItem | undefined {
    const item = this.queue.shift();
    if (item) {
      this.saveToStorage();
    }
    return item;
  }

  peek(): WriteQueueItem | undefined {
    return this.queue[0];
  }

  isEmpty(): boolean {
    return this.queue.length === 0;
  }

  size(): number {
    return this.queue.length;
  }

  clear(): void {
    this.queue = [];
    this.saveToStorage();
  }

  getItemsBySession(sessionId: string): WriteQueueItem[] {
    return this.queue.filter((item) => item.sessionId === sessionId);
  }

  getCriticalItems(): WriteQueueItem[] {
    return this.queue.filter((item) => item.priority === 'critical');
  }

  getNormalItems(): WriteQueueItem[] {
    return this.queue.filter((item) => item.priority === 'normal');
  }

  removeItem(sessionId: string, operation: WriteQueueItem['operation']): void {
    const index = this.queue.findIndex(
      (item) => item.sessionId === sessionId && item.operation === operation
    );
    if (index >= 0) {
      this.queue.splice(index, 1);
      this.saveToStorage();
    }
  }

  batchDequeue(count: number): WriteQueueItem[] {
    const items = this.queue.splice(0, Math.min(count, this.queue.length));
    if (items.length > 0) {
      this.saveToStorage();
    }
    return items;
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error('Failed to save write queue to storage:', error);
    }
  }

  private loadFromStorage(): void {
    try {
      const data = localStorage.getItem(QUEUE_STORAGE_KEY);
      if (data) {
        this.queue = JSON.parse(data) as WriteQueueItem[];
        if (this.queue.length > MAX_QUEUE_SIZE) {
          this.queue = this.queue.slice(-MAX_QUEUE_SIZE);
        }
      }
    } catch (error) {
      console.error('Failed to load write queue from storage:', error);
      this.queue = [];
    }
  }
}

export const writeQueue = new WriteQueue();

