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
          group relative p-8 rounded-4xl border-2 transition-all duration-300 cursor-pointer 
          flex flex-col min-h-60 md:h-65 bg-white
          ${isSelected ? "border-[#2B5E2B] ring-4 ring-[#E6F6EF] shadow-xl -translate-y-2" : "border-slate-100 hover:border-[#2B5E2B] shadow-sm hover:shadow-2xl hover:-translate-y-2"}
          ${comingSoon ? "opacity-80 cursor-not-allowed hover:translate-y-0 hover:shadow-sm" : ""}
          ${className}
        `}
      >
        {/* Icon and Title Row */}
        <div className="flex items-center gap-4 mb-5">
          <div className="p-4 rounded-2xl shrink-0 bg-[#E6F6EF] group-hover:bg-[#2B5E2B] transition-all duration-300 group-hover:scale-110">
            <div className="group-hover:[&_svg]:text-white transition-colors duration-300">
              {icon}
            </div>
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
        <p className="text-slate-500 text-sm leading-relaxed font-medium overflow-hidden flex-1" style={{
          display: '-webkit-box',
          WebkitLineClamp: 4,
          WebkitBoxOrient: 'vertical',
        }}>
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
