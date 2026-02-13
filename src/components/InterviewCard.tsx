import React from "react";
import { Clock } from "lucide-react";

interface InterviewCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  isSelected?: boolean;
  comingSoon?: boolean;
  estimatedTime?: string;
  className?: string;
}

const InterviewCard: React.FC<InterviewCardProps> = ({
  icon,
  title,
  description,
  onClick,
  isSelected = false,
  comingSoon = false,
  estimatedTime,
  className = "",
}) => {
  return (
    <>
      <div
        onClick={onClick}
        className={`
          group relative p-8 rounded-4xl border-2 transition-all cursor-pointer 
          flex flex-col min-h-60 md:h-65 bg-white
          ${isSelected ? "border-[#00A35C] ring-4 ring-[#E6F6EF]" : "border-slate-100 hover:border-slate-300 shadow-sm"}
          ${comingSoon ? "opacity-80 cursor-not-allowed" : ""}
          ${className}
        `}
      >
        {/* Icon and Title Row */}
        <div className="flex items-center gap-4 mb-5">
          <div className="p-4 rounded-2xl shrink-0 bg-[#E6F6EF]">
            {icon}
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <h4 className={`text-lg md:text-xl font-bold leading-tight ${comingSoon ? 'text-slate-700' : 'text-[#00A35C]'}`}>
              {title}
            </h4>
            {comingSoon && (
              <div className="mt-2">
                <span className="px-3 py-1 bg-[#FF9900] text-white text-[9px] font-black uppercase tracking-wider rounded-full shadow-sm inline-block">
                  Coming Soon
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        <p className="text-slate-500 text-sm leading-relaxed font-medium overflow-hidden flex-1" style={{
          display: '-webkit-box',
          WebkitLineClamp: 4,
          WebkitBoxOrient: 'vertical',
        }}>
          {description}
        </p>

        {/* Estimated Time */}
        {estimatedTime && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2 text-slate-400">
            <Clock size={16} />
            <span className="text-xs font-medium">{estimatedTime}</span>
          </div>
        )}
      </div>
    </>
  );
};

export default InterviewCard;
