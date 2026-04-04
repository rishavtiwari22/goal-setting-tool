import type { OnboardingStep } from "../../hooks/useOnboarding";

export const SETUP_GUIDE_STEPS: OnboardingStep[] = [
  {
    targetSelector: '[data-guide="mic-card"]',
    title: "Test Your Microphone",
    description:
      "Select your mic from the dropdown, then speak — watch the green dots light up to confirm it's working.",
    placement: "right",
    spotlightPadding: 12,
  },
  {
    targetSelector: '[data-guide="speaker-card"]',
    title: "Test Your Speaker",
    description:
      "Pick your speaker and listen for the test tone to confirm audio output works.",
    placement: "left",
    spotlightPadding: 12,
  },
  {
    targetSelector: '[data-guide="start-button"]',
    title: "Ready to Go!",
    description:
      "Once both devices show a green border, click here to start your interview with Zoe.",
    placement: "top",
    spotlightPadding: 8,
  },
];

export const INTERVIEW_GUIDE_STEPS: OnboardingStep[] = [
  {
    targetSelector: null,
    title: "How It Works",
    description:
      "Zoe will ask you questions one by one. Listen to the question, then click the mic to answer. Click the mic again when you're done speaking.",
  },
  {
    targetSelector: '[data-guide="mic-button"]',
    title: "Microphone",
    description:
      "Tap to start speaking. Tap again when done. Zoe hears everything while the mic is active.",
    placement: "top",
    spotlightPadding: 8,
  },
  {
    targetSelector: '[data-guide="captions-button"]',
    title: "Captions",
    description:
      "Show or hide Zoe's questions as text. Useful if you prefer reading along while listening.",
    placement: "top",
    spotlightPadding: 8,
  },
  {
    targetSelector: '[data-guide="end-button"]',
    title: "End Interview",
    description:
      "Click when you're ready to finish. Zoe will generate your feedback and score.",
    placement: "top",
    spotlightPadding: 8,
  },
];

export const INTERVIEW_GUIDE_STEPS_OCR: OnboardingStep[] = [
  {
    targetSelector: null,
    title: "How It Works",
    description:
      "Zoe will ask you coding questions. Share your screen so she can see your code editor, then answer using the mic.",
  },
  {
    targetSelector: '[data-guide="screenshare-button"]',
    title: "Share Your Screen",
    description:
      "Click to share your screen. Zoe will watch your code editor and ask relevant follow-up questions based on what she sees.",
    placement: "top",
    spotlightPadding: 8,
  },
  {
    targetSelector: '[data-guide="mic-button"]',
    title: "Microphone",
    description:
      "Tap to speak your answer. Tap again when done. You can code and talk at the same time.",
    placement: "top",
    spotlightPadding: 8,
  },
  {
    targetSelector: '[data-guide="captions-button"]',
    title: "Captions",
    description:
      "Show or hide Zoe's questions as text. In the mini view, captions appear as subtitles.",
    placement: "top",
    spotlightPadding: 8,
  },
  {
    targetSelector: null,
    title: "Mini View (PiP)",
    description:
      "When you share your screen, a mini floating window opens automatically with interview controls. Use it while you're in your code editor.",
  },
  {
    targetSelector: '[data-guide="end-button"]',
    title: "End Interview",
    description:
      "Click when you're ready to finish. Zoe will generate your feedback and score.",
    placement: "top",
    spotlightPadding: 8,
  },
];
