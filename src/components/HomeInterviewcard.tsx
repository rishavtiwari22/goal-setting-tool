import React from "react";
import { ArrowRight, Clock } from "lucide-react";

interface InterviewCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  isSelected?: boolean;
  comingSoon?: boolean;
  estimatedTime?: string;
  ctaLabel?: string;
  className?: string;
}

const HomeInterviewCard: React.FC<InterviewCardProps> = ({
  icon,
  title,
  description,
  onClick,
  isSelected = false,
  comingSoon = false,
  estimatedTime,
  ctaLabel = "Get Started",
  className = "",
}) => {
  return (
    <>
      <div
        className={`
          group relative p-6 rounded-4xl transition-all duration-300 
          flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 min-h-fit
          ${comingSoon ? "bg-[rgb(235,251,232)] opacity-80" : "bg-white"}
          ${isSelected ? "border-[#2B5E2B] ring-2 ring-[#E6F6EF] shadow-md" : "shadow-sm hover:shadow-md hover:border-[rgb(178,210,182)]"}
          ${comingSoon ? "hover:translate-y-0 hover:shadow-sm" : ""}
          ${className}
        `}
      >
        <div className="p-4 rounded-lg shrink-0 self-start sm:self-auto bg-[rgb(132,253,117)] text-[rgb(0,107,32)]">
            {icon}
        </div>

        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <h4 className={`text-lg md:text-xl font-bold leading-tight ${comingSoon ? 'text-slate-700' : 'text-slate-900'}`}>
              {title}
            </h4>
            {comingSoon && (
              <span className="px-2 py-0.5 rounded-full bg-[#B6DDB6] text-[10px] font-bold tracking-wide text-[rgb(0,107,32)] uppercase">
                Coming Soon
              </span>
            )}
          </div>
          <p className="text-slate-600 text-sm leading-relaxed font-medium mt-2">
            {description}
          </p>
          {estimatedTime && (
            <div className="mt-2 flex items-center gap-1.5 text-slate-500">
              <Clock size={14} />
              <span className="text-xs font-medium">{estimatedTime}</span>
            </div>
          )}
        </div>

        <div className="shrink-0 w-full sm:w-auto">
          <button
            type="button"
            onClick={onClick}
            disabled={comingSoon}
            className={`w-full sm:w-auto justify-center px-4 py-2 rounded-full bg-[rgb(242,247,243)] flex items-center gap-2 font-medium ${comingSoon ? 'text-slate-400 cursor-not-allowed' : 'text-[rgb(0,107,32)] cursor-pointer'}`}
          >
            {!comingSoon && (
              <>
                <span className="text-sm">{ctaLabel}</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
};

export default HomeInterviewCard;
