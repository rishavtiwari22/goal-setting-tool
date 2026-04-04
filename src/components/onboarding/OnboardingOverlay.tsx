import { useEffect, useState, useCallback, useRef } from "react";
import type { OnboardingStep } from "../../hooks/useOnboarding";

interface OnboardingOverlayProps {
  step: OnboardingStep;
  stepIndex: number;
  totalSteps: number;
  isLastStep: boolean;
  onNext: () => void;
  onSkip: () => void;
}

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function OnboardingOverlay({
  step,
  stepIndex,
  totalSteps,
  isLastStep,
  onNext,
  onSkip,
}: OnboardingOverlayProps) {
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const [visible, setVisible] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Find and track target element position
  const updateRect = useCallback(() => {
    if (!step.targetSelector) {
      setTargetRect(null);
      return;
    }
    const el = document.querySelector(step.targetSelector);
    if (el) {
      const rect = el.getBoundingClientRect();
      const pad = step.spotlightPadding ?? 8;
      setTargetRect({
        top: rect.top - pad,
        left: rect.left - pad,
        width: rect.width + pad * 2,
        height: rect.height + pad * 2,
      });
      // Scroll into view on mobile
      if (window.innerWidth < 640) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    } else {
      setTargetRect(null);
    }
  }, [step.targetSelector, step.spotlightPadding]);

  // Recalculate on step change + resize
  useEffect(() => {
    setVisible(false);
    updateRect();
    const timer = setTimeout(() => setVisible(true), 50);

    const onResize = () => updateRect();
    window.addEventListener("resize", onResize);

    // ResizeObserver for target element
    let observer: ResizeObserver | null = null;
    if (step.targetSelector) {
      const el = document.querySelector(step.targetSelector);
      if (el) {
        observer = new ResizeObserver(updateRect);
        observer.observe(el);
      }
    }

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", onResize);
      observer?.disconnect();
    };
  }, [step.targetSelector, updateRect]);

  // Escape key dismisses
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onSkip();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onSkip]);

  const isCentered = !step.targetSelector || !targetRect;
  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;

  // Calculate card position
  const getCardStyle = (): React.CSSProperties => {
    if (isCentered || isMobile) {
      // Centered card or mobile bottom sheet
      if (isMobile) {
        return {
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          borderRadius: "16px 16px 0 0",
          maxWidth: "100%",
        };
      }
      return {
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        maxWidth: 360,
        width: "90vw",
      };
    }

    const placement = step.placement ?? "auto";
    const pad = 16;
    const cardWidth = 320;
    const rect = targetRect!;

    let top = 0;
    let left = 0;

    const calcPlacement = placement === "auto" ? autoPlace(rect) : placement;

    switch (calcPlacement) {
      case "bottom":
        top = rect.top + rect.height + pad;
        left = rect.left + rect.width / 2 - cardWidth / 2;
        break;
      case "top":
        top = rect.top - pad - 180; // approximate card height
        left = rect.left + rect.width / 2 - cardWidth / 2;
        break;
      case "right":
        top = rect.top + rect.height / 2 - 80;
        left = rect.left + rect.width + pad;
        break;
      case "left":
        top = rect.top + rect.height / 2 - 80;
        left = rect.left - cardWidth - pad;
        break;
    }

    // Clamp to viewport
    left = Math.max(12, Math.min(left, window.innerWidth - cardWidth - 12));
    top = Math.max(12, Math.min(top, window.innerHeight - 200));

    return {
      position: "fixed",
      top,
      left,
      width: cardWidth,
    };
  };

  return (
    <div
      ref={overlayRef}
      className={`fixed inset-0 z-[100] transition-opacity duration-300 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      onClick={onNext}
    >
      {/* Dimmed background */}
      {isCentered ? (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
      ) : (
        <>
          {/* Full overlay dim */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
          {/* Spotlight cutout */}
          {targetRect && (
            <div
              className="absolute bg-transparent transition-all duration-500 ease-out"
              style={{
                top: targetRect.top,
                left: targetRect.left,
                width: targetRect.width,
                height: targetRect.height,
                borderRadius: 16,
                boxShadow: "0 0 0 9999px rgba(0,0,0,0.5)",
                zIndex: 1,
              }}
            />
          )}
        </>
      )}

      {/* Floating card */}
      <div
        className={`bg-white rounded-xl shadow-2xl border-l-4 border-[#2B5E2B] p-5 transition-all duration-300 ${
          visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
        }`}
        style={{ ...getCardStyle(), zIndex: 2 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Step indicator */}
        <div className="flex items-center gap-1.5 mb-3">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === stepIndex
                  ? "w-6 bg-[#2B5E2B]"
                  : i < stepIndex
                  ? "w-1.5 bg-[#2B5E2B]/40"
                  : "w-1.5 bg-gray-200"
              }`}
            />
          ))}
          <span className="ml-auto text-xs text-gray-400 tabular-nums">
            {stepIndex + 1}/{totalSteps}
          </span>
        </div>

        {/* Content */}
        <h3 className="text-base font-bold text-gray-900 mb-1.5">
          {step.title}
        </h3>
        <p className="text-sm text-gray-500 leading-relaxed mb-4">
          {step.description}
        </p>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSkip();
            }}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors underline underline-offset-2"
          >
            Skip guide
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onNext();
            }}
            className="px-4 py-2 bg-[#2B5E2B] hover:bg-[#1a3a1b] text-white text-sm font-semibold rounded-lg transition-colors min-w-[80px]"
          >
            {isLastStep ? "Got it!" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}

function autoPlace(rect: TargetRect): "top" | "bottom" | "left" | "right" {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const centerY = rect.top + rect.height / 2;
  const centerX = rect.left + rect.width / 2;

  // Prefer bottom if there's space, else top, else side
  if (vh - (rect.top + rect.height) > 220) return "bottom";
  if (rect.top > 220) return "top";
  if (vw - (rect.left + rect.width) > 350) return "right";
  if (rect.left > 350) return "left";

  // Fallback: whichever side has more space
  return centerY < vh / 2 ? "bottom" : "top";
}
