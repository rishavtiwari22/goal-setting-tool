import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { FiSend, FiMic, FiMicOff, FiVolume2, FiVolumeX } from "react-icons/fi";
import { Captions, CaptionsOff, MicOff, PhoneMissed } from "lucide-react";
import { useInterview, type Message } from "../hooks/useInterview";
import type { InterviewConfig } from "../services/interview/interviewEngine";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";
import { useStreamingTTS } from "../hooks/useStreamingTTS";
import { useScreenWakeLock } from "../hooks/useScreenWakeLock";
import AudioVisualizer from "@/components/AudioVisualizer";
import type { InterviewSession } from "../models/interview";
import { loadInterviewSessionBySessionId, recoverOngoingSessionFromFirebase } from "../services/storage/interviewStorage";

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
  const [isVideoSwitching, setIsVideoSwitching] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const thinkingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasSelectedAlternativeRef = useRef<boolean>(false);
  const lastSelectedAnimationRef = useRef<string | null>(null);
  const videoTransitionDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const preloadedVideosRef = useRef<Set<string>>(new Set());
  const pendingSessionRef = useRef<InterviewSession | null>(null); // Store session to navigate after TTS

  const videoStates: { [key: string]: string } = {
    speaking: "/assets/speaking-edited.mp4",
    listening: "/assets/listening.mp4",
    thinking: "/assets/regular-thinking.mp4",
    juggling: "/assets/juggling.mp4",
    bubblepop: "/assets/bubblepop.mp4",
    glassadjustment: "/assets/glassadjustment.mp4",
    thoughtbubble: "/assets/thoughtbubble.mp4",
    ballbounce: "/assets/ballbounce.mp4",
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

  const {
    messages,
    isLoading,
    isCompleted,
    remainingTime,
    submitAnswer,
    sessionId: currentSessionId,
    currentQuestion,
  } = useInterview({
    config,
    sessionId,
    onComplete: handleComplete,
    onStreamChunk: (chunk) => {
      if (isSpeechOutputEnabled) {
        addTtsChunk(chunk);
      }
    },
    onStreamComplete: () => {
      if (isSpeechOutputEnabled) {
        finishTtsStreaming();
      }
    },
    onFeedback: (feedback) => {
      if (isSpeechOutputEnabled) {
        addTtsChunk(feedback);
        finishTtsStreaming();
      }
    },
  });

  useEffect(() => {
    if (currentSessionId && !sessionId) {
      navigate(`/interview/${currentSessionId}`, { replace: true });
    }
  }, [currentSessionId, sessionId, navigate]);

  const {
    isListening,
    isSpeechMode,
    startListening,
    stopListening,
    pauseListening,
    resumeListening,
  } = useSpeechRecognition({
    onSpeechResult: (text) => {
      // Clear previous captions when user responds
      clearCaption();
      submitAnswer(text);
    },
    enabled: true,
  });

  const {
    addChunk: addTtsChunk,
    finishStreaming: finishTtsStreaming,
    stop: stopTts,
    isSpeaking: isTtsActive,
    isActuallyPlaying,
    currentlySpokenText,
    clearCaption,
  } = useStreamingTTS({
    enabled: isSpeechOutputEnabled,
    onStartSpeaking: () => {
      pauseListening();
    },
    onStopSpeaking: () => {
      // Check if there's a pending session to navigate to results
      if (pendingSessionRef.current) {
        // TTS finished speaking the goodbye message, now navigate to results
        pendingSessionRef.current = null;
        navigate("/results");
        return;
      }

      if (!isCompleted && !forceEndRef.current) {
        resumeListening();
      }
    },
    onAudioStart: () => {
      // Audio actually started playing
    },
    onAudioStop: () => {
      // Audio chunk finished playing
    },
  });

  const isInterviewActive = !!config && !isCompleted;
  useScreenWakeLock(isInterviewActive);

  useEffect(() => {
    return () => {
      stopTts();
      stopListening();
    };
  }, [stopTts, stopListening]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const preloadVideo = (src: string) => {
      return new Promise<void>((resolve) => {
        const video = document.createElement("video");
        video.preload = "auto";
        video.src = src;

        const handleCanPlay = () => {
          preloadedVideosRef.current.add(src);
          resolve();
        };

        video.addEventListener("canplaythrough", handleCanPlay, { once: true });
        video.addEventListener("error", () => resolve(), { once: true });
        video.load();
      });
    };

    const priorityOrder = [
      videoStates.juggling,
      videoStates.thinking,
      videoStates.speaking,
      videoStates.listening,
      ...alternativeThinkingVideos.map((key) => videoStates[key]),
    ];

    (async () => {
      for (const src of priorityOrder) {
        await preloadVideo(src);
      }
    })();
  }, []);

  useEffect(() => {
    if (videoTransitionDebounceRef.current) {
      clearTimeout(videoTransitionDebounceRef.current);
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
      videoTransitionDebounceRef.current = setTimeout(() => {
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
      if (videoTransitionDebounceRef.current) {
        clearTimeout(videoTransitionDebounceRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    const initialSrc = videoStates["juggling"];
    videoEl.dataset.srcKey = initialSrc;
    videoEl.src = initialSrc;

    const handleInitialCanPlay = () => {
      videoEl.play().catch(() => {});
    };

    videoEl.addEventListener("canplay", handleInitialCanPlay, { once: true });
    videoEl.load();

    return () => {
      videoEl.removeEventListener("canplay", handleInitialCanPlay);
    };
  }, []);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    const newSrc = videoStates[currentVideoState];

    if (videoEl.dataset.srcKey === newSrc) {
      return;
    }

    const isPreloaded = preloadedVideosRef.current.has(newSrc);

    setIsVideoSwitching(true);

    const handleCanPlay = () => {
      setIsVideoSwitching(false);

      requestAnimationFrame(() => {
        videoEl.play().catch(() => {});
      });
    };

    if (isPreloaded) {
      videoEl.addEventListener("canplay", handleCanPlay, { once: true });
      videoEl.dataset.srcKey = newSrc;
      videoEl.src = newSrc;
    } else {
      const handleCanPlayThrough = () => {
        preloadedVideosRef.current.add(newSrc);
        handleCanPlay();
      };

      videoEl.addEventListener("canplaythrough", handleCanPlayThrough, {
        once: true,
      });
      videoEl.dataset.srcKey = newSrc;
      videoEl.src = newSrc;
      videoEl.load();

      return () => {
        videoEl.removeEventListener("canplaythrough", handleCanPlayThrough);
      };
    }

    return () => {
      videoEl.removeEventListener("canplay", handleCanPlay);
    };
  }, [currentVideoState]);

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

  const sendMessage = () => {
    if (input.trim() && submitAnswer) {
      // Clear previous captions when user responds
      clearCaption();
      submitAnswer(input);
      setInput("");
    }
  };

  const handleMicClick = () => {
    if (isSpeechMode) {
      stopListening();
    } else {
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
    if (isSpeechMode) {
      stopListening();
    }
    stopTts();
    if (submitAnswer) {
      submitAnswer("end the call");
    }
  };

  if (!config) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-screen w-full py-0 px-0 h-screen">
      <div className="flex flex-col h-full relative">
        <header className="border-b border-gray-200 bg-white">
          <div className="relative w-full px-6 py-4 flex items-center justify-center">
            <button
              onClick={() => navigate("/")}
              className="absolute left-6 text-gray-600 hover:text-gray-900"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M15 5L5 15M5 5L15 15"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <h1 className="text-base font-semibold">
              Zoe-Your Learning Assistant
            </h1>
          </div>
        </header>

        <div
          className="flex flex-col items-center justify-center flex-1 w-full px-5 relative overflow-hidden"
          style={{
            background:
              "radial-gradient(53% 119.66% at 50% 47%, rgba(255, 255, 255, 0.2) 0%, rgba(111, 185, 113, 0.2) 100%)",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        >
          <div
            className="relative flex items-center justify-center shrink-0"
            style={{ height: "320px", marginTop: "48px", marginBottom: "48px" }}
          >
            {isTtsActive && !isListening && (
              <div className="absolute ripple-effect" />
            )}
            <video
              ref={videoRef}
              autoPlay
              loop
              muted
              playsInline
              className={`video-smooth-transition ${
                isVideoSwitching ? "loading" : ""
              }`}
              style={{
                width: "260px",
                height: "259px",
                position: "relative",
                zIndex: 2,
                objectFit: "cover",
                borderRadius: "50%",
              }}
            />
          </div>

          <div
            className="caption-container transition-opacity duration-300"
            style={{
              opacity: showChatMessage && currentlySpokenText ? 1 : 0,
              height: "120px",
            }}
          >
            {showChatMessage && currentlySpokenText && (
              <p className="caption-text font-semibold">
                {currentlySpokenText}
              </p>
            )}
          </div>

          <div
            className="flex gap-6 justify-center items-center"
            style={{
              height: "64px",
              marginTop: "80px",
              visibility: config && !isCompleted ? "visible" : "hidden",
            }}
          >
            <div className="relative flex items-center justify-center">
              {isListening && (
                <div className="mic-ripple-container">
                  <div className="mic-ripple"></div>
                  <div className="mic-ripple"></div>
                  <div className="mic-ripple"></div>
                </div>
              )}
              <Button
                variant="ghost"
                size="icon-lg"
                aria-label={
                  isSpeechMode ? "Stop Speech Input" : "Start Speech Input"
                }
                onClick={handleMicClick}
                className="rounded-xl shadow-sm hover:scale-105 transition-transform flex-shrink-0 bg-white"
                style={{
                  width: "56px",
                  height: "56px",
                  minWidth: "56px",
                  minHeight: "56px",
                }}
              >
                {isSpeechMode && !isTtsActive ? (
                  <AudioVisualizer isActive={isListening} size={56} />
                ) : (
                  <MicOff className="size-6" />
                )}
              </Button>
            </div>

            <Button
              variant="ghost"
              size="icon-lg"
              aria-label="Type message"
              onClick={() => setShowChatMessage((prev) => !prev)}
              className="rounded-xl shadow-sm bg-white hover:scale-105 transition-transform flex-shrink-0"
              style={{
                width: "56px",
                height: "56px",
                minWidth: "56px",
                minHeight: "56px",
              }}
            >
              {showChatMessage ? (
                <Captions className="size-6" />
              ) : (
                <CaptionsOff className="size-6" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon-lg"
              aria-label={
                isSpeechOutputEnabled
                  ? "Disable Speech Output"
                  : "Enable Speech Output"
              }
              onClick={() => handleEndCall()}
              className="rounded-xl shadow-sm text-white bg-red-500 hover:scale-105 transition-transform flex-shrink-0"
              style={{
                width: "56px",
                height: "56px",
                minWidth: "56px",
                minHeight: "56px",
              }}
            >
              <PhoneMissed className="size-6" />
            </Button>
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
          width: 250px;
          height: 250px;
          animation: ripple 1.5s ease-out infinite;
          border-radius: 9999px;
          position: absolute;
          z-index: -1;
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
          width: 100px;
          height: 100px;
          border-radius: 50%;
          background: rgba(253, 238, 227, 1);
          transform: translate(-50%, -50%);
          animation: micRipple 1.5s ease-out infinite;
        }
        .mic-ripple:nth-child(1) {
          animation-delay: 0s;
        }
        .mic-ripple:nth-child(2) {
          animation-delay: 1s;
        }
        .mic-ripple:nth-child(3) {
          animation-delay: 2s;
        }
        @keyframes micRipple {
          0% {
            width: 80px;
            height: 80px;
            opacity: 1;
          }
          50% {
            width: 120px;
            height: 120px;
            opacity: 0.4;
          }
          100% {
            width: 160px;
            height: 160px;
            opacity: 0;
          }
        }
        .video-smooth-transition {
          opacity: 1;
          transition: opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          will-change: opacity;
        }
        .video-smooth-transition.loading {
          opacity: 0.3;
        }
        .caption-container {
          background: rgba(255, 255, 255, 0.6);
          border-radius: 3px;
          padding: 12px 16px;
          max-width: 850px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
          backdrop-filter: blur(8px);
          flex-shrink: 0;
          overflow: hidden;
        }
        .caption-text {
          overflow: auto;
          color: #1f2937;
          font-size: 21px;
          font-weight: semi-bold;
          line-height: 1.5;
          text-align: left;
          margin: 0;
          white-space: pre-wrap;
          word-wrap: break-word;
        }
      `}</style>
    </div>
  );
}
