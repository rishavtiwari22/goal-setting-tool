import { useState, useRef, useEffect, useCallback } from "react";
import { ResetSTTLogic } from "../utils/stt/sttLogic";

interface UseSpeechRecognitionProps {
  onSpeechResult: (transcript: string) => void;
  enabled?: boolean;
}

export function useSpeechRecognition({
  onSpeechResult,
  enabled = true,
}: UseSpeechRecognitionProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeechMode, setIsSpeechMode] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(
    null
  );

  const sttLogicRef = useRef<ResetSTTLogic | null>(null);
  const isListeningRef = useRef(false);
  const isSpeechModeRef = useRef(true);
  const resumeAfterPlaybackRef = useRef(true);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSpeechResultRef = useRef(onSpeechResult);

  // Update ref when prop changes
  useEffect(() => {
    onSpeechResultRef.current = onSpeechResult;
  }, [onSpeechResult]);

  // Sync state to ref
  useEffect(() => {
    isSpeechModeRef.current = isSpeechMode;
  }, [isSpeechMode]);

  // Check microphone permission
  const checkMicPermission = useCallback(async () => {
    try {
      // Check if we're in a browser environment
      if (typeof window === "undefined" || !navigator.mediaDevices) {
        console.error("MediaDevices API not available");
        setPermissionGranted(false);
        return false;
      }

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop the stream immediately - we just needed to check permission
      stream.getTracks().forEach((track) => track.stop());
      setPermissionGranted(true);
      console.log("Microphone permission granted");
      return true;
    } catch (error) {
      console.error("Microphone permission denied:", error);
      setPermissionGranted(false);
      return false;
    }
  }, []);

  // Initialize STT Logic once
  useEffect(() => {
    if (!enabled) return;
    if (sttLogicRef.current) return;

    console.log("Initializing STT Logic...");

    try {
      const sttLogic = new ResetSTTLogic(
        (message: string, type: "info" | "warning" | "error" = "info") => {
          console.log(`[STT ${type.toUpperCase()}] ${message}`);
        },
        (transcript: string) => {
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

          if (!transcript.trim()) return;

          console.log(
            `[STT] Received transcript: "${transcript.substring(0, 50)}..."`
          );

          // 1.5 seconds pause timeout
          silenceTimerRef.current = setTimeout(() => {
            const logic = sttLogicRef.current;
            if (logic && isListeningRef.current) {
              const fullTranscript = logic.getFullTranscript();
              if (fullTranscript && fullTranscript.trim().length > 0) {
                console.log(
                  `Silence detected - sending: "${fullTranscript.substring(
                    0,
                    50
                  )}..."`
                );

                logic.stop();
                setIsListening(false);
                isListeningRef.current = false;

                resumeAfterPlaybackRef.current = true;

                onSpeechResultRef.current(fullTranscript);
                logic.clearTranscript();
              }
            }
          }, 1500);
        },
        {
          sessionDurationMs: 60000,
          interimSaveIntervalMs: 1000,
          preserveTranscriptOnStart: false,
        }
      );

      sttLogicRef.current = sttLogic;
      console.log("STT Logic initialized successfully");
    } catch (error) {
      console.error("Failed to initialize STT Logic:", error);
    }

    return () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (sttLogicRef.current) {
        sttLogicRef.current.destroy();
        sttLogicRef.current = null;
      }
    };
  }, [enabled]);

  const startListening = useCallback(async () => {
    const sttLogic = sttLogicRef.current;

    if (!sttLogic) {
      console.error("STT Logic not initialized");
      return;
    }

    // Check permission first
    if (permissionGranted === null || permissionGranted === false) {
      const hasPermission = await checkMicPermission();
      if (!hasPermission) {
        console.error("Cannot start listening - microphone permission denied");
        return;
      }
    }

    console.log("Starting listening...");

    // Update state synchronously
    setIsSpeechMode(true);
    isSpeechModeRef.current = true;
    setIsListening(true);
    isListeningRef.current = true;
    resumeAfterPlaybackRef.current = true;

    try {
      sttLogic.start();
      console.log("STT started successfully");
    } catch (err) {
      console.error("Failed to start STT:", err);
      setIsListening(false);
      isListeningRef.current = false;
      setIsSpeechMode(false);
      isSpeechModeRef.current = false;
    }
  }, [permissionGranted, checkMicPermission]);

  const stopListening = useCallback(() => {
    console.log("Stopping listening...");
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

    sttLogicRef.current?.stop();
    setIsListening(false);
    isListeningRef.current = false;
    setIsSpeechMode(false);
    isSpeechModeRef.current = false;
    resumeAfterPlaybackRef.current = false;
  }, []);

  const pauseListening = useCallback(() => {
    console.log("Pausing listening for TTS...");
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

    if (sttLogicRef.current && isListeningRef.current) {
      sttLogicRef.current.stop();
      setIsListening(false);
      isListeningRef.current = false;
    }

    resumeAfterPlaybackRef.current = true;
  }, []);

  const resumeListening = useCallback(async () => {
    console.log("Attempting to resume listening...", {
      resumeFlag: resumeAfterPlaybackRef.current,
      isSpeechMode: isSpeechModeRef.current,
    });

    if (
      sttLogicRef.current &&
      (resumeAfterPlaybackRef.current || isSpeechModeRef.current)
    ) {
      // Check microphone permission before resuming
      if (permissionGranted === null || permissionGranted === false) {
        const hasPermission = await checkMicPermission();
        if (!hasPermission) {
          console.error(
            "Cannot resume listening - microphone permission denied"
          );
          return;
        }
      }

      setTimeout(() => {
        console.log("Resuming listening now.");
        try {
          sttLogicRef.current?.start();
          setIsListening(true);
          isListeningRef.current = true;
          setIsSpeechMode(true);
          isSpeechModeRef.current = true;
        } catch (e) {
          console.error("Error resuming STT:", e);
        }
      }, 100);
    }
  }, [permissionGranted, checkMicPermission]);

  return {
    isListening,
    isSpeechMode,
    permissionGranted,
    startListening,
    stopListening,
    pauseListening,
    resumeListening,
    checkMicPermission,
  };
}
