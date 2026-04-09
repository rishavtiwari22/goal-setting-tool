import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import { Monitor, Play, Square, Scan } from 'lucide-react';
import { ocrService } from '../services/ocr/ocrService';

export interface ScreenCapturePanelHandle {
    stopSharing: () => void;
    startSharing: () => Promise<void>;
}

interface ScreenCapturePanelProps {
    onCaptureComplete?: (text: string) => void;
    onShareStatusChange?: (isSharing: boolean) => void;
    className?: string;
}

function ScreenCapturePanelInner({
    onCaptureComplete,
    onShareStatusChange,
    className = '',
}: ScreenCapturePanelProps, ref: React.ForwardedRef<ScreenCapturePanelHandle>) {
    const [isSharing, setIsSharing] = useState(false);
    const [capturedContent, setCapturedContent] = useState('');
    const [refinedCode, setRefinedCode] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isRefining, setIsRefining] = useState(false);
    const [isInitializing, setIsInitializing] = useState(false);
    const [showPanel, setShowPanel] = useState(false);

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const ocrIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const streamMonitorRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const trackedTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
    const streamRef = useRef<MediaStream | null>(null);
    const isProcessingRef = useRef(false);
    const lastRawOcrText = useRef<string>('');

    const addTrackedTimeout = (fn: () => void, delay: number) => {
        const id = setTimeout(fn, delay);
        trackedTimeoutsRef.current.push(id);
        return id;
    };

    const clearAllTimers = () => {
        if (ocrIntervalRef.current) {
            clearInterval(ocrIntervalRef.current);
            ocrIntervalRef.current = null;
        }
        if (streamMonitorRef.current) {
            clearInterval(streamMonitorRef.current);
            streamMonitorRef.current = null;
        }
        trackedTimeoutsRef.current.forEach(clearTimeout);
        trackedTimeoutsRef.current = [];
    };

    useEffect(() => {
        ocrService.initialize().catch(e => console.error('OCR init failed:', e));
        return () => {
            stopScreenShare();
        };
    }, []);

    useEffect(() => {
        if (isSharing && streamRef.current && videoRef.current) {
            const video = videoRef.current;
            video.onloadedmetadata = null;
            video.srcObject = streamRef.current;
            video.muted = true;

            video.onloadedmetadata = () => {
                video.play().catch(e => console.warn('Video play failed:', e));
            };

            const track = streamRef.current.getVideoTracks()[0];
            if (track) {
                track.onended = () => stopScreenShare();
            }
        }
    }, [isSharing]);

    const startScreenShare = async () => {
        try {
            if (streamRef.current) stopScreenShare();
            setIsInitializing(true);

            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    width: { ideal: 1920, max: 1920 },
                    height: { ideal: 1080, max: 1080 },
                    frameRate: { ideal: 10 },
                },
                audio: false,
            });

            streamRef.current = stream;
            setIsSharing(true);
            setIsInitializing(false);
            setShowPanel(true);
            onShareStatusChange?.(true);

            addTrackedTimeout(() => startOCRProcessing(), 2000);

            streamMonitorRef.current = setInterval(() => {
                if (streamRef.current && !streamRef.current.active) {
                    stopScreenShare();
                }
            }, 1000);
        } catch (err) {
            console.error('Screen share failed:', err);
            setIsInitializing(false);
            setIsSharing(false);
        }
    };

    const stopScreenShare = () => {
        clearAllTimers();

        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }

        if (videoRef.current) {
            videoRef.current.srcObject = null;
            videoRef.current.onloadedmetadata = null;
        }

        setIsSharing(false);
        setIsProcessing(false);
        setIsRefining(false);
        setIsInitializing(false);
        setCapturedContent('');
        setRefinedCode('');
        lastRawOcrText.current = '';
        onShareStatusChange?.(false);
    };

    useImperativeHandle(ref, () => ({
        stopSharing: stopScreenShare,
        startSharing: startScreenShare,
    }));

    const startOCRProcessing = () => {
        if (ocrIntervalRef.current) clearInterval(ocrIntervalRef.current);
        ocrIntervalRef.current = setInterval(() => processFrame(), 2000);
        processFrame();
    };

    const processFrame = async () => {
        if (!videoRef.current || !canvasRef.current) return;
        if (isProcessingRef.current || !streamRef.current?.active) return;

        const video = videoRef.current;
        if (video.readyState < 2 || video.videoWidth === 0) return;

        isProcessingRef.current = true;
        setIsProcessing(true);

        try {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d', { alpha: false });
            if (!ctx) return;

            const MAX_WIDTH = 1000;
            let targetWidth = video.videoWidth;
            let targetHeight = video.videoHeight;

            if (targetWidth > MAX_WIDTH) {
                const scale = MAX_WIDTH / targetWidth;
                targetWidth = MAX_WIDTH;
                targetHeight = video.videoHeight * scale;
            }

            canvas.width = targetWidth;
            canvas.height = targetHeight;
            ctx.drawImage(video, 0, 0, targetWidth, targetHeight);

            const { text } = await ocrService.processImageFromCanvas(canvas);

            if (text && text.trim().length > 3) {
                const cleanText = text.trim();

                const isSignificantlyDifferent =
                    Math.abs(cleanText.length - lastRawOcrText.current.length) > 15 ||
                    cleanText.substring(0, 40) !== lastRawOcrText.current.substring(0, 40);

                if (isSignificantlyDifferent || lastRawOcrText.current === '') {
                    lastRawOcrText.current = cleanText;
                    setCapturedContent(cleanText);

                    // Pass RAW OCR text to interviewer LLM immediately for real-time questions.
                    // No waiting for LLM cleaning — the interviewer model can handle messy OCR.
                    if (onCaptureComplete) onCaptureComplete(cleanText);

                    // Run LLM cleanup in parallel — purely for the front-end display (refined code panel).
                    setIsRefining(true);
                    ocrService.processOcrWithLlm(cleanText)
                        .then(refined => {
                            setRefinedCode(refined);
                        })
                        .catch(err => console.error('Refinement failed:', err))
                        .finally(() => setIsRefining(false));
                }
            }
        } catch (err) {
            console.error('OCR Processing Error:', err);
        } finally {
            isProcessingRef.current = false;
            setIsProcessing(false);
        }
    };

    return (
        <div className={`relative ${className}`}>
            {/* Toggle button — always visible in the control bar */}
            {!isSharing ? (
                <button
                    onClick={startScreenShare}
                    disabled={isInitializing}
                    aria-label="Start screen share"
                    className="w-12 h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 rounded-2xl md:rounded-3xl shadow-sm hover:shadow-md bg-white hover:scale-105 active:scale-95 transition-all shrink-0 border border-gray-200 flex items-center justify-center group"
                >
                    {isInitializing ? (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-600 border-t-transparent" />
                    ) : (
                        <Monitor className="w-5 h-5 md:w-6 md:h-6 lg:w-7 lg:h-7 text-gray-600 group-hover:text-gray-900 transition-colors" />
                    )}
                </button>
            ) : (
                <button
                    onClick={() => setShowPanel(prev => !prev)}
                    aria-label={showPanel ? 'Hide screen panel' : 'Show screen panel'}
                    className="relative w-12 h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 rounded-2xl md:rounded-3xl shadow-sm hover:shadow-md bg-emerald-50 hover:scale-105 active:scale-95 transition-all shrink-0 border border-emerald-300 flex items-center justify-center group"
                >
                    {(isProcessing || isRefining) && (
                        <span className="absolute -top-1 -right-1 h-3 w-3">
                            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                        </span>
                    )}
                    <Monitor className="w-5 h-5 md:w-6 md:h-6 lg:w-7 lg:h-7 text-emerald-600 transition-colors" />
                </button>
            )}

            {/* Side panel — fixed to right edge of screen */}
            {isSharing && showPanel && (
                <div className="fixed right-4 top-20 w-72 rounded-2xl border border-gray-200 bg-white/95 p-4 shadow-xl backdrop-blur-md z-50">
                    {/* Header */}
                    <div className="mb-3 flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Screen Monitor</span>
                        <button
                            onClick={() => setShowPanel(false)}
                            className="text-gray-400 hover:text-gray-600 text-lg leading-none"
                            aria-label="Close screen panel"
                        >
                            &times;
                        </button>
                    </div>

                    {/* Video preview */}
                    <div className="relative overflow-hidden rounded-xl bg-black mb-3">
                        <video
                            ref={videoRef}
                            autoPlay
                            muted
                            playsInline
                            className="h-auto max-h-44 w-full object-contain"
                            style={{ border: '2px solid #10b981' }}
                        />
                        {(isProcessing || isRefining) && (
                            <div className="absolute right-2 top-2 flex items-center gap-1 rounded-md bg-blue-500 px-2 py-0.5 shadow-lg">
                                <Scan className="h-3 w-3 animate-pulse text-white" />
                                <span className="text-[10px] font-bold text-white uppercase tracking-tighter">
                                    {isRefining ? 'Refining Code...' : 'Analyzing Frame'}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Refined Code (LLM Output) */}
                    <div className="flex flex-col gap-1 mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 ml-1">Refined Code</span>
                        <div className="max-h-48 overflow-y-auto rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 font-mono custom-scrollbar">
                            <pre className="whitespace-pre-wrap text-[11px] leading-relaxed text-emerald-900">
                                {refinedCode || (isRefining ? 'Refining detected text...' : 'Awaiting code detection...')}
                            </pre>
                        </div>
                    </div>

                    {/* Raw OCR Preview (Small) */}
                    <div className="flex flex-col gap-1 opacity-60 transition-opacity hover:opacity-100 mb-3">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400 ml-1">Raw OCR</span>
                        <div className="max-h-12 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-2">
                            <p className="line-clamp-2 text-[9px] leading-tight text-gray-400">
                                {capturedContent || 'No text detected...'}
                            </p>
                        </div>
                    </div>

                    {/* Stop button */}
                    <button
                        onClick={stopScreenShare}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-400 bg-white px-4 py-2 text-xs font-semibold text-red-500 transition-all hover:bg-red-50 active:scale-95 shadow-sm"
                    >
                        <Square className="h-3.5 w-3.5" />
                        Stop Monitoring
                    </button>
                </div>
            )}

            {/* Hidden canvas for OCR processing */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Video element (hidden when panel is closed, shown when open) */}
            {isSharing && !showPanel && (
                <video ref={videoRef} autoPlay muted playsInline className="hidden" />
            )}

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #9ca3af; }
            `}</style>
        </div>
    );
}

const ScreenCapturePanel = forwardRef(ScreenCapturePanelInner);
export default ScreenCapturePanel;
