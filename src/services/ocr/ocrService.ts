import Tesseract from 'tesseract.js';
import { ENV } from '../../utils/env';

interface OcrResult {
    text: string;
    confidence: number;
}

class OcrService {
    private worker: Tesseract.Worker | null = null;
    private isInitialized: boolean = false;
    private initPromise: Promise<void> | null = null;

    private createWorker = async (): Promise<Tesseract.Worker> => {
        const worker = await Tesseract.createWorker('eng', 1, {
            logger: () => {},
        });
        return worker;
    };

    public initialize = async (): Promise<void> => {
        if (this.isInitialized) return;
        if (this.initPromise) return this.initPromise;

        this.initPromise = (async () => {
            try {
                this.worker = await this.createWorker();
                this.isInitialized = true;
            } catch (error) {
                console.error('[OCR Service] Failed to initialize:', error);
                throw error;
            }
        })();

        return this.initPromise;
    };

    public recognizeText = async (imageData: Tesseract.ImageLike): Promise<OcrResult> => {
        if (!this.isInitialized || !this.worker) {
            await this.initialize();
        }

        const result = await this.worker!.recognize(imageData);
        return {
            text: result.data.text,
            confidence: result.data.confidence,
        };
    };

    public processImageFromCanvas = async (canvas: HTMLCanvasElement): Promise<OcrResult> => {
        return this.recognizeText(canvas);
    };

    public cleanup = async (): Promise<void> => {
        if (this.worker) {
            await this.worker.terminate();
            this.worker = null;
            this.isInitialized = false;
            this.initPromise = null;
        }
    };

    /**
     * Clean OCR text via LLM to extract only relevant source code.
     */
    public processOcrWithLlm = async (ocrText: string): Promise<string> => {
        localStorage.setItem('ocr_raw_text', ocrText);

        let apiUrl: string;
        try {
            apiUrl = ENV.CHAT_API_URL();
        } catch {
            return ocrText;
        }

        try {
            const model = ENV.HUGGINGFACE_MODEL() || 'tgi';

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model,
                    messages: [
                        {
                            role: 'system',
                            content: `You are a code extraction expert. Clean up the following OCR-extracted text from a screen capture of a code editor.

GOAL: Extract the literal source code exactly as it appears.

RULES:
1. Remove navigation elements, folder icons, and non-code UI text.
2. Remove line numbers if they were captured by OCR.
3. DO NOT remove comments. Preserve all programmer comments as they provide critical context.
4. Fix obvious OCR character misinterpretations ONLY if they are clear errors.
5. Preserve the exact indentation and logical structure.
6. If multiple files or sections are visible, separate them with a single empty line.
7. Output ONLY the code and comments found. No preamble, no markdown code blocks.
8. STRICT: DO NOT complete the code, add missing brackets, or finish functions.
9. If a line is partially cut off, return it exactly as it appears in the OCR.`,
                        },
                        { role: 'user', content: ocrText },
                    ],
                    stream: false,
                    temperature: 0.1,
                }),
            });

            if (!response.ok) throw new Error(`LLM API failed: ${response.status}`);

            const text = await response.text();
            const lines = text.split('\n');
            const jsonLine = lines.find(l => {
                const t = l.trim();
                return t.startsWith('{') && !t.includes('statusCode');
            }) || text;

            const data = JSON.parse(jsonLine.trim());
            const processedText = data.choices?.[0]?.message?.content || ocrText;
            localStorage.setItem('ocr_processed_text', processedText);
            return processedText;
        } catch (error) {
            console.error('[OCR Service] LLM processing failed:', error);
            return ocrText;
        }
    };
}

export const ocrService = new OcrService();
export type { OcrResult };
