type StatusListener = (isGenerating: boolean, sessionId: string | null) => void;

class ResultGenerationStatusStore {
  private isGenerating: boolean = false;
  private currentSessionId: string | null = null;
  private listeners: Set<StatusListener> = new Set();

  setGenerating(sessionId: string) {
    this.isGenerating = true;
    this.currentSessionId = sessionId;
    this.notifyListeners();
  }

  setComplete(sessionId: string) {
    if (this.currentSessionId === sessionId) {
      this.isGenerating = false;
      this.currentSessionId = null;
      this.notifyListeners();
    }
  }

  isCurrentlyGenerating(sessionId?: string): boolean {
    if (sessionId) {
      return this.isGenerating && this.currentSessionId === sessionId;
    }
    return this.isGenerating;
  }

  getCurrentSessionId(): string | null {
    return this.currentSessionId;
  }

  subscribe(listener: StatusListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => {
      listener(this.isGenerating, this.currentSessionId);
    });
  }
}

export const resultGenerationStatus = new ResultGenerationStatusStore();

