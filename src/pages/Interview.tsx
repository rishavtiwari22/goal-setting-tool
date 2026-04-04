import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { FiSend, FiMic, FiMicOff, FiVolume2, FiVolumeX } from "react-icons/fi";
import { Captions, CaptionsOff, MicOff, PhoneMissed, PictureInPicture2 } from "lucide-react";
import { useSinglePromptInterview } from "../hooks/useSinglePromptInterview";
import type { InterviewConfig } from "../services/interview/interviewEngine";
import { useSpeechToText } from "../hooks/useSpeechToText";
import { usePiper } from "../hooks/usePiper";
import { useScreenWakeLock } from "../hooks/useScreenWakeLock";
import { useDocumentPiP } from "../hooks/useDocumentPiP";
import AudioVisualizer from "@/components/AudioVisualizer";
import ScreenCapturePanel from "@/components/ScreenCapturePanel";
import type { ScreenCapturePanelHandle } from "@/components/ScreenCapturePanel";
import { InterviewPiP } from "@/components/interview/InterviewPiP";
import type { InterviewSession } from "../models/interview";
import { loadInterviewSessionBySessionId, recoverOngoingSessionFromFirebase } from "../services/storage/interviewStorage";
import { exportSessionToGoogleSheets } from "../services/export/googleSheetsExport";
import { useOnboarding } from "../hooks/useOnboarding";
import { INTERVIEW_GUIDE_STEPS, INTERVIEW_GUIDE_STEPS_OCR } from "../components/onboarding/onboardingSteps";
import { OnboardingOverlay } from "../components/onboarding/OnboardingOverlay";


export default function Interview() {
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId?: string }>();
  const [config, setConfig] = useState<InterviewConfig | null>(null);
  const [input, setInput] = useState("");
  const [isSpeechOutputEnabled, setIsSpeechOutputEnabled] = useState(true);
  const [isEndCallClicked, setIsEndCallClicked] = useState(false);
  const forceEndRef = useRef(false);
  const [currentVideoState, setCurrentVideoState] =
    useState<string>("juggling");
  const [showChatMessage, setShowChatMessage] = useState(true);
  const [isInitializing, setIsInitializing] = useState(true);
  const [activeThinkingVideo, setActiveThinkingVideo] =
    useState<string>("thinking");

  const [spokenCaption, setSpokenCaption] = useState("");
  const [fullCaption, setFullCaption] = useState("");
  const [ocrText, setOcrText] = useState("");
  // If guide was previously dismissed, interview can start immediately
  const [guideDismissed, setGuideDismissed] = useState(
    () => localStorage.getItem("zoe_guide_interview_v1") === "true"
  );
  const captionScrollRef = useRef<HTMLDivElement>(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const screenCapturePanelRef = useRef<ScreenCapturePanelHandle>(null);
  const [loadingTextIndex, setLoadingTextIndex] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const thinkingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasSelectedAlternativeRef = useRef<boolean>(false);
  const lastSelectedAnimationRef = useRef<string | null>(null);
  const animationTransitionDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const pendingSessionRef = useRef<InterviewSession | null>(null); // Store session to navigate after TTS
  const audioBufferRef = useRef<string>("");
  const shouldResumeAfterTTSRef = useRef(false);
  const prevHasPendingSpeechRef = useRef(false);
  const submitAnswerRef = useRef<((text: string) => void) | null>(null);

  const loadingTexts = [
    "Getting things ready for you...",
    "Reviewing the job description...",
    "Preparing your interview questions...",
    "Setting up your personalized session...",
    "Almost there, just a moment...",
  ];

  const animationStates: { [key: string]: string } = {
    speaking: "/assets/speaking-edited.webp",
    listening: "/assets/listening.webp",
    thinking: "/assets/regular-thinking.webp",
    juggling: "/assets/juggling.webp",
    bubblepop: "/assets/bubblepop.webp",
    glassadjustment: "/assets/glassadjustment.webp",
    thoughtbubble: "/assets/thoughtbubble.webp",
    ballbounce: "/assets/ballbounce.webp",
  };

  const alternativeThinkingVideos = [
    "bubblepop",
    "glassadjustment",
    "thoughtbubble",
    "ballbounce",
  ];

  useEffect(() => {
    const initializeInterview = async () => {
      const configStr = sessionStorage.getItem("interviewConfig");
      const isInvited = sessionStorage.getItem("isInvited") === "true";
      
      if (!configStr && !sessionId) {
        const storedEmail = localStorage.getItem("studentEmail");
        if (storedEmail) {
          const recoveredSession = await recoverOngoingSessionFromFirebase(storedEmail);
          if (recoveredSession) {
            const interviewConfig: InterviewConfig = {
              userId: recoveredSession.userId,
              jobId: recoveredSession.jobId,
              jobTitle: recoveredSession.jobTitle,
              jobDescription: recoveredSession.jobDescription,
              interviewTime: recoveredSession.interviewTime,
              language: recoveredSession.language,
              difficulty: recoveredSession.difficulty,
              examinationPoints: recoveredSession.examinationPoints,
              mode: recoveredSession.mode ?? 'practice',
            };
            setConfig(interviewConfig);
            setIsInitializing(false);
            forceEndRef.current = false;
            navigate(`/interview/${recoveredSession.sessionId}`, { replace: true });
            return;
          }
        }
        toast.error("No interview configuration found");
        if (isInvited) {
          navigate("/");
        } else {
          navigate("/selfapply");
        }
        return;
      }

      try {
        if (configStr) {
          const interviewConfig = JSON.parse(configStr) as InterviewConfig;
          setConfig(interviewConfig);
          setIsInitializing(false);
          forceEndRef.current = false;
          
          if (isInvited) {
            const invitationId = sessionStorage.getItem("invitationId");
            if (invitationId) {
              try {
                const { updateInvitationStatus } = await import("../services/api/invitationApi");
                await updateInvitationStatus(invitationId, "in_progress");
              } catch (error) {
                console.error("Failed to update invitation status:", error);
              }
            }
          }
        } else if (sessionId) {
        let session = loadInterviewSessionBySessionId(sessionId);
        if (!session) {
          const storedEmail = localStorage.getItem("studentEmail");
          if (storedEmail) {
            const { recoverSessionFromFirebase } = await import("../services/storage/interviewStorage");
            session = await recoverSessionFromFirebase(storedEmail, sessionId);
          }
        }
        if (session) {
          const interviewConfig: InterviewConfig = {
            userId: session.userId,
            jobId: session.jobId,
            jobTitle: session.jobTitle,
            jobDescription: session.jobDescription,
            interviewTime: session.interviewTime,
            language: session.language,
            difficulty: session.difficulty,
            examinationPoints: session.examinationPoints,
            mode: session.mode ?? 'practice',
          };
          setConfig(interviewConfig);
          setIsInitializing(false);
          forceEndRef.current = false;
        } else {
          toast.error("Session not found");
          if (isInvited) {
            navigate("/");
          } else {
            navigate("/selfapply");
          }
        }
      }
    } catch (error) {
      console.error("Error parsing interview config:", error);
      toast.error("Invalid interview configuration");
      const isInvited = sessionStorage.getItem("isInvited") === "true";
      if (isInvited) {
        navigate("/");
      } else {
        navigate("/selfapply");
      }
    }
    };

    initializeInterview();
  }, [navigate, sessionId]);

  const handleComplete = (session: InterviewSession) => {
    try {
      sessionStorage.setItem("interviewSession", JSON.stringify(session));
      // Fire-and-forget: export to Google Sheets (non-blocking)
      exportSessionToGoogleSheets(session).catch(console.error);
      // If TTS is enabled, store session and wait for TTS to finish (with timeout fallback)
      if (isSpeechOutputEnabled) {
        pendingSessionRef.current = session;
        // Fallback: If TTS doesn't trigger navigation within 5 seconds, navigate anyway
        setTimeout(() => {
          if (pendingSessionRef.current) {
            pendingSessionRef.current = null;
            navigate(`/results/${session.sessionId}`);
          }
        }, 5000);
      } else {
        // TTS disabled, navigate immediately
        navigate(`/results/${session.sessionId}`);
      }
    } catch (error) {
      console.error("Failed to save session:", error);
      toast.error("Failed to save interview results");
    }
  };

  // ── TTS (usePiper) ──
  const {
    speak,
    isPlaying,
    hasPendingSpeech,
    stop: stopTts,
    isReady: isTTSReady,
  } = usePiper(
    isSpeechOutputEnabled
      ? {
          voiceModelUrl: "/models/Indian_accent_1.onnx",
          voiceConfigUrl: "/models/Indian_accent_1.json",
          warmupText: "hello",
        }
      : null
  );

  const isTtsActive = isPlaying || hasPendingSpeech;
  const isActuallyPlaying = isPlaying;

  // Buffer chunks from LLM stream and speak complete sentences
  const processBufferForTTS = useCallback(() => {
    const buffer = audioBufferRef.current;
    const sentenceEndings = /[.!?]\s|[।॥]/;
    const match = buffer.match(sentenceEndings);
    if (match && match.index !== undefined) {
      const splitIndex = match.index + match[0].length;
      const sentence = buffer.slice(0, splitIndex).trim();
      const remainder = buffer.slice(splitIndex);
      if (sentence && isSpeechOutputEnabled) {
        setSpokenCaption(sentence);
        speak(sentence).catch((err) => console.error("TTS Error:", err));
      }
      audioBufferRef.current = remainder;
      if (remainder.match(sentenceEndings)) processBufferForTTS();
    }
  }, [speak, isSpeechOutputEnabled]);

  const {
    messages,
    isLoading,
    isCompleted,
    remainingTime,
    submitAnswer,
    sessionId: currentSessionId,
    currentQuestion,
  } = useSinglePromptInterview({
    config,
    sessionId,
    onComplete: handleComplete,
    onStreamChunk: (chunk: string) => {
      if (isSpeechOutputEnabled) {
        audioBufferRef.current += chunk;
        processBufferForTTS();
      }
      // Accumulate full caption for scrollable display
      setFullCaption(prev => prev + chunk);
    },
    onStreamComplete: () => {
      if (isSpeechOutputEnabled && audioBufferRef.current.trim()) {
        const finalChunk = audioBufferRef.current.trim();
        audioBufferRef.current = "";
        setSpokenCaption(finalChunk);
        speak(finalChunk).catch((err) => console.error("TTS Error:", err));
      }
      audioBufferRef.current = "";
    },
    screenCode: config?.ocrEnabled ? (ocrText || undefined) : undefined,
    readyToStart: guideDismissed,
  });

  // Keep submitAnswer in a ref so async closures always have the latest version
  useEffect(() => {
    submitAnswerRef.current = submitAnswer;
  }, [submitAnswer]);

  useEffect(() => {
    if (currentSessionId && !sessionId) {
      navigate(`/interview/${currentSessionId}`, { replace: true });
    }
  }, [currentSessionId, sessionId, navigate]);

  // ── STT (useSpeechToText) ──
  const {
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechToText({ lang: "en-US", continuous: true, silenceTimeout: 1500 });

  // When TTS becomes active: always flag mic to resume after, and stop it if currently running
  useEffect(() => {
    if (isTtsActive) {
      shouldResumeAfterTTSRef.current = true;
      if (isListening) {
        stopListening();
      }
    }
  }, [isTtsActive, isListening, stopListening]);

  // Auto-resume mic after TTS finishes
  useEffect(() => {
    const hadPending = prevHasPendingSpeechRef.current;
    prevHasPendingSpeechRef.current = hasPendingSpeech;

    if (hadPending && !hasPendingSpeech && !isPlaying && shouldResumeAfterTTSRef.current) {
      if (pendingSessionRef.current) {
        pendingSessionRef.current = null;
        navigate("/results");
        return;
      }
      if (!isCompleted && !forceEndRef.current) {
        shouldResumeAfterTTSRef.current = false;
        resetTranscript();
        setTimeout(() => startListening(), 350);
      }
    }
  }, [hasPendingSpeech, isPlaying, isCompleted, navigate, resetTranscript, startListening]);

  // Auto-submit when silence detected (mic stopped with transcript present)
  useEffect(() => {
    if (isListening) return;
    const combined = (transcript + " " + interimTranscript).trim();
    if (!combined) return;

    if (combined.length < 3) {
      resetTranscript();
      if (!isTtsActive) startListening();
      return;
    }

    const t = setTimeout(() => {
      const text = combined.replace(/\[INTERVIEW_OVER\]/gi, "").trim();
      if (text && submitAnswerRef.current) {
        setSpokenCaption("");
        setFullCaption("");
        resetTranscript();
        submitAnswerRef.current(text);
      }
    }, 50);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isListening]);

  const isInterviewActive = !!config && !isCompleted;
  const isFirstLoad = isInitializing || (isLoading && messages.length === 0);

  useEffect(() => {
    if (!isFirstLoad) return;
    const interval = setInterval(() => {
      setLoadingTextIndex(prev => (prev + 1) % loadingTexts.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [isFirstLoad]);

  useScreenWakeLock(isInterviewActive);

  // ── Onboarding guide ──
  // Guide shows immediately when config loads (before interview starts).
  // Interview only begins after guide is dismissed or was previously dismissed.
  const onboarding = useOnboarding({
    storageKey: "zoe_guide_interview_v1",
    steps: config?.ocrEnabled ? INTERVIEW_GUIDE_STEPS_OCR : INTERVIEW_GUIDE_STEPS,
    enabled: !!config,
  });

  // When guide is dismissed (skipped or completed), allow interview to start
  useEffect(() => {
    if (config && !onboarding.isActive && !guideDismissed) {
      setGuideDismissed(true);
    }
  }, [config, onboarding.isActive, guideDismissed]);

  // ── Document PiP ──
  const { isPiPOpen, isSupported: isPiPSupported, openPiP, closePiP, pipRootRef } = useDocumentPiP();

  const handleToggleCaptions = useCallback(() => setShowChatMessage(prev => !prev), []);

  useEffect(() => {
    return () => {
      stopTts();
      stopListening();
    };
  }, [stopTts, stopListening]);


  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Preload animated WebP images
  useEffect(() => {
    const preloadImage = (src: string) => {
      const img = new Image();
      img.src = src;
    };

    // Preload all animation images (lightweight, no decode overhead like video)
    Object.values(animationStates).forEach(preloadImage);
  }, []);

  useEffect(() => {
    if (animationTransitionDebounceRef.current) {
      clearTimeout(animationTransitionDebounceRef.current);
    }

    // Helper to clean up thinking state when exiting
    const cleanupThinkingState = () => {
      if (thinkingTimerRef.current) {
        clearTimeout(thinkingTimerRef.current);
        thinkingTimerRef.current = null;
        // console.log(`[Thinking Animation] Exited thinking mode, timer cleared`);
      }
      hasSelectedAlternativeRef.current = false;
      if (activeThinkingVideo !== "thinking") {
        // console.log(`[Thinking Animation] Resetting to default: thinking`);
        setActiveThinkingVideo("thinking");
      }
    };

    const determineVideoState = () => {
      if (isInitializing) {
        cleanupThinkingState();
        return "juggling";
      }

      if (isActuallyPlaying) {
        cleanupThinkingState();
        return "speaking";
      }

      if (isListening) {
        cleanupThinkingState();
        return "listening";
      }

      const isInThinkingState =
        isLoading || isTtsActive || (!isListening && !isActuallyPlaying);

      if (isInThinkingState) {
        // Start timer to switch to alternative animation after 3 seconds
        if (!thinkingTimerRef.current) {
          // console.log(
          //   `[Thinking Animation] Entered thinking mode, starting 3s timer`
          // );
          // Reset to default thinking animation when entering thinking mode
          if (activeThinkingVideo !== "thinking") {
            setActiveThinkingVideo("thinking");
          }

          thinkingTimerRef.current = setTimeout(() => {
            // Filter out the last selected animation to ensure variety
            const lastAnimation = lastSelectedAnimationRef.current;
            const availableAnimations = alternativeThinkingVideos.filter(
              (video) => video !== lastAnimation
            );
            const randomIndex = Math.floor(
              Math.random() * availableAnimations.length
            );
            const selectedVideo = availableAnimations[randomIndex];

            // Track this selection to avoid repeating it next time
            lastSelectedAnimationRef.current = selectedVideo;

            // console.log(
            //   `[Thinking Animation] Switching to: ${selectedVideo} (from ${
            //     availableAnimations.length
            //   } options, previous: ${lastAnimation || "none"})`
            // );
            setActiveThinkingVideo(selectedVideo);
            hasSelectedAlternativeRef.current = true;
          }, 3000);
        }
        return activeThinkingVideo;
      } else {
        cleanupThinkingState();
        return "thinking";
      }
    };

    const newState = determineVideoState();

    const isHighPriority =
      (newState === "speaking" && isActuallyPlaying) ||
      (newState === "listening" && isListening) ||
      (newState === "juggling" && isInitializing);

    if (isHighPriority) {
      setCurrentVideoState(newState);
    } else {
      animationTransitionDebounceRef.current = setTimeout(() => {
        setCurrentVideoState(newState);
      }, 100);
    }
  }, [
    isInitializing,
    isLoading,
    isListening,
    isTtsActive,
    isActuallyPlaying,
    config,
    activeThinkingVideo,
  ]);

  useEffect(() => {
    return () => {
      if (thinkingTimerRef.current) {
        clearTimeout(thinkingTimerRef.current);
      }
      if (animationTransitionDebounceRef.current) {
        clearTimeout(animationTransitionDebounceRef.current);
      }
    };
  }, []);

  // No complex video loading logic needed - animated WebP images load instantly

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement
      )
        return;
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (isSpeechOutputEnabled) {
          startListening();
        } else if (!isLoading && input.trim() !== "") {
          sendMessage();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSpeechOutputEnabled, isListening, isLoading, input, startListening]);

  const scrollToBottom = () =>
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

  // Auto-scroll caption container as new text streams in
  useEffect(() => {
    if (fullCaption && captionScrollRef.current) {
      captionScrollRef.current.scrollTop = captionScrollRef.current.scrollHeight;
    }
  }, [fullCaption]);

  const sendMessage = () => {
    if (input.trim() && submitAnswer) {
      setSpokenCaption("");
      setFullCaption("");
      audioBufferRef.current = "";
      submitAnswer(input);
      setInput("");
    }
  };

  const handleMicClick = () => {
    if (isListening) {
      shouldResumeAfterTTSRef.current = false;
      stopListening();
    } else {
      if (isTtsActive) return;
      resetTranscript();
      startListening();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleEndCall = () => {
    forceEndRef.current = true;
    setIsEndCallClicked(true);
    if (isListening) {
      stopListening();
    }
    stopTts();
    if (submitAnswer) {
      submitAnswer("end the call");
    }
  };

  const handleMaximize = useCallback(() => {
    window.focus();
    closePiP();
  }, [closePiP]);

  // Mirror-render: keep PiP content in sync with interview state
  useEffect(() => {
    if (!isPiPOpen || !pipRootRef.current) return;
    pipRootRef.current.render(
      <InterviewPiP
        interviewerName="Zoe"
        remainingTime={remainingTime}
        currentlySpokenText={fullCaption}
        showCaptions={showChatMessage}
        isTtsActive={isTtsActive}
        isActuallyPlaying={isActuallyPlaying}
        isListening={isListening}
        isLoading={isLoading}
        onMicClick={handleMicClick}
        onToggleCaptions={handleToggleCaptions}
        onEndCall={handleEndCall}
        onStopSharing={() => screenCapturePanelRef.current?.stopSharing()}
        onMaximize={handleMaximize}
      />
    );
  });

  // Close PiP when interview completes
  useEffect(() => {
    if (isCompleted && isPiPOpen) closePiP();
  }, [isCompleted, isPiPOpen, closePiP]);

  if (!config) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-screen w-full h-screen flex flex-col bg-[#FBFAF8]">
      
      <div className="flex flex-col flex-1 relative overflow-hidden">
        <div
          className="flex flex-col items-center justify-center flex-1 w-full px-4 md:px-6 lg:px-8 relative"
          style={{
            background:
              "radial-gradient(53% 119.66% at 50% 47%, rgba(255, 255, 255, 0.3) 0%, rgba(111, 185, 113, 0.15) 100%)",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        >
          {/* Animation Avatar Container */}
          <div className="relative flex items-center justify-center shrink-0 my-6 md:my-8 lg:my-12">
            {isTtsActive && !isListening && (
              <div className="absolute ripple-effect" />
            )}
            <img
              src={animationStates[currentVideoState]}
              alt="Interview avatar"
              className="w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64 lg:w-72 lg:h-72 rounded-full object-cover relative z-10 shadow-md transition-opacity duration-200"
            />
          </div>

          {/* Loading text carousel — shown while first question loads */}
          {isFirstLoad && (
            <div className="w-full max-w-md mx-auto px-4 mt-4 md:mt-6 text-center">
              <p
                key={loadingTextIndex}
                className="text-gray-500 text-sm md:text-base font-medium animate-fade-in"
              >
                {loadingTexts[loadingTextIndex]}
              </p>
            </div>
          )}

          {/* Caption Container */}
          {!isFirstLoad && (
            <div
              className={`transition-opacity duration-300 w-full max-w-2xl lg:max-w-3xl mx-auto px-4 mt-4 md:mt-6 ${
                showChatMessage && fullCaption ? 'opacity-100' : 'opacity-0'
              }`}
              style={{ minHeight: "80px" }}
            >
              {showChatMessage && fullCaption && (
                <div
                  ref={captionScrollRef}
                  className="bg-white/95 backdrop-blur-md rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-sm border border-gray-200 relative z-20 max-h-40 md:max-h-48 overflow-y-auto"
                >
                  <p className="text-gray-800 text-sm md:text-base lg:text-lg font-medium leading-relaxed text-center">
                    {fullCaption}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Control Buttons */}
          <div
            className={`flex gap-3 md:gap-4 lg:gap-6 justify-center items-center mt-6 md:mt-10 lg:mt-16 mb-6 md:mb-8 ${
              config && !isCompleted ? "visible" : "invisible"
            }`}
          >
            {/* Microphone Button */}
            <div data-guide="mic-button" className="relative flex items-center justify-center">
              {isListening && (
                <div className="mic-ripple-container">
                  <div className="mic-ripple"></div>
                  <div className="mic-ripple"></div>
                  <div className="mic-ripple"></div>
                </div>
              )}
              <button
                aria-label={
                  isListening ? "Stop Speech Input" : "Start Speech Input"
                }
                onClick={handleMicClick}
                className="w-12 h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 rounded-2xl md:rounded-3xl shadow-sm hover:shadow-md hover:scale-105 active:scale-95 transition-all shrink-0 bg-white border border-gray-200 flex items-center justify-center group"
              >
                {isListening && !isTtsActive ? (
                  <AudioVisualizer isActive={isListening} size={40} />
                ) : (
                  <MicOff className="w-5 h-5 md:w-6 md:h-6 lg:w-7 lg:h-7 text-gray-600 group-hover:text-gray-900 transition-colors" />
                )}
              </button>
            </div>

            {/* Caption Toggle Button */}
            <button
              data-guide="captions-button"
              aria-label="Toggle captions"
              onClick={() => setShowChatMessage((prev) => !prev)}
              className="w-12 h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 rounded-2xl md:rounded-3xl shadow-sm hover:shadow-md bg-white hover:scale-105 active:scale-95 transition-all shrink-0 border border-gray-200 flex items-center justify-center group"
            >
              {showChatMessage ? (
                <Captions className="w-5 h-5 md:w-6 md:h-6 lg:w-7 lg:h-7 text-gray-600 group-hover:text-gray-900 transition-colors" />
              ) : (
                <CaptionsOff className="w-5 h-5 md:w-6 md:h-6 lg:w-7 lg:h-7 text-gray-600 group-hover:text-gray-900 transition-colors" />
              )}
            </button>

            {/* Screen Share / OCR Button — only shown when user opted in */}
            {config?.ocrEnabled && (
              <div data-guide="screenshare-button" className="contents">
                <ScreenCapturePanel
                  ref={screenCapturePanelRef}
                  onCaptureComplete={(text) => setOcrText(text)}
                  onShareStatusChange={(sharing) => {
                    setIsScreenSharing(sharing);
                    if (sharing && isPiPSupported && !isPiPOpen) openPiP();
                    if (!sharing && isPiPOpen) closePiP();
                  }}
                />
              </div>
            )}

            {/* PiP Mini View Button — only shown during screen share */}
            {isPiPSupported && isScreenSharing && !isCompleted && (
              <button
                aria-label={isPiPOpen ? "Close Mini View" : "Open Mini View"}
                onClick={isPiPOpen ? closePiP : openPiP}
                className={`w-12 h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 rounded-2xl md:rounded-3xl shadow-sm hover:shadow-md hover:scale-105 active:scale-95 transition-all shrink-0 border flex items-center justify-center group ${
                  isPiPOpen
                    ? "bg-blue-50 border-blue-300"
                    : "bg-white border-gray-200"
                }`}
              >
                <PictureInPicture2 className={`w-5 h-5 md:w-6 md:h-6 lg:w-7 lg:h-7 transition-colors ${
                  isPiPOpen
                    ? "text-blue-600"
                    : "text-gray-600 group-hover:text-gray-900"
                }`} />
              </button>
            )}

            {/* End Call Button */}
            <button
              data-guide="end-button"
              aria-label="End interview"
              onClick={() => handleEndCall()}
              className="w-12 h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 rounded-2xl md:rounded-3xl shadow-sm hover:shadow-md text-white bg-red-500 hover:bg-red-600 hover:scale-105 active:scale-95 transition-all shrink-0 border border-red-600 flex items-center justify-center"
            >
              <PhoneMissed className="w-5 h-5 md:w-6 md:h-6 lg:w-7 lg:h-7" />
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes ripple {
          0% {
            box-shadow: 0 0 0 0 rgba(232, 245, 233, 0.6),
              0 0 0 80px rgba(232, 245, 233, 0.4);
          }
          100% {
            box-shadow: 0 0 0 60px rgba(232, 245, 233, 0.4),
              0 0 0 160px rgba(232, 245, 233, 0);
          }
        }
        .ripple-effect {
          display: block;
          width: 200px;
          height: 200px;
          height: 200px;
          animation: ripple 1.5s ease-out infinite;
          border-radius: 9999px;
          position: absolute;
          z-index: 1;
        }
        
        @media (min-width: 640px) {
          .ripple-effect {
            width: 224px;
            height: 224px;
          }
        }
        
        @media (min-width: 768px) {
          .ripple-effect {
            width: 256px;
            height: 256px;
          }
        }
        
        @media (min-width: 1024px) {
          .ripple-effect {
            width: 288px;
            height: 288px;
          }
        }
        
        .mic-ripple-container {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: -1;
        }
        
        .mic-ripple {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: rgba(253, 238, 227, 0.8);
          transform: translate(-50%, -50%);
          animation: micRipple 1.8s ease-out infinite;
        }
        
        .mic-ripple:nth-child(1) {
          animation-delay: 0s;
        }
        .mic-ripple:nth-child(2) {
          animation-delay: 0.6s;
        }
        .mic-ripple:nth-child(3) {
          animation-delay: 1.2s;
        }
        
        @keyframes micRipple {
          0% {
            width: 60px;
            height: 60px;
            opacity: 0.8;
          }
          50% {
            width: 100px;
            height: 100px;
            opacity: 0.4;
          }
          100% {
            width: 140px;
            height: 140px;
            opacity: 0;
          }
        }
        
        @media (min-width: 768px) {
          @keyframes micRipple {
            0% {
              width: 70px;
              height: 70px;
              opacity: 0.8;
            }
            50% {
              width: 120px;
              height: 120px;
              opacity: 0.4;
            }
            100% {
              width: 170px;
              height: 170px;
              opacity: 0;
            }
          }
        }

        @keyframes fadeIn {
          0% { opacity: 0; transform: translateY(6px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.5s ease-out;
        }

      `}</style>

      {/* Onboarding Guide */}
      {onboarding.isActive && onboarding.currentStep && (
        <OnboardingOverlay
          step={onboarding.currentStep}
          stepIndex={onboarding.currentStepIndex}
          totalSteps={onboarding.totalSteps}
          isLastStep={onboarding.isLastStep}
          onNext={onboarding.next}
          onSkip={onboarding.skip}
        />
      )}
    </div>
  );
}
