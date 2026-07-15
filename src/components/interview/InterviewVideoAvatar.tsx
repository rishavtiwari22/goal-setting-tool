import { RefObject } from "react";

export interface InterviewVideoAvatarProps {
  remainingTime?: number | null;
  isTtsActive: boolean;
  isListening: boolean;
  currentVideoState: string;
  animationStates: { [key: string]: string };
}

export function InterviewVideoAvatar({
  remainingTime,
  isTtsActive,
  isListening,
  currentVideoState,
  animationStates,
}: InterviewVideoAvatarProps) {
  return (
    <>
      {/* Timer Display */}
      {remainingTime !== null && remainingTime !== undefined && (
        <div className="absolute top-4 left-4 md:top-6 md:left-6 z-20">
          <div className="flex items-center gap-3 rounded-full border border-white/70 bg-white/80 px-4 py-2.5 shadow-[0_10px_30px_rgba(37,99,235,0.12)] backdrop-blur-md ring-1 ring-indigo-100/80 transition-transform duration-200 hover:scale-[1.02]">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 text-indigo-700 shadow-sm">
              <svg className="h-4.5 w-4.5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="leading-none">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                Time left
              </p>
              <span
                className={`font-mono text-[22px] md:text-[24px] font-bold tracking-tight ${
                  remainingTime <= 30 ? "text-rose-600" : "text-slate-900"
                }`}
              >
                {String(Math.floor(remainingTime / 60)).padStart(2, "0")}:
                {String(remainingTime % 60).padStart(2, "0")}
              </span>
            </div>
          </div>
        </div>
      )}

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
    </>
  );
}
