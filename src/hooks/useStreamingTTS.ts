import { useState, useRef, useCallback, useEffect } from 'react';
import {
  DEFAULT_PIPER_BACKEND,
  preparePiperVoice,
  streamTokensToSpeech,
  type TtsBackend,
} from "../lib/piper";

interface UseStreamingTTSProps {
  enabled: boolean;
  onStatusChange?: (status: string) => void;
  onStartSpeaking?: () => void;
  onStopSpeaking?: () => void;
}

export function useStreamingTTS({
  enabled,
  onStatusChange,
  onStartSpeaking,
  onStopSpeaking
}: UseStreamingTTSProps) {
  const [isReady, setIsReady] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const activeHandlesRef = useRef<any[]>([]);
  const preparePromiseRef = useRef<Promise<void> | null>(null);
  const voiceReadyRef = useRef(false);
  const pollTimeoutRef = useRef<number | null>(null);

  // Internal state for buffering and queueing
  const stateRef = useRef({
    textBuffer: '',
    isActive: false,
    ttsQueue: [] as string[],
    isProcessing: false,
  });

  const createTokenIterable = (input: string): Iterable<string> => {
    const trimmed = input?.trim();
    if (!trimmed) return [];
    return trimmed.split(/(\s+)/).filter((segment) => segment.length > 0);
  };

  const ensureReady = useCallback(async (backend: TtsBackend = DEFAULT_PIPER_BACKEND) => {
    if (voiceReadyRef.current) return;
    if (preparePromiseRef.current) return preparePromiseRef.current;

    const preparation = (async () => {
      onStatusChange?.('Ensuring Piper voice is cached...');
      try {
        await preparePiperVoice((s: string) => onStatusChange?.(s), backend);
        setIsReady(true);
        voiceReadyRef.current = true;
        onStatusChange?.('Voice ready');
      } catch (error) {
        console.error("TTS Prepare failed", error);
        throw error;
      }
    })();

    preparePromiseRef.current = preparation;
    await preparation;
    preparePromiseRef.current = null;
  }, [onStatusChange]);

  const synthAndPlayChunk = async (text: string) => {
    // Trigger start callback only on the first active chunk
    if (!stateRef.current.isActive) {
      stateRef.current.isActive = true;
      setIsSpeaking(true);
      onStartSpeaking?.();
    }

    try {
      await ensureReady();
      const tokens = createTokenIterable(text);

      const handle = await streamTokensToSpeech(tokens, {
        backend: DEFAULT_PIPER_BACKEND,
        autoPrepare: false,
        onStatus: (s: string) => onStatusChange?.(s),
        onSentence: () => { },
        onSynthesisTime: () => { },
        onPlayFinished: () => { },
      });

      // Track all active handles
      activeHandlesRef.current.push(handle);
      await handle.finished;

      // Remove from active handles when done
      activeHandlesRef.current = activeHandlesRef.current.filter(h => h !== handle);
    } catch (err) {
      console.error(`TTS chunk error: ${String(err)}`);
    }
  };

  const processQueue = async () => {
    const state = stateRef.current;
    if (state.isProcessing || state.ttsQueue.length === 0) return;

    state.isProcessing = true;

    try {
      while (state.ttsQueue.length > 0) {
        const text = state.ttsQueue.shift();
        if (text) await synthAndPlayChunk(text);
      }
    } finally {
      state.isProcessing = false;
    }
  };

  const addChunk = useCallback((chunk: string) => {
    if (!enabled) return;

    const state = stateRef.current;
    state.textBuffer += chunk;

    // Process sentences with safety limit for long text
    while (state.textBuffer.length > 0) {
      const match = state.textBuffer.match(/^([\s\S]*?[.!?])(\s|$)/);

      if (match) {
        // Normal sentence extraction
        const sentence = match[1].trim();
        state.textBuffer = state.textBuffer.slice(match[0].length);
        if (sentence) {
          state.ttsQueue.push(sentence);
        }
      } else if (state.textBuffer.length > 500) {
        // Force break after 500 chars to prevent backtracking
        const chunk = state.textBuffer.slice(0, 500);
        state.textBuffer = state.textBuffer.slice(500);
        state.ttsQueue.push(chunk);
      } else {
        // Wait for more text
        break;
      }
    }

    processQueue();
  }, [enabled]);

  const finishStreaming = useCallback(() => {
    const state = stateRef.current;

    // Flush remaining buffer
    if (state.textBuffer.trim()) {
      state.ttsQueue.push(state.textBuffer.trim());
      state.textBuffer = '';
      processQueue();
    }

    // Poll for completion
    const checkCompletion = () => {
      if (state.ttsQueue.length === 0 && !state.isProcessing) {
        state.isActive = false;
        setIsSpeaking(false);
        onStopSpeaking?.();
        onStatusChange?.('Streaming complete');
        pollTimeoutRef.current = null;
      } else {
        pollTimeoutRef.current = setTimeout(checkCompletion, 100) as unknown as number;
      }
    };
    checkCompletion();
  }, [onStopSpeaking, onStatusChange]);

  const stop = useCallback(() => {
    // Clear any pending timeout
    if (pollTimeoutRef.current !== null) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }

    // Stop all active handles
    activeHandlesRef.current.forEach(handle => {
      try {
        handle?.stop();
      } catch (err) {
        console.error('Error stopping TTS handle:', err);
      }
    });
    activeHandlesRef.current = [];

    stateRef.current.ttsQueue = [];
    stateRef.current.textBuffer = '';
    stateRef.current.isProcessing = false;
    stateRef.current.isActive = false;
    setIsSpeaking(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollTimeoutRef.current !== null) {
        clearTimeout(pollTimeoutRef.current);
      }
      stop();
    };
  }, [stop]);

  return {
    isReady,
    isSpeaking,
    ensureReady,
    addChunk,
    finishStreaming,
    stop
  };
}