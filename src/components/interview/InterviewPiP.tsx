// Keyframe CSS injected into the PiP window
export const PIP_ANIMATION_CSS = `
  @keyframes pip-wave {
    0%, 100% { height: 4px; }
    50% { height: 16px; }
  }
  @keyframes pip-wave-2 {
    0%, 100% { height: 6px; }
    50% { height: 20px; }
  }
  @keyframes pip-wave-3 {
    0%, 100% { height: 4px; }
    50% { height: 14px; }
  }
  @keyframes pip-pulse {
    0% { transform: translate(-50%, -50%) scale(1); opacity: 0.6; }
    100% { transform: translate(-50%, -50%) scale(2.2); opacity: 0; }
  }
  @keyframes pip-bounce {
    0%, 80%, 100% { transform: translateY(0); }
    40% { transform: translateY(-6px); }
  }
`;

interface InterviewPiPProps {
  interviewerName: string;
  remainingTime: number | null;
  currentlySpokenText: string;
  showCaptions: boolean;
  isTtsActive: boolean;
  isActuallyPlaying: boolean;
  isListening: boolean;
  isLoading: boolean;
  onMicClick: () => void;
  onToggleCaptions: () => void;
  onEndCall: () => void;
  onStopSharing: () => void;
  onMaximize: () => void;
}

// Lucide icon SVG paths (same as the main UI uses)
const ICON = {
  mic: (
    <>
      <path d="M12 19v3" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <rect x="9" y="2" width="6" height="13" rx="3" />
    </>
  ),
  micOff: (
    <>
      <path d="M12 19v3" />
      <path d="M15 9.34V5a3 3 0 0 0-5.68-1.33" />
      <path d="M16.95 16.95A7 7 0 0 1 5 12v-2" />
      <path d="M18.89 13.23A7 7 0 0 0 19 12v-2" />
      <path d="m2 2 20 20" />
      <path d="M9 9v3a3 3 0 0 0 5.12 2.12" />
    </>
  ),
  captions: (
    <>
      <rect width="18" height="14" x="3" y="5" rx="2" ry="2" />
      <path d="M7 15h4M15 15h2M7 11h2M13 11h4" />
    </>
  ),
  captionsOff: (
    <>
      <path d="M10.5 5H19a2 2 0 0 1 2 2v8.5" />
      <path d="M17 11h-.5" />
      <path d="M19 19H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2" />
      <path d="m2 2 20 20" />
      <path d="M7 11h4" />
      <path d="M7 15h2.5" />
    </>
  ),
  phoneMissed: (
    <>
      <path d="m16 2 6 6" />
      <path d="m22 2-6 6" />
      <path d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384" />
    </>
  ),
  monitorOff: (
    <>
      <path d="M17 17H4a2 2 0 0 1-2-2V5c0-1.5 1-2 1-2" />
      <path d="M22 15V5a2 2 0 0 0-2-2H9" />
      <path d="M8 21h8" />
      <path d="M12 17v4" />
      <path d="m2 2 20 20" />
    </>
  ),
  maximize: (
    <>
      <polyline points="15 3 21 3 21 9" />
      <polyline points="9 21 3 21 3 15" />
      <line x1="21" x2="14" y1="3" y2="10" />
      <line x1="3" x2="10" y1="21" y2="14" />
    </>
  ),
} as const;

function Icon({ name, size = 18 }: { name: keyof typeof ICON; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {ICON[name]}
    </svg>
  );
}

function formatTime(seconds: number | null): string {
  if (seconds === null || seconds <= 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function InterviewPiP({
  interviewerName,
  remainingTime,
  currentlySpokenText,
  showCaptions,
  isTtsActive,
  isActuallyPlaying,
  isListening,
  isLoading,
  onMicClick,
  onToggleCaptions,
  onEndCall,
  onStopSharing,
  onMaximize,
}: InterviewPiPProps) {
  const isThinking = isLoading || (isTtsActive && !isActuallyPlaying);

  return (
    <div
      style={{
        width: "100%",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#1a1a2e",
        color: "#fff",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        overflow: "hidden",
        userSelect: "none",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 12px",
          backgroundColor: "#16213e",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: "#4ade80",
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: "12px",
              fontWeight: 600,
              color: "#e2e8f0",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: "200px",
            }}
          >
            {interviewerName}
          </span>
        </div>
        <span
          style={{
            fontSize: "12px",
            fontWeight: 600,
            color: "#94a3b8",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {formatTime(remainingTime)}
        </span>
      </div>

      {/* State indicator */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "40px",
          flexShrink: 0,
        }}
      >
        {isActuallyPlaying ? (
          // Speaking: animated green bars
          <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
            <div
              style={{
                width: 3,
                backgroundColor: "#4ade80",
                borderRadius: 2,
                animation: "pip-wave 0.8s ease-in-out infinite",
              }}
            />
            <div
              style={{
                width: 3,
                backgroundColor: "#4ade80",
                borderRadius: 2,
                animation: "pip-wave-2 0.8s ease-in-out 0.15s infinite",
              }}
            />
            <div
              style={{
                width: 3,
                backgroundColor: "#4ade80",
                borderRadius: 2,
                animation: "pip-wave-3 0.8s ease-in-out 0.3s infinite",
              }}
            />
            <span
              style={{
                fontSize: "11px",
                color: "#4ade80",
                marginLeft: "6px",
                fontWeight: 500,
              }}
            >
              Speaking
            </span>
          </div>
        ) : isListening ? (
          // Listening: amber pulse
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div
              style={{
                position: "relative",
                width: 20,
                height: 20,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  backgroundColor: "rgba(251, 191, 36, 0.3)",
                  animation: "pip-pulse 1.5s ease-out infinite",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  backgroundColor: "#fbbf24",
                }}
              />
            </div>
            <span
              style={{
                fontSize: "11px",
                color: "#fbbf24",
                fontWeight: 500,
              }}
            >
              Listening...
            </span>
          </div>
        ) : isThinking ? (
          // Thinking: bouncing dots
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  backgroundColor: "#94a3b8",
                  animation: `pip-bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                }}
              />
            ))}
            <span
              style={{
                fontSize: "11px",
                color: "#94a3b8",
                marginLeft: "4px",
                fontWeight: 500,
              }}
            >
              Thinking
            </span>
          </div>
        ) : (
          // Idle
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: "#475569",
              }}
            />
            <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 500 }}>
              Ready
            </span>
          </div>
        )}
      </div>

      {/* Caption area */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "4px 16px 8px",
          overflowY: "auto",
          overflowX: "hidden",
        }}
      >
        {showCaptions && currentlySpokenText ? (
          <p
            style={{
              fontSize: "14px",
              lineHeight: 1.5,
              color: "#e2e8f0",
              textAlign: "center",
              margin: 0,
            }}
          >
            {currentlySpokenText}
          </p>
        ) : (
          <p
            style={{
              fontSize: "12px",
              color: "#475569",
              textAlign: "center",
              fontStyle: "italic",
              margin: 0,
            }}
          >
            {showCaptions ? "Waiting for response..." : "Captions off"}
          </p>
        )}
      </div>

      {/* Controls */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 12px 10px",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", gap: "8px" }}>
          {/* Mic button */}
          <button
            onClick={onMicClick}
            title={isListening ? "Mute mic" : "Unmute mic"}
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: isListening ? "#fbbf24" : "#334155",
              color: isListening ? "#1a1a2e" : "#94a3b8",
              transition: "background-color 0.15s, color 0.15s",
            }}
          >
            <Icon name={isListening ? "mic" : "micOff"} />
          </button>

          {/* Captions button */}
          <button
            onClick={onToggleCaptions}
            title={showCaptions ? "Hide captions" : "Show captions"}
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: showCaptions ? "#3b82f6" : "#334155",
              color: showCaptions ? "#fff" : "#94a3b8",
              transition: "background-color 0.15s, color 0.15s",
            }}
          >
            <Icon name={showCaptions ? "captions" : "captionsOff"} />
          </button>

          {/* Stop sharing button */}
          <button
            onClick={onStopSharing}
            title="Stop screen sharing"
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#f97316",
              color: "#fff",
              transition: "background-color 0.15s",
            }}
          >
            <Icon name="monitorOff" />
          </button>

          {/* End call button */}
          <button
            onClick={onEndCall}
            title="End interview"
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#ef4444",
              color: "#fff",
              transition: "background-color 0.15s",
            }}
          >
            <Icon name="phoneMissed" />
          </button>
        </div>

        {/* Maximize / Return button */}
        <button
          onClick={onMaximize}
          title="Return to full view"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            padding: "6px 10px",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.12)",
            cursor: "pointer",
            backgroundColor: "transparent",
            color: "#94a3b8",
            fontSize: "11px",
            fontWeight: 500,
            transition: "background-color 0.15s, color 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.08)";
            e.currentTarget.style.color = "#e2e8f0";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
            e.currentTarget.style.color = "#94a3b8";
          }}
        >
          <Icon name="maximize" size={14} />
          Return
        </button>
      </div>
    </div>
  );
}
