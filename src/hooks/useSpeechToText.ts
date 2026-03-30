import { useState, useEffect, useRef, useCallback } from 'react';

// 1. Type Definitions (Teaching TS about the browser API)
interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList;
    resultIndex: number;
}

interface SpeechRecognitionResultList {
    length: number;
    [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
    isFinal: boolean;
    [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
    transcript: string;
    confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
    error: string;
    message: string;
}

// Extend the Window interface to include the Web Speech API
declare global {
    interface Window {
        SpeechRecognition: any;
        webkitSpeechRecognition: any;
    }
}

// 2. The Hook Implementation
interface UseSpeechToTextOptions {
    lang: string;
    continuous: boolean;
    silenceTimeout?: number;
}

export const useSpeechToText = (options: UseSpeechToTextOptions = { lang: 'en-US', continuous: true, silenceTimeout: 500 }) => {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [interimTranscript, setInterimTranscript] = useState('');
    const [error, setError] = useState<string | null>(null);

    // We use a ref to keep the instance constant across renders
    const recognitionRef = useRef<any>(null);
    const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const stopListening = useCallback(() => {
        if (recognitionRef.current && isListening) {
            // State change will happen in onend
            recognitionRef.current.stop();
        }
    }, [isListening]);

    useEffect(() => {
        // Check browser support
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            setError('Web Speech API is not supported in this browser.');
            return;
        }

        // Initialize the recognition instance
        const recognition = new SpeechRecognition();
        recognition.continuous = options.continuous;
        recognition.interimResults = true; // Always true so we can see typing effect
        recognition.lang = options.lang;

        // --- EVENT HANDLERS ---

        // Fired when the engine returns text
        recognition.onresult = (event: SpeechRecognitionEvent) => {
            let finalTranscripts = '';
            let currentInterim = '';
            let hasInterim = false;

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcriptChunk = event.results[i][0].transcript;

                if (event.results[i].isFinal) {
                    finalTranscripts = transcriptChunk;
                } else {
                    currentInterim += transcriptChunk;
                    hasInterim = true;
                }
            }

            if (options.silenceTimeout) {
                if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
                // Active speech (interim results): full silence timeout
                // Browser finalized a phrase (isFinal only): short timeout since pause already detected
                const timeout = hasInterim ? options.silenceTimeout : 300;
                silenceTimerRef.current = setTimeout(() => {
                    recognition.stop();
                }, timeout);
            }

            if (finalTranscripts) {
                setTranscript(prev => prev + ' ' + finalTranscripts);
            }
            setInterimTranscript(currentInterim);
        };

        // Fired on error
        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
            console.error('Speech recognition error:', event.error);
            setError(event.error);
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        };

        // Fired when the microphone starts
        recognition.onstart = () => {
            setIsListening(true);
        };

        // Fired when the microphone stops
        recognition.onend = () => {
            setIsListening(false);
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        };

        recognitionRef.current = recognition;

        // Cleanup on unmount
        return () => {
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, [options.lang, options.continuous, options.silenceTimeout]);

    // 3. Exposed Methods
    const startListening = useCallback(() => {
        if (recognitionRef.current && !isListening) {
            try {
                // Clear old interim results on restart
                setInterimTranscript('');
                recognitionRef.current.start();
                setError(null);
            } catch (err) {
                console.error("Error starting recognition:", err);
            }
        }
    }, [isListening]);

    const resetTranscript = useCallback(() => {
        setTranscript('');
        setInterimTranscript('');
    }, []);

    return {
        isListening,
        transcript,
        interimTranscript,
        startListening,
        stopListening,
        resetTranscript,
        error,
        browserSupportsSpeechRecognition: !!(window.SpeechRecognition || window.webkitSpeechRecognition)
    };
};
