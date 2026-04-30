import { useState, useCallback, useEffect, useRef } from "react";

export interface OnboardingStep {
  /** CSS selector for the target element, e.g. '[data-guide="mic-button"]'. Null = centered card (no spotlight). */
  targetSelector: string | null;
  title: string;
  description: string;
  placement?: "top" | "bottom" | "left" | "right" | "auto";
  spotlightPadding?: number;
}

interface UseOnboardingOptions {
  storageKey: string;
  steps: OnboardingStep[];
  /** Delay activation until this is true (e.g. wait for UI to load) */
  enabled?: boolean;
}

export function useOnboarding({ storageKey, steps, enabled = true }: UseOnboardingOptions) {
  const [isActive, setIsActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const hasInitialized = useRef(false);

  // Activate on mount if not previously dismissed
  useEffect(() => {
    if (hasInitialized.current || !enabled) return;
    hasInitialized.current = true;

    const dismissed = localStorage.getItem(storageKey);
    if (dismissed !== "true" && steps.length > 0) {
      setIsActive(true);
      setCurrentStepIndex(0);
    }
  }, [enabled, storageKey, steps.length]);

  // Filter steps: skip ones whose target element doesn't exist in DOM
  const getValidStepIndex = useCallback(
    (fromIndex: number): number => {
      for (let i = fromIndex; i < steps.length; i++) {
        const step = steps[i];
        if (!step.targetSelector) return i; // centered card — always valid
        if (document.querySelector(step.targetSelector)) return i;
      }
      return -1; // no more valid steps
    },
    [steps]
  );

  const dismiss = useCallback(() => {
    localStorage.setItem(storageKey, "true");
    setIsActive(false);
  }, [storageKey]);

  const next = useCallback(() => {
    const nextValid = getValidStepIndex(currentStepIndex + 1);
    if (nextValid === -1) {
      dismiss();
    } else {
      setCurrentStepIndex(nextValid);
    }
  }, [currentStepIndex, getValidStepIndex, dismiss]);

  const skip = useCallback(() => {
    dismiss();
  }, [dismiss]);

  // On activation, jump to first valid step
  useEffect(() => {
    if (!isActive) return;
    const firstValid = getValidStepIndex(0);
    if (firstValid === -1) {
      dismiss();
    } else if (firstValid !== currentStepIndex) {
      setCurrentStepIndex(firstValid);
    }
  }, [isActive]); // eslint-disable-line react-hooks/exhaustive-deps

  const currentStep = isActive ? steps[currentStepIndex] ?? null : null;
  const totalSteps = steps.length;
  const isLastStep = currentStepIndex >= steps.length - 1 || getValidStepIndex(currentStepIndex + 1) === -1;

  return {
    isActive,
    currentStepIndex,
    currentStep,
    totalSteps,
    isLastStep,
    next,
    skip,
  };
}
