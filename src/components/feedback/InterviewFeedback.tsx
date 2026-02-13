import { useState } from "react";
import { Button } from "@/components/ui/button";

interface InterviewFeedbackProps {
  onSubmit: (feedback: {
    questionRelevance: number;
    referralLikelihood: number;
  }) => void;
}

export function InterviewFeedback({ onSubmit }: InterviewFeedbackProps) {
  const [questionRelevance, setQuestionRelevance] = useState<number | null>(null);
  const [referralLikelihood, setReferralLikelihood] = useState<number | null>(null);

  const isComplete = questionRelevance !== null && referralLikelihood !== null;

  const handleSubmit = () => {
    if (isComplete) {
      onSubmit({
        questionRelevance: questionRelevance!,
        referralLikelihood: referralLikelihood!,
      });
    }
  };

  const RatingButtons = ({
    value,
    onChange,
    maxRating = 5,
  }: {
    value: number | null;
    onChange: (value: number) => void;
    maxRating?: number;
  }) => {
    return (
      <div className="flex items-center justify-center gap-2 md:gap-3">
        {Array.from({ length: maxRating }, (_, i) => i + 1).map((rating) => (
          <button
            key={rating}
            type="button"
            onClick={() => onChange(rating)}
            className={`
              w-12 h-12 md:w-14 md:h-14 rounded-xl font-bold text-base md:text-lg
              transition-all duration-200 border-2
              ${value === rating
                ? "bg-[#2B5E2B] text-white border-[#2B5E2B] shadow-lg scale-110"
                : "bg-white text-gray-600 border-slate-200 hover:border-[#2B5E2B] hover:scale-105"
              }
            `}
          >
            {rating}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#FBFAF8] flex flex-col items-center justify-center p-4 md:p-6">
      <div className="w-full max-w-4xl space-y-6 md:space-y-8">
        {/* Header */}
        <div className="text-center space-y-3 md:space-y-4">
          <div className="relative inline-block mb-3 md:mb-4">
            <div className="absolute inset-0 bg-green-100 blur-3xl rounded-full opacity-40"></div>
            <video
              src="/assets/thoughtbubble.mp4"
              autoPlay
              loop
              muted
              playsInline
              className="relative w-20 h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 object-contain"
            />
          </div>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-gray-900 tracking-tight px-2">
            Your Feedback Matters!
          </h1>
          <p className="text-sm md:text-base text-slate-600 font-medium max-w-2xl mx-auto px-4">
            Help us improve Zoe by sharing your experience
          </p>
        </div>

        {/* Feedback Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {/* Question Relevance Card */}
          <div className={`
            p-5 md:p-6 rounded-2xl md:rounded-3xl border-2 transition-all duration-300
            bg-white shadow-sm hover:shadow-lg
            ${questionRelevance !== null 
              ? "border-[#2B5E2B] ring-4 ring-[#E6F6EF]" 
              : "border-slate-200 hover:border-[#2B5E2B]"
            }
          `}>
            <div className="flex items-start gap-3 md:gap-4 mb-4 md:mb-6">
              <img 
                src="/assets/assessment.png" 
                alt="Assessment"
                className="w-12 h-12 md:w-14 md:h-14 shrink-0 object-contain"
              />
              <div className="flex-1">
                <h3 className="text-base md:text-lg font-bold text-gray-900 mb-1">
                  Question Quality
                </h3>
                <p className="text-xs md:text-sm text-slate-500 font-medium">
                  How useful were the interview questions?
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <RatingButtons
                value={questionRelevance}
                onChange={setQuestionRelevance}
                maxRating={5}
              />
              <div className="flex justify-between text-xs text-slate-400 px-1 font-medium">
                <span>Not useful</span>
                <span>Very useful</span>
              </div>
            </div>
          </div>

          {/* Referral Likelihood Card */}
          <div className={`
            p-5 md:p-6 rounded-2xl md:rounded-3xl border-2 transition-all duration-300
            bg-white shadow-sm hover:shadow-lg
            ${referralLikelihood !== null 
              ? "border-[#2B5E2B] ring-4 ring-[#E6F6EF]" 
              : "border-slate-200 hover:border-[#2B5E2B]"
            }
          `}>
            <div className="flex items-start gap-3 md:gap-4 mb-4 md:mb-6">
              <img 
                src="/assets/zoe-talking 1.svg" 
                alt="Recommendation"
                className="w-12 h-12 md:w-14 md:h-14 shrink-0 object-contain"
              />
              <div className="flex-1">
                <h3 className="text-base md:text-lg font-bold text-gray-900 mb-1">
                  Recommendation
                </h3>
                <p className="text-xs md:text-sm text-slate-500 font-medium">
                  Would you recommend Zoe to others?
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <RatingButtons
                value={referralLikelihood}
                onChange={setReferralLikelihood}
                maxRating={5}
              />
              <div className="flex justify-between text-xs text-slate-400 px-1 font-medium">
                <span>Not likely</span>
                <span>Very likely</span>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="text-center w-full max-w-md mx-auto px-2 md:px-0">
          <Button
            onClick={handleSubmit}
            disabled={!isComplete}
            className={`
              w-full py-4 md:py-6 px-4 md:px-8 rounded-2xl font-bold text-xs md:text-base shadow-lg
              transition-all duration-300 flex items-center justify-center gap-2 md:gap-3
              ${isComplete
                ? "bg-[#2B5E2B] hover:bg-[#1a3a1b] text-white hover:scale-[1.02] hover:shadow-xl active:scale-95"
                : "bg-slate-200 text-slate-400 cursor-not-allowed"
              }
            `}
          >
            <img
              src="/assets/bot-message-square (4).svg"
              className="w-4 h-4 md:w-6 md:h-6 shrink-0"
              alt="View Results"
            />
            <span className="whitespace-nowrap">
              {isComplete ? "View My Results" : "Please complete both ratings"}
            </span>
          </Button>
        </div>

        {/* Footer Note */}
        <p className="text-center text-xs text-slate-400 font-medium px-4">
          Your feedback helps us create better interview experiences
        </p>
      </div>
    </div>
  );
}

