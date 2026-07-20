import React from "react";
import { getCurrentUserEmail } from "../config/auth";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { getResumeBuddyUrl } from "../utils/zuvySource";
import { motion } from "framer-motion";
import { BrainCircuit, GraduationCap, Info } from "lucide-react";
import Header from "@/components/Header";
import HomeInterviewCard from "@/components/HomeInterviewcard";
import type { InterviewMode } from "../services/interview/interviewEngine";

function buildInterviewConfig(mode: InterviewMode, saveMode: 'append' | 'override') {
  return {
    jobId: null,
    jobTitle: mode === 'goal-setting' ? "Daily Goal Setting" : "End of Day Reflection",
    jobDescription: "",
    technicalSkills: [],
    softSkills: [],
    mode,
    mentorProfile: null,
    ocrEnabled: false,
    turnLimit: undefined,
    interviewTime: 15,
    targetDate: null,
    goalSaveMode: saveMode,
  };
}

export default function Home() {
  const resumeBuddyUrl = getResumeBuddyUrl();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Always launch directly into the interview with append mode — no popup, no intermediate page
  const handleCardClick = (id: string, isComingSoon: boolean, mode?: InterviewMode) => {
    if (isComingSoon) {
      toast.info("This module is coming soon!");
      return;
    }
    if (!mode) return;
    const config = buildInterviewConfig(mode, 'append');
    sessionStorage.setItem("interviewConfig", JSON.stringify(config));
    navigate("/interview");
  };

  const interviewTypes: {
    id: string;
    icon: React.ReactNode;
    title: string;
    description: string;
    estimatedTime: string;
    comingSoon: boolean;
    mode?: InterviewMode;
    theme?: "green" | "purple";
  }[] = [
    {
      id: "goal-setting",
      icon: <BrainCircuit className="w-8 h-8" />,
      title: "Daily Goal Setting",
      description: "Work with your AI Mentor to define a clear, specific, and measurable goal for today.",
      estimatedTime: "10-15 mins",
      comingSoon: false,
      mode: "goal-setting",
      theme: "green" as const,
    },
    {
      id: "reflection",
      icon: <GraduationCap className="w-8 h-8" />,
      title: "End of Day Reflection",
      description: "Review your progress, discuss blockers, and reflect on what you learned today.",
      estimatedTime: "10-15 mins",
      comingSoon: false,
      mode: "reflection",
      theme: "purple" as const,
    },
  ];

  return (
    <div className="min-h-screen w-full bg-[#FBFAF8] flex flex-col font-sans overflow-y-auto">
      <Header />

      <main className="flex-1 flex flex-col items-center justify-center w-full max-w-full mx-auto px-6 py-10 text-center">

        <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-4">
          <img
            src="/assets/thoughtbubble.webp"
            alt="Zoe"
            className="w-32 h-32 md:w-40 md:h-40 mx-auto object-contain"
          />
        </motion.div>

        <div className="mb-10 space-y-3">
          <div className="inline-block px-4 py-1.5 bg-green-100 text-green-800 rounded-full text-xs font-bold tracking-wider uppercase mb-2">
            AI SMART Goal Coach
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight px-2">
            What would you like to do today?
          </h2>
          <p className="text-slate-500 text-sm md:text-base font-medium max-w-xl mx-auto px-4">
            Start your day with a clear plan, and end it with a meaningful reflection.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full text-left max-w-4xl px-4">
          {interviewTypes.map((type, index) => (
            <motion.div
              key={type.id}
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <HomeInterviewCard
                icon={type.icon}
                title={type.title}
                description={type.description}
                estimatedTime={type.estimatedTime}
                theme={type.theme}
                onClick={() => {
                  handleCardClick(type.id, type.comingSoon, type.mode);
                }}
                onSecondaryClick={(e) => {
                  e.stopPropagation();
                  handleCardClick(type.id, type.comingSoon, type.mode);
                }}
                className="w-full"
              />
            </motion.div>
          ))}
        </div>

        <div className="mt-12 mx-auto pb-6">
          <div className="px-5 py-3 bg-[rgb(204,253,209)] rounded-full shadow-none inline-flex items-center gap-2">
            <Info className="w-4 h-4 shrink-0 text-[rgb(204,253,209)] bg-[rgb(0,107,12)] rounded-full" />
            <span className="text-[10px] md:text-[12px] font-bold text-[rgb(0,107,12)]">
              Please note that Smart works best on Google Chrome
            </span>
          </div>
        </div>

      </main>



      <style>{`
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        .animate-bounce-slow { animation: bounce-slow 4s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
