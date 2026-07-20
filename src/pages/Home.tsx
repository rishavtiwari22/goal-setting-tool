import React, { useEffect, useState } from "react";
import { ENV } from "../utils/env";
import { getCurrentUserEmail } from "../config/auth";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { getEmailFromJWT, isValidJWTFormat } from "../utils/jwt";
import { getResumeBuddyUrl } from "../utils/zuvySource";
import { motion } from "framer-motion";
import { Briefcase, BrainCircuit, GraduationCap, FileText, Info, Calendar as CalendarIcon } from "lucide-react";
import Header from "@/components/Header";
import HomeInterviewCard from "@/components/HomeInterviewcard";
import type { InterviewMode } from "../services/interview/interviewEngine";

// base64url-encode a UTF-8 string for JWT segments.
function b64url(input: string) {
  return btoa(unescape(encodeURIComponent(input)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

// Mint a 3-part JWT-shaped token from email so downstream services can read
// the email out of the payload using the same decoder the rest of the app uses.
function mintStudentTokenFromEmail(email: string) {
  const header = b64url(JSON.stringify({ alg: "none", typ: "JWT" }));
  const payload = b64url(
    JSON.stringify({ email, iat: Math.floor(Date.now() / 1000) }),
  );
  return `${header}.${payload}.`;
}

export default function Home() {
  // Dev Zuvy users (redirected from dev.app.zuvy.org) get the dev builder;
  // everyone else gets the prod builder. Source is detected from the referrer
  // at startup (see utils/zuvySource).
  const resumeBuddyUrl = getResumeBuddyUrl();
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [email, setEmail] = useState(getCurrentUserEmail());
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [activeTab, setActiveTab] = useState<"practice" | "goals">("goals");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Force to authenticated user's email
    setEmail(getCurrentUserEmail());
  }, [searchParams, navigate]);

  // URL params win, then a real token in storage, then a synthesized one
  // from a stored email. Returns null only if we have nothing to identify
  // the student with.
  const resolveStudentToken = () => {
    const fromUrl = searchParams.get("token") || searchParams.get("jwt");
    if (fromUrl) return fromUrl;
    return mintStudentTokenFromEmail(getCurrentUserEmail());
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

  const handleCardClick = (id: string, isComingSoon: boolean, mode?: InterviewMode, autoStart: boolean = true) => {
    if (id === "resume-buddy") {
      const token = resolveStudentToken();
      if (token) {
        window.open(
          `${resumeBuddyUrl}?token=${encodeURIComponent(token)}`,
          "_blank",
        );
      }
      return;
    }

    if (isComingSoon) {
      toast.info("This module is coming soon!");
      return;
    }

    const token = searchParams.get("token") || searchParams.get("jwt");

    setSelectedType(id);
    setTimeout(() => {
      navigate(token ? `/selfapply?token=${token}` : "/selfapply", { state: { mode, autoStart } });
    }, 300);
  };

  useEffect(() => {
    // Authenticate from query removed, bypassing with dummy email.
  }, [searchParams]);

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
                onClick={() => handleCardClick(type.id, type.comingSoon, type.mode, true)}
                onSecondaryClick={(e) => {
                  e.stopPropagation();
                  handleCardClick(type.id, type.comingSoon, type.mode, false);
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
