import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { getEmailFromJWT, isValidJWTFormat } from "../utils/jwt";
import { motion } from "framer-motion"; 
import { Briefcase, BrainCircuit, Code2 } from "lucide-react";
import Header from "@/components/Header";
import InterviewCard from "@/components/InterviewCard";

export default function Home() {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const interviewTypes = [
    {
      id: "1-1-interview",
      icon: <Briefcase className="w-6 h-6 text-[#2B5E2B]" />,
      title: "1:1 Interview",
      description: "Test your knowledge, and practice your communication skills with an AI assistant.",
      estimatedTime: "5-10 mins",
      comingSoon: false,
    },
    {
      id: "flowchart",
      icon: <BrainCircuit className="w-6 h-6 text-[#2B5E2B]" />,
      title: "Critical Thinking with Flowchart",
      description: "Design flowcharts to test your problem-solving, algorithm, and process-thinking skills",
      estimatedTime: "15-20 mins",
      comingSoon: true,
    },
    {
      id: "competitive-coding",
      icon: <Code2 className="w-6 h-6 text-[#2B5E2B]" />,
      title: "Competitive coding",
      description: "Technical interview to solve algorithmic and data-structure problems under time pressure.",
      estimatedTime: "30-45 mins",
      comingSoon: true,
    },
  ];

  const handleCardClick = (id: string, isComingSoon: boolean) => {
    if (isComingSoon) {
      toast.info("This module is coming soon!");
      return;
    }
    setSelectedType(id);
    const token = searchParams.get("token") || searchParams.get("jwt");
    setTimeout(() => {
      navigate(token ? `/selfapply?token=${token}` : "/selfapply");
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
    // min-h-screen allows the page to grow, overflow-y-auto enables scrolling
    <div className="min-h-screen w-full bg-[#FBFAF8] flex flex-col font-sans overflow-y-auto">
      
      <Header />

      {/* Main UI - py-10 added for breathing room on mobile */}
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

        {/* Responsive Grid: 1 column on mobile, 3 on desktop */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full  text-left">
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
                onClick={() => handleCardClick(type.id, type.comingSoon)}
                isSelected={selectedType === type.id}
                comingSoon={type.comingSoon}
              />
            </motion.div>
          ))}
        </div>

        {/* System Hint */}
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