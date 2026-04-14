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
          group relative p-6 rounded-xl border transition-all duration-300 cursor-pointer 
          flex flex-col h-72 md:min-h-60 md:h-65 bg-white overflow-hidden
          ${isSelected ? "border-[#2B5E2B] ring-2 ring-[#E6F6EF] shadow-sm -translate-y-1" : "border-gray-200 shadow-none hover:shadow-sm hover:border-[#2B5E2B] hover:-translate-y-1"}
          ${comingSoon ? "opacity-80 cursor-not-allowed hover:translate-y-0 hover:shadow-none" : ""}
          ${className}
        `}
      >
        {/* Icon and Title Row */}
        <div className="flex items-start gap-4 mb-5">
            <div className="p-4 rounded-lg shrink-0 bg-[#E6F6EF]">
            {icon}
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <h4 className={`text-lg md:text-xl font-bold leading-tight transition-colors duration-300 ${comingSoon ? 'text-slate-700' : 'text-[#2B5E2B] group-hover:text-[#1a3a1b]'}`}>
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
        <p className="custom-scrollbar text-slate-500 text-sm leading-relaxed font-medium flex-1 min-h-0 overflow-y-auto pr-1">
          {description}
        </p>

        {/* Estimated Time */}
        {estimatedTime && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2 text-slate-400 group-hover:text-[#2B5E2B] transition-colors duration-300">
            <Clock size={16} className="group-hover:scale-110 transition-transform duration-300" />
            <span className="text-xs font-medium">{estimatedTime}</span>
          </div>
        )}
      </div>
    </>
  );
};

export default InterviewCard;
