import { useState, useEffect, useRef, useCallback } from 'react';
import { getCachedOrFetch } from '../utils/modelCache';

interface PiperConfig {
    voiceModelUrl: string; // URL to .onnx file
    voiceConfigUrl: string; // URL to .json file
    warmupText?: string; // Optional text to warmup the model
}

interface PiperState {
    isReady: boolean;
    isLoading: boolean;
    error: string | null;
    downloadProgress?: { loaded: number; total: number } | null;
}

export const usePiper = (config: PiperConfig | null) => {
    const [state, setState] = useState<PiperState>({
        isReady: false,
        isLoading: false,
        error: null,
    });
    const [isPlaying, setIsPlaying] = useState(false);
    const [pendingSpeechCount, setPendingSpeechCount] = useState(0);

    const [currentlyPlayingIndex, setCurrentlyPlayingIndex] = useState<number | null>(null);
    const playbackCounterRef = useRef(0);
    const currentAudioRef = useRef<HTMLAudioElement | null>(null);
    const playbackSessionRef = useRef(0);

    const audioQueueRef = useRef<Blob[]>([]);
    const synthesisQueueRef = useRef<string[]>([]);
    const preReadyQueueRef = useRef<string[]>([]); // Text queued before worker is ready
    const processingRef = useRef(false);
    const isSynthesizingRef = useRef(false);

    const workerRef = useRef<Worker | null>(null);

    // Reset all queue state when config is removed (TTS disabled)
    useEffect(() => {
        if (!config) {
            audioQueueRef.current = [];
            synthesisQueueRef.current = [];
            preReadyQueueRef.current = [];
            playbackCounterRef.current = 0;
            setCurrentlyPlayingIndex(null);
            setIsPlaying(false);
            setPendingSpeechCount(0);
            setState({ isReady: false, isLoading: false, error: null });
        }
    }, [config]);

    useEffect(() => {
        if (!config || !config.voiceModelUrl || !config.voiceConfigUrl) return;

        let active = true;
        const blobUrls: string[] = [];

        const initPiper = async () => {
            setState(s => ({ ...s, isReady: false, isLoading: true, error: null, downloadProgress: { loaded: 0, total: 100 } }));

            try {
                console.log("Fetching/Caching Model:", config.voiceModelUrl);
                const modelBlob = await getCachedOrFetch(config.voiceModelUrl, (loaded, total) => {
                    if (active) setState(s => ({ ...s, downloadProgress: { loaded, total } }));
                });
                console.log("Fetching/Caching Config:", config.voiceConfigUrl);
                const configBlob = await getCachedOrFetch(config.voiceConfigUrl);

                if (!active) return;

                const modelUrl = URL.createObjectURL(modelBlob);
                const configUrl = URL.createObjectURL(configBlob);
                blobUrls.push(modelUrl, configUrl);

                const workerUrl = '/piper-wasm/piper_worker.js';
                const worker = new Worker(workerUrl);
                workerRef.current = worker;

                const handleInit = (event: MessageEvent) => {
                    const data = event.data;
                    if (data.kind === 'output') {
                        console.log("Piper warmup complete");
                        if (active) setState(s => ({ ...s, isReady: true, isLoading: false, downloadProgress: null }));
                        worker.removeEventListener('message', handleInit);
                    } else if (data.kind === 'stderr') {
                        console.log("Piper Log:", data.message);
                    }
                };

                worker.addEventListener('message', handleInit);

                worker.postMessage({
                    kind: 'init',
                    input: config.warmupText || 'Warmup',
                    modelUrl: modelUrl,
                    modelConfigUrl: configUrl,
                    piperPhonemizeJsUrl: '/piper-wasm/piper_phonemize.js',
                    piperPhonemizeWasmUrl: '/piper-wasm/piper_phonemize.wasm',
                    piperPhonemizeDataUrl: '/piper-wasm/piper_phonemize.data',
                    onnxruntimeUrl: window.location.origin + '/ort/',
                    blobs: {},
                });

            } catch (err: any) {
                console.error("Failed to start Piper worker", err);
                if (active) setState(s => ({ ...s, isReady: false, isLoading: false, error: err.message || "Failed to start" }));
            }
        };

        initPiper();

        return () => {
            active = false;
            workerRef.current?.terminate();
            workerRef.current = null;
            blobUrls.forEach(url => URL.revokeObjectURL(url));
        };
    }, [config?.voiceModelUrl, config?.voiceConfigUrl, config?.warmupText]);


    // Helper: Synthesize a single sentence
    const synthesize = useCallback(async (text: string): Promise<Blob> => {
        if (!workerRef.current) throw new Error("Worker not initialized");

        return new Promise((resolve) => {
            const worker = workerRef.current!;

            const handleMessage = (event: MessageEvent) => {
                const data = event.data;
                if (data.kind === 'output') {
                    worker.removeEventListener('message', handleMessage);
                    resolve(data.file);
                } else if (data.kind === 'stderr') {
                    console.log("Piper Log:", data.message);
                }
            };

            worker.addEventListener('message', handleMessage);

            worker.postMessage({
                kind: 'generate',
                input: text,
                modelUrl: config?.voiceModelUrl,
                modelConfigUrl: config?.voiceConfigUrl,
                piperPhonemizeJsUrl: '/piper-wasm/piper_phonemize.js',
                piperPhonemizeWasmUrl: '/piper-wasm/piper_phonemize.wasm',
                piperPhonemizeDataUrl: '/piper-wasm/piper_phonemize.data',
                onnxruntimeUrl: window.location.origin + '/ort/',
                blobs: {},
            });
        });
    }, [config]);


    // Loop 2: Audio Player Consumer
    const playQueue = useCallback(async () => {
        if (processingRef.current) return;
        processingRef.current = true;
        setIsPlaying(true);

        try {
            while (audioQueueRef.current.length > 0) {
                const blob = audioQueueRef.current.shift();
                if (!blob) break;

                setCurrentlyPlayingIndex(playbackCounterRef.current);

                await new Promise<void>((resolve) => {
                    const audio = new Audio(URL.createObjectURL(blob));
                    currentAudioRef.current = audio;
                    audio.onended = () => resolve();
                    audio.onpause = () => resolve();
                    audio.onerror = (e) => {
                        console.error("Audio playback error", e);
                        resolve();
                    };
                    audio.play().catch(e => {
                        console.error("Playback failed check", e);
                        resolve();
                    });
                });

                currentAudioRef.current = null;

                setPendingSpeechCount(prev => Math.max(0, prev - 1));
                playbackCounterRef.current += 1;
            }
        } finally {
            processingRef.current = false;
            setIsPlaying(false);
            setCurrentlyPlayingIndex(null);
        }
    }, []);


    // Loop 1: Synthesis Consumer
    const processSynthesisQueue = useCallback(async () => {
        if (isSynthesizingRef.current) return;
        isSynthesizingRef.current = true;

        try {
            while (synthesisQueueRef.current.length > 0) {
                const text = synthesisQueueRef.current.shift();
                if (text) {
                    try {
                        const sessionAtStart = playbackSessionRef.current;
                        const blob = await synthesize(text);

                        if (sessionAtStart !== playbackSessionRef.current) {
                            setPendingSpeechCount(prev => Math.max(0, prev - 1));
                            continue;
                        }

                        audioQueueRef.current.push(blob);
                        if (!processingRef.current) {
                            playQueue();
                        }
                    } catch (err) {
                        console.error("Synthesis error:", err);
                        setPendingSpeechCount(prev => Math.max(0, prev - 1));
                    }
                }
            }
        } finally {
            isSynthesizingRef.current = false;
        }
    }, [synthesize, playQueue]);


    // Flush pre-ready queue once worker becomes available
    useEffect(() => {
        if (state.isReady && preReadyQueueRef.current.length > 0) {
            const pending = [...preReadyQueueRef.current];
            preReadyQueueRef.current = [];
            pending.forEach(text => synthesisQueueRef.current.push(text));
            processSynthesisQueue();
        }
    }, [state.isReady, processSynthesisQueue]);

    // Main: Output Entry Point
    const speak = useCallback(async (text: string) => {
        if (text.trim()) {
            setPendingSpeechCount(prev => prev + 1);
            if (!workerRef.current) {
                // Worker not ready yet — buffer until it initializes
                preReadyQueueRef.current.push(text.trim());
            } else {
                synthesisQueueRef.current.push(text.trim());
                processSynthesisQueue();
            }
        }
    }, [processSynthesisQueue]);

    // Reset Logic
    const resetTTS = useCallback(() => {
        playbackSessionRef.current += 1;
        audioQueueRef.current = [];
        synthesisQueueRef.current = [];
        preReadyQueueRef.current = [];
        playbackCounterRef.current = 0;
        if (currentAudioRef.current) {
            currentAudioRef.current.pause();
            currentAudioRef.current.src = '';
            currentAudioRef.current.load();
            currentAudioRef.current = null;
        }
        setCurrentlyPlayingIndex(null);
        setIsPlaying(false);
        setPendingSpeechCount(0);
    }, []);

    return {
        speak,
        isPlaying,
        hasPendingSpeech: pendingSpeechCount > 0,
        pendingSpeechCount,
        stop: resetTTS,
        currentlyPlayingIndex,
        resetTTS,
        ...state
    };
};
