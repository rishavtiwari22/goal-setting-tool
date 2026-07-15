import { RefObject } from "react";

export interface InterviewChatAreaProps {
  isFirstLoad: boolean;
  hasConflictModal: boolean;
  loadingTexts: string[];
  loadingTextIndex: number;
  showChatMessage: boolean;
  fullCaption: string;
  captionScrollRef: RefObject<HTMLDivElement | null>;
}

export function InterviewChatArea({
  isFirstLoad,
  hasConflictModal,
  loadingTexts,
  loadingTextIndex,
  showChatMessage,
  fullCaption,
  captionScrollRef,
}: InterviewChatAreaProps) {
  return (
    <>
      {/* Loading text carousel — shown while first question loads */}
      {isFirstLoad && !hasConflictModal && (
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
            showChatMessage && fullCaption ? "opacity-100" : "opacity-0"
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
    </>
  );
}
