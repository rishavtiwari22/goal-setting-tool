import * as tts from "@mintplex-labs/piper-tts-web";
export type TtsStatusCallback = (status: string) => void;

export type TtsBackend = "cpu";

export interface TtsPlaybackHandle {
  stop: (reason?: string) => void;
  finished: Promise<void>;
}

const DEFAULT_VOICE_ID = "en_US-hfc_female-medium";
export const DEFAULT_PIPER_BACKEND: TtsBackend = "cpu";

class SimpleQueue<T> {
  private items: T[] = [];
  private waiters: Array<() => void> = [];

  put(item: T): void {
    this.items.push(item);
    const waiter = this.waiters.shift();
    if (waiter) waiter();
  }

  async get(): Promise<T> {
    if (this.items.length > 0) {
      return this.items.shift()!;
    }
    return new Promise((resolve) => {
      this.waiters.push(() => resolve(this.items.shift()!));
    });
  }

  size(): number {
    return this.items.length;
  }
}

interface PiperBackendState {
  ortReady: boolean;
  ortPromise: Promise<void> | null;
  voiceReady: boolean;
  voicePromise: Promise<void> | null;
  warmed: boolean;
  warmPromise: Promise<void> | null;
}

function createBackendState(): PiperBackendState {
  return {
    ortReady: false,
    ortPromise: null,
    voiceReady: false,
    voicePromise: null,
    warmed: false,
    warmPromise: null,
  };
}

const backendState: Record<TtsBackend, PiperBackendState> = {
  cpu: createBackendState(),
};

function isCorruptModelError(error: unknown): boolean {
  const message = (error as Error)?.message || String(error || "");
  return message.includes("No graph was found in the protobuf");
}

async function resetVoiceCache(
  backend: TtsBackend,
  onStatusUpdate?: TtsStatusCallback
) {
  const state = backendState[backend];
  state.voiceReady = false;
  state.voicePromise = null;
  state.warmed = false;
  state.warmPromise = null;

  try {
    onStatusUpdate?.("Clearing cached Piper voice after corrupted download...");
    await tts.remove(DEFAULT_VOICE_ID);
  } catch (removeError) {
    console.log("Failed to remove cached Piper voice", removeError);
  }

  try {
    const sessionClass: any = (tts as any).TtsSession;
    if (sessionClass?._instance) {
      sessionClass._instance = null;
      onStatusUpdate?.("Reset Piper TTS session singleton");
    }
  } catch (sessionError) {
    console.log("Failed to reset Piper TTS session", sessionError);
  }
}

function getBackendLabel(_: TtsBackend): string {
  return "CPU";
}

async function ensureOrtReady(
  backend: TtsBackend,
  onStatusUpdate?: TtsStatusCallback
) {
  const state = backendState[backend];
  if (state.ortReady) return;
  if (state.ortPromise) {
    await state.ortPromise;
    return;
  }

  const backendLabel = getBackendLabel(backend);
  state.ortPromise = (async () => {
    onStatusUpdate?.(`Loading ONNX runtime (${backendLabel})...`);

    // @ts-ignore - WASM module without type declarations
    const ortModule: any = await import(/* webpackIgnore: true */ "../../ort/ort.wasm.min.js");
    const ortNS: any = ortModule?.default ?? ortModule;
    if (!ortNS) {
      throw new Error("Failed to load ONNX runtime module");
    }

    (globalThis as any).ort = ortNS;

    try {
      if (ortNS?.env?.wasm) {
        // ortNS.env.wasm.numThreads = 1;
        ortNS.env.wasm.wasmPaths = "/ort/";
      }
    } catch (error) {
      console.log("Failed to configure ONNX runtime", error);
    }

    state.ortReady = true;
    onStatusUpdate?.(`ONNX runtime ready (${backendLabel})`);
  })().finally(() => {
    state.ortPromise = null;
  });

  await state.ortPromise;
}

async function ensureVoiceLoaded(
  backend: TtsBackend,
  onStatusUpdate?: TtsStatusCallback
) {
  const state = backendState[backend];
  if (state.voiceReady) return;
  if (state.voicePromise) {
    await state.voicePromise;
    return;
  }

  await ensureOrtReady(backend, onStatusUpdate);

  const backendLabel = getBackendLabel(backend);
  state.voicePromise = (async () => {
    onStatusUpdate?.(`Preparing Piper voice (${backendLabel})...`);

    try {
      const storedVoices = await tts.stored();
      const alreadyCached = Array.isArray(storedVoices)
        ? storedVoices.includes(DEFAULT_VOICE_ID)
        : false;

      if (!alreadyCached) {
        console.log(`Piper voice downloading (${backendLabel})`);
        await tts.download(
          DEFAULT_VOICE_ID,
          (progress?: { loaded: number; total: number }) => {
            if (progress && progress.total) {
              const pct = Math.round((progress.loaded * 100) / progress.total);
              onStatusUpdate?.(
                `Downloading voice model (${backendLabel})... ${pct}%`
              );
            } else {
              onStatusUpdate?.(`Downloading voice model (${backendLabel})...`);
            }
          }
        );
      } else {
        console.log(`Piper voice cached (${backendLabel})`);
      }
    } catch (error) {
      console.log("Piper voice download failed, retrying", error);
      await tts.download(
        DEFAULT_VOICE_ID,
        (progress?: { loaded: number; total: number }) => {
          if (progress && progress.total) {
            const pct = Math.round((progress.loaded * 100) / progress.total);
            onStatusUpdate?.(
              `Downloading voice model (${backendLabel})... ${pct}%`
            );
          } else {
            onStatusUpdate?.(`Downloading voice model (${backendLabel})...`);
          }
        }
      );
    }

    state.voiceReady = true;
    onStatusUpdate?.(`Piper voice ready (${backendLabel})`);
  })().finally(() => {
    state.voicePromise = null;
  });

  await state.voicePromise;
}

async function warmupPiper(
  backend: TtsBackend,
  onStatusUpdate?: TtsStatusCallback
) {
  const state = backendState[backend];
  if (state.warmed) return;
  if (state.warmPromise) {
    await state.warmPromise;
    return;
  }

  const backendLabel = getBackendLabel(backend);
  state.warmPromise = (async () => {
    await ensureVoiceLoaded(backend, onStatusUpdate);

    let attemptedRecovery = false;

    const attemptWarmup = async () => {
      onStatusUpdate?.(`Warming Piper backend (${backendLabel})...`);
      await tts.predict({ text: "Warm up", voiceId: DEFAULT_VOICE_ID });
      console.log("Piper warm-up complete");
      state.warmed = true;
      onStatusUpdate?.(`Piper warm-up complete (${backendLabel})`);
    };

    while (true) {
      try {
        await attemptWarmup();
        break;
      } catch (error) {
        if (!attemptedRecovery && isCorruptModelError(error)) {
          attemptedRecovery = true;
          onStatusUpdate?.(
            `Warm-up failed due to corrupt cache (${backendLabel}) - redownloading`
          );
          await resetVoiceCache(backend, onStatusUpdate);
          await ensureVoiceLoaded(backend, onStatusUpdate);
          continue;
        }

        console.log("Piper warm-up failed", error);
        onStatusUpdate?.(`Piper warm-up skipped (${backendLabel})`);
        throw error;
      }
    }
  })().finally(() => {
    state.warmPromise = null;
  });

  await state.warmPromise;
}

export async function preparePiperVoice(
  onStatusUpdate?: TtsStatusCallback,
  backend: TtsBackend = DEFAULT_PIPER_BACKEND
) {
  const maxAttempts = 3;
  let attempt = 0;

  while (attempt < maxAttempts) {
    try {
      await ensureVoiceLoaded(backend, onStatusUpdate);
      await warmupPiper(backend, onStatusUpdate);
      return;
    } catch (error) {
      attempt += 1;
      console.log("Piper prepare failed", error);
      const shouldRetry = isCorruptModelError(error) && attempt < maxAttempts;
      if (!shouldRetry) {
        throw error;
      }
      await resetVoiceCache(backend, onStatusUpdate);
    }
  }
}

interface SynthesisLog {
  type: "synthesis";
  text: string;
  duration_sec: number;
  samples: number;
}

interface PlaybackLog {
  type: "playback";
  duration_sec: number;
  samples: number;
}

type Log = SynthesisLog | PlaybackLog;

async function synthesizerWorker(
  qText: SimpleQueue<string | null>,
  qAudio: SimpleQueue<Blob | null>,
  logs: Log[],
  backend: TtsBackend = DEFAULT_PIPER_BACKEND,
  onStatusUpdate?: TtsStatusCallback,
  onSynthesisTime?: (sentenceId: number, timeMs: number) => void
): Promise<void> {
  try {
    let sentenceCount = 0;
    let nullReceived = false;
    const MAX_AUDIO_QUEUE = 4;

    while (true) {
      const sentence = await qText.get();

      if (sentence === null) {
        if (!nullReceived) {
          nullReceived = true;
          onStatusUpdate?.(`[Synthesizer] 🛑 Synthesis complete - all sentences processed`);
          qAudio.put(null);
          break;
        }
        continue;
      }

      sentenceCount++;
      try {
        const preview = sentence.substring(0, 60);
        onStatusUpdate?.(`[Synthesizer] 📋 Processing sentence #${sentenceCount}: "${preview}${sentence.length > 60 ? "..." : ""}"`);

        const synthStart = performance.now();
        const wavBlob: Blob = await tts.predict({
          text: sentence,
          voiceId: DEFAULT_VOICE_ID,
        });

        const synthEnd = performance.now();
        const synthTimeMs = Math.round(synthEnd - synthStart);

        while (qAudio.size() >= MAX_AUDIO_QUEUE) {
          await new Promise((r) => setTimeout(r, 40));
        }

        onStatusUpdate?.(`[Synthesizer] ✅ Sentence #${sentenceCount} synthesized (${(synthTimeMs / 1000).toFixed(3)}s) - queuing for playback`);
        onSynthesisTime?.(sentenceCount, synthTimeMs);

        logs.push({
          type: "synthesis",
          text: sentence,
          duration_sec: synthTimeMs / 1000,
          samples: wavBlob.size,
        });

        qAudio.put(wavBlob);
      } catch (error) {
        console.log("[Synthesizer] Error", error);
        onStatusUpdate?.(`[Synthesizer] ❌ Error: Failed to synthesize sentence #${sentenceCount}`);
        qAudio.put(null);
        break;
      }
    }
  } catch (error) {
    console.log("[Synthesizer] Worker crashed", error);
    onStatusUpdate?.(`[Synthesizer] 💥 Worker crashed`);
    qAudio.put(null);
  }
}

async function playerWorker(
  qAudio: SimpleQueue<Blob | null>,
  logs: Log[],
  onStatusUpdate?: TtsStatusCallback,
  abortRef?: { aborted: boolean },
  currentSourceRef?: { source: AudioBufferSourceNode | null }
): Promise<void> {
  onStatusUpdate?.("🎧 Player thread started - waiting for audio chunks");

  let audioContext: AudioContext | null = null;
  let audioChunkCount = 0;

  try {
    audioContext = new (window.AudioContext ||
      (window as any).webkitAudioContext)();

    while (true) {
      if (abortRef?.aborted) {
        onStatusUpdate?.("🛑 Player aborted - stopping playback loop");
        break;
      }
      const audioChunk = await qAudio.get();
      if (audioChunk === null) {
        onStatusUpdate?.("🛑 Player thread stopping - playback complete");
        break;
      }

      audioChunkCount++;
      try {
        const preview = audioChunk.size;
        onStatusUpdate?.(`[Player] 🎵 Playing audio chunk #${audioChunkCount} (${preview} bytes)`);

        const playStart = performance.now();
        const audioBlob = audioChunk;
        const arrayBuffer = await audioBlob.arrayBuffer();
        const decodedBuffer = await audioContext!.decodeAudioData(arrayBuffer);

  const source = audioContext!.createBufferSource();
        source.buffer = decodedBuffer;
        source.playbackRate.value = 1.0;
        source.connect(audioContext!.destination);
  if (currentSourceRef) currentSourceRef.source = source;

        let playEnd = performance.now();
        const playPromise = new Promise<void>((resolve) => {
          let finished = false;

          const timeoutDuration = Math.max(2000, decodedBuffer.duration * 1000 + 500);
          const timeout = setTimeout(() => {
            if (!finished) {
              finished = true;
              playEnd = performance.now();
              onStatusUpdate?.(`[Player] ⏱️ Chunk #${audioChunkCount} timeout - continuing`);
              resolve();
            }
          }, timeoutDuration);

          const finalize = () => {
            if (finished) return;
            finished = true;
            clearTimeout(timeout);
            playEnd = performance.now();
            onStatusUpdate?.(`[Player] ✅ Finished playing chunk #${audioChunkCount} - ready for next`);
            resolve();
          };

          source.onended = finalize;
          source.start(0);
        });

        // Allow early exit if aborted mid-chunk
        await Promise.race([
          playPromise,
          new Promise<void>((resolve) => {
            const checkAbort = () => {
              if (abortRef?.aborted) {
                try {
                  currentSourceRef?.source?.stop();
                } catch {}
                resolve();
              } else {
                setTimeout(checkAbort, 30);
              }
            };
            checkAbort();
          }),
        ]);

        logs.push({
          type: "playback",
          duration_sec: (playEnd - playStart) / 1000,
          samples: decodedBuffer.length,
        });
      } catch (error) {
        console.log("[Player] Error", error);
        onStatusUpdate?.(`[Player] ❌ Error playing chunk #${audioChunkCount}`);
      }
    }
  } catch (error) {
    console.log("[Player] Worker crashed", error);
    onStatusUpdate?.("[Player] 💥 Worker crashed");
  }
}

type TokenSource = AsyncIterable<string> | Iterable<string>;

interface StreamToSpeechOptions {
  backend?: TtsBackend;
  autoPrepare?: boolean;
  onStatus?: (status: string) => void;
  onSentence?: (sentence: string, index: number) => void;
  onSynthesisTime?: (sentenceId: number, timeMs: number) => void;
  onPlayFinished?: () => void;
}

export async function streamTokensToSpeech(
  tokens: TokenSource,
  options: StreamToSpeechOptions = {}
): Promise<TtsPlaybackHandle> {
  const backend = options.backend ?? DEFAULT_PIPER_BACKEND;
  if (options.autoPrepare !== false) {
    await preparePiperVoice(options.onStatus, backend);
  }

  const qText = new SimpleQueue<string | null>();
  const qAudio = new SimpleQueue<Blob | null>();
  const logs: Log[] = [];
  const abortRef = { aborted: false };
  const currentSourceRef: { source: AudioBufferSourceNode | null } = { source: null };

  const synthPromise = synthesizerWorker(
    qText,
    qAudio,
    logs,
    backend,
    options.onStatus,
    options.onSynthesisTime
  );

  const playPromise = playerWorker(
    qAudio,
    logs,
    options.onStatus,
    abortRef,
    currentSourceRef
  );

  const sentenceBuffer: { text: string } = { text: "" };
  let sentenceCount = 0;

  const emitSentence = (sentence: string) => {
    const trimmed = sentence.trim();
    if (!trimmed) return;
    sentenceCount += 1;
    options.onSentence?.(trimmed, sentenceCount);
    qText.put(trimmed);
  };

  const nextBoundaryIndex = (text: string): number => {
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === "." || char === "?" || char === "!" || char === ",") {
        return i;
      }
    }
    return -1;
  };

  const handleChunk = (chunk: string) => {
    if (!chunk) return;
    sentenceBuffer.text += chunk;

    while (true) {
      const boundaryIndex = nextBoundaryIndex(sentenceBuffer.text);
      if (boundaryIndex === -1) break;
      const sentence = sentenceBuffer.text.substring(0, boundaryIndex + 1);
      sentenceBuffer.text = sentenceBuffer.text.substring(boundaryIndex + 1);
      emitSentence(sentence);
    }
  };

  const iterator = getAsyncIterator(tokens);
  try {
    for await (const chunk of iterator) {
      handleChunk(chunk);
    }
  } finally {
    emitSentence(sentenceBuffer.text);
    sentenceBuffer.text = "";
    qText.put(null);
  }

  const finished = (async () => {
    await Promise.all([synthPromise, playPromise]);
    options.onPlayFinished?.();
  })();

  const handle: TtsPlaybackHandle = {
    stop: (reason?: string) => {
      try {
        abortRef.aborted = true;
        options.onStatus?.(`🛑 Playback stopped${reason ? ` (${reason})` : ""}`);
        // Clear queues
        qText.put(null);
        qAudio.put(null);
        // Stop current source if any
        try {
          currentSourceRef.source?.stop();
        } catch {}
      } catch (e) {
        console.log("[TTS] Stop error", e);
      }
    },
    finished,
  };

  return handle;
}

async function* getAsyncIterator(source: TokenSource): AsyncIterable<string> {
  const asyncSource = source as AsyncIterable<string>;
  if (asyncSource[Symbol.asyncIterator]) {
    for await (const value of asyncSource) {
      yield value;
    }
    return;
  }

  for (const value of Array.from(source as Iterable<string>)) {
    yield value;
  }
}