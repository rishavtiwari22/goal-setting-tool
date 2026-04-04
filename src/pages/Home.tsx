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
  const [email, setEmail] = useState(localStorage.getItem("studentEmail") || "");
  const [needsEmail, setNeedsEmail] = useState(false);
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

    const token = searchParams.get("token") || searchParams.get("jwt");
    const storedEmail = localStorage.getItem("studentEmail");

    // If no token and no email stored, prompt for email first
    if (!token && !storedEmail) {
      setNeedsEmail(true);
      setSelectedType(id);
      return;
    }

    setSelectedType(id);
    setTimeout(() => {
      navigate(token ? `/selfapply?token=${token}` : "/selfapply", { state: { mode } });
    }, 300);
  };

  const handleEmailSubmit = () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }
    localStorage.setItem("studentEmail", trimmed);
    setNeedsEmail(false);

    const selectedMode = interviewTypes.find(t => t.id === selectedType)?.mode;
    setTimeout(() => {
      navigate("/selfapply", { state: { mode: selectedMode } });
    }, 200);
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

        {/* Email input overlay */}
        {needsEmail && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl p-8 shadow-xl max-w-md w-full mx-4"
            >
              <h3 className="text-lg font-bold text-slate-900 mb-2">Enter your email to continue</h3>
              <p className="text-sm text-slate-500 mb-5">This will be used to save your interview progress.</p>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleEmailSubmit()}
                placeholder="you@example.com"
                autoFocus
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5E2B]/30 focus:border-[#2B5E2B] mb-4"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setNeedsEmail(false)}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEmailSubmit}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-[#2B5E2B] rounded-xl hover:bg-[#234E23] transition-colors"
                >
                  Continue
                </button>
              </div>
            </motion.div>
          </div>
        )}
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
