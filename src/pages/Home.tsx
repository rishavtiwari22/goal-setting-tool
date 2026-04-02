import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { getEmailFromJWT, isValidJWTFormat } from "../utils/jwt";
import { motion } from "framer-motion";
import { Briefcase, BrainCircuit, GraduationCap } from "lucide-react";
import Header from "@/components/Header";
import InterviewCard from "@/components/InterviewCard";
import type { InterviewMode } from "../services/interview/interviewEngine";

export default function Home() {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const interviewTypes: {
    id: string;
    icon: React.ReactNode;
    title: string;
    description: string;
    estimatedTime: string;
    comingSoon: boolean;
    mode?: InterviewMode;
  }[] = [
    {
      id: "practice-interview",
      icon: <Briefcase className="w-6 h-6 text-[#2B5E2B]" />,
      title: "Practice Interview",
      description: "Simulate a real interview. Get evaluated on your answers, communication, and technical depth.",
      estimatedTime: "10-30 mins",
      comingSoon: false,
      mode: "practice",
    },
    {
      id: "mentor-session",
      icon: <GraduationCap className="w-6 h-6 text-[#2B5E2B]" />,
      title: "Mentor Guided Session",
      description: "Learn at your own pace with an AI mentor who teaches, hints, and guides you through concepts.",
      estimatedTime: "10-30 mins",
      comingSoon: false,
      mode: "mentor",
    },
    {
      id: "flowchart",
      icon: <BrainCircuit className="w-6 h-6 text-[#2B5E2B]" />,
      title: "Critical Thinking with Flowchart",
      description: "Design flowcharts to test your problem-solving, algorithm, and process-thinking skills.",
      estimatedTime: "15-20 mins",
      comingSoon: true,
    },
  ];

  const handleCardClick = (id: string, isComingSoon: boolean, mode?: InterviewMode) => {
    if (isComingSoon) {
      toast.info("This module is coming soon!");
      return;
    }
    setSelectedType(id);
    const token = searchParams.get("token") || searchParams.get("jwt");
    setTimeout(() => {
      navigate(token ? `/selfapply?token=${token}` : "/selfapply", { state: { mode } });
    }, 300);
  };

  useEffect(() => {
    const authenticateFromQuery = async () => {
      const token = searchParams.get("token") || searchParams.get("jwt");
      if (token && isValidJWTFormat(token)) {
        const email = getEmailFromJWT(token);
        if (email) {
          localStorage.setItem("studentToken", token);
          localStorage.setItem("studentEmail", email);
        }
      }
    };
    authenticateFromQuery();
  }, [searchParams]);

  return (
    <div className="min-h-screen w-full bg-[#FBFAF8] flex flex-col font-sans overflow-y-auto">

      <Header />

      <main className="flex-1 flex flex-col items-center justify-center max-w-6xl mx-auto px-6 py-10 w-full text-center">

        <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-4">
          <img
            src="/assets/thoughtbubble.webp"
            alt="Zoe"
            className="w-32 h-32 md:w-40 md:h-40 mx-auto object-contain"
          />
        </motion.div>

        <div className="mb-8 space-y-2">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight px-2">
            What would you like to practice today?
          </h2>
          <p className="text-slate-500 text-sm font-medium max-w-xl mx-auto px-4">
            By continuing, you agree to let us use this data to enhance learning experience.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full text-left">
          {interviewTypes.map((type, index) => (
            <motion.div
              key={type.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={!type.comingSoon ? { y: -8 } : {}}
            >
              <InterviewCard
                icon={type.icon}
                title={type.title}
                description={type.description}
                estimatedTime={type.estimatedTime}
                onClick={() => handleCardClick(type.id, type.comingSoon, type.mode)}
                isSelected={selectedType === type.id}
                comingSoon={type.comingSoon}
              />
            </motion.div>
          ))}
        </div>

        <div className="mt-12 mx-auto pb-6">
          <div className="px-6 py-2 bg-[#E8F3FF] border border-[#D0E7FF] rounded-full shadow-none inline-block">
            <span className="text-[10px] md:text-[12px] font-bold text-[#2D7FF9]">
               Please note that Zoe works best on Google Chrome
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
