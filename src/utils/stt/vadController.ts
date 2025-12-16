import { MicVAD, RealTimeVADOptions } from "@ricky0123/vad-web";

const VAD_ASSET_BASE =
  "https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@0.0.30/dist/";
const ONNX_WASM_BASE_PATH = "/ort/";

export interface VADCallbacks {
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
  onError?: (err: unknown) => void;
  onLog?: (msg: string) => void;
}

export class VADController {
  private vad: MicVAD | null = null;
  private running = false;
  private callbacks: VADCallbacks;

  constructor(callbacks: VADCallbacks = {}) {
    this.callbacks = callbacks;
  }

  async start(options: Partial<RealTimeVADOptions> = {}): Promise<void> {
    if (this.running) return;
    try {
      this.callbacks.onLog?.("Initializing VAD...");
      const mergedOptions: Partial<RealTimeVADOptions> = {
        minSpeechMs: 200,
        ...options,
      };

      mergedOptions.baseAssetPath ??= VAD_ASSET_BASE;
      mergedOptions.onnxWASMBasePath ??= ONNX_WASM_BASE_PATH;
      mergedOptions.startOnLoad = mergedOptions.startOnLoad ?? true;

      const userOnSpeechStart = mergedOptions.onSpeechStart;
      const userOnSpeechEnd = mergedOptions.onSpeechEnd;

      mergedOptions.onSpeechStart = async () => {
        this.callbacks.onLog?.("VAD: speech start");
        this.callbacks.onSpeechStart?.();
        if (userOnSpeechStart) {
          await Promise.resolve(userOnSpeechStart());
        }
      };

      mergedOptions.onSpeechEnd = async (audio: Float32Array) => {
        this.callbacks.onLog?.("VAD: speech end");
        this.callbacks.onSpeechEnd?.();
        if (userOnSpeechEnd) {
          await Promise.resolve(userOnSpeechEnd(audio));
        }
      };

      this.vad = await MicVAD.new(mergedOptions);
      this.running = true;
      this.callbacks.onLog?.("VAD started");
    } catch (err) {
      this.callbacks.onError?.(err);
      throw err;
    }
  }

  stop(): void {
    if (!this.running) return;
    try {
      this.vad?.pause();
      this.vad?.destroy();
    } catch (e) {
      this.callbacks.onError?.(e);
    } finally {
      this.vad = null;
      this.running = false;
      this.callbacks.onLog?.("VAD stopped");
    }
  }
}
