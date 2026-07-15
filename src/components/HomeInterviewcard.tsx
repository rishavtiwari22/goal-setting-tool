import React from "react";
import { ArrowRight, Clock, Sparkles } from "lucide-react";

interface InterviewCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  onSecondaryClick?: (e: React.MouseEvent) => void;
  estimatedTime?: string;
  theme?: "green" | "purple";
  className?: string;
}

const HomeInterviewCard: React.FC<InterviewCardProps> = ({
  icon,
  title,
  description,
  onClick,
  onSecondaryClick,
  estimatedTime,
  theme = "green",
  className = "",
}) => {
  const isGreen = theme === "green";

  return (
    <div
      onClick={onClick}
      className={`
        relative overflow-hidden cursor-pointer bg-white
        rounded-[2rem] p-8 min-h-[400px] flex flex-col justify-between
        transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)]
        shadow-[0_4px_24px_rgba(0,0,0,0.04)]
        border border-slate-100
        border-b-8
        ${isGreen ? 'border-b-green-300 hover:border-b-green-400' : 'border-b-purple-400 hover:border-b-purple-500'}
        ${className}
      `}
    >
      {/* Background Decoratives */}
      <div className={`absolute -right-20 -bottom-20 w-64 h-64 rounded-full opacity-30 ${isGreen ? 'bg-green-100' : 'bg-purple-100'}`} />
      
      {/* Fake dashed lines using SVG */}
      <svg className="absolute bottom-10 right-0 w-3/4 h-1/2 opacity-30 pointer-events-none" viewBox="0 0 200 100" fill="none">
        <path d="M0,100 C50,100 50,20 120,50 S180,0 200,0" stroke={isGreen ? "#4ade80" : "#a855f7"} strokeWidth="1" strokeDasharray="4 4" />
        <circle cx="120" cy="50" r="6" stroke={isGreen ? "#4ade80" : "#a855f7"} strokeWidth="1" strokeDasharray="2 2" fill="none" />
        <path d="M125,55 L130,60 L125,65" stroke={isGreen ? "#4ade80" : "#a855f7"} strokeWidth="1" fill="none" />
      </svg>

      <div className="z-10 relative">
        <div className="flex justify-between items-start mb-6">
          <div className={`p-3 rounded-2xl ${isGreen ? 'bg-green-50 text-green-600' : 'bg-purple-50 text-purple-600'}`}>
            {icon}
          </div>
          <Sparkles className={`w-6 h-6 ${isGreen ? 'text-green-200' : 'text-purple-200'}`} />
        </div>

        <h3 className="text-3xl font-black text-slate-900 leading-[1.15] tracking-tight whitespace-pre-line mb-3">
          {title.replace(" ", "\n")}
        </h3>
        
        <div className={`w-10 h-1 mb-6 rounded-full ${isGreen ? 'bg-green-400' : 'bg-purple-400'}`} />

        <p className="text-slate-500 font-medium leading-relaxed max-w-[90%] text-[15px]">
          {description}
        </p>
      </div>

      <div className="flex justify-between items-end mt-8 z-10 relative">
        {estimatedTime && (
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold text-sm ${isGreen ? 'bg-green-50 text-green-700' : 'bg-purple-50 text-purple-700'}`}>
            <Clock size={14} />
            {estimatedTime}
          </div>
        )}

        <div className="flex items-center gap-3">
          {onSecondaryClick && (
            <button
              onClick={onSecondaryClick}
              className={`p-3 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-sm hover:shadow-md ${isGreen ? 'bg-white text-green-500 hover:bg-green-100 hover:text-green-700' : 'bg-white text-purple-400 hover:bg-purple-100 hover:text-purple-700'}`}
              title="Type details manually"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 8h.01"/><path d="M12 12h.01"/><path d="M14 8h.01"/><path d="M16 12h.01"/><path d="M18 8h.01"/><path d="M6 8h.01"/><path d="M7 16h10"/><path d="M8 12h.01"/><rect width="20" height="16" x="2" y="4" rx="2"/></svg>
            </button>
          )}

          <button
            className={`
              w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform duration-300 hover:scale-110
              ${isGreen ? 'bg-white text-green-600 hover:bg-green-50' : 'bg-purple-500 text-white hover:bg-purple-600'}
            `}
          >
            <ArrowRight size={24} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default HomeInterviewCard;
