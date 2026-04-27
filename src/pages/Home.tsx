import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { getEmailFromJWT, isValidJWTFormat } from "../utils/jwt";
import { motion } from "framer-motion";
import { Briefcase, BrainCircuit, FileText, Info } from "lucide-react";
import Header from "@/components/Header";
import HomeInterviewCard from "@/components/HomeInterviewcard";

export default function Home() {
  const resumeBuddyUrl =
    "https://api-testing.d3s88q50fgekpa.amplifyapp.com/dashboard/resumes";
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
    ctaLabel?: string;
  }[] = [
    {
      id: "1-1-interview",
      icon: <Briefcase className="w-6 h-6 text-[rgb(0,107,32)]" />,
      title: "1:1 Interview",
      description:
        "Test your knowledge, and practice your communication skills with an AI assistant.",
      estimatedTime: "5-10 mins",
      comingSoon: false,
    },
    {
      id: "resume-buddy",
      icon: <FileText className="w-6 h-6 text-[rgb(0,107,32)]" />,
      title: "ResumeBuddy",
      description:
        "Create a professional resume tailored to your dream job with AI assistance.",
      estimatedTime: "5-10 mins",
      comingSoon: false,
      ctaLabel: "Build Resume",
    },
    {
      id: "flowchart",
      icon: <BrainCircuit className="w-6 h-6 text-[rgb(0,107,32)]" />,
      title: "Critical Thinking with Flowchart",
      description:
        "Design flowcharts to test your problem-solving, algorithm, and process-thinking skills",
      estimatedTime: "15-20 mins",
      comingSoon: true,
    },
  ];

  const handleCardClick = (id: string, isComingSoon: boolean) => {
    if (id === "resume-buddy") {
      const token = localStorage.getItem("studentToken");
      const urlWithToken = token ? `${resumeBuddyUrl}?token=${token}` : resumeBuddyUrl;
      window.open(urlWithToken, "_blank");
      return;
    }

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

      <main className="flex-1 flex flex-col items-center justify-center w-full max-w-full mx-auto px-6 py-10 text-center">

        <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-4">
          <img
            src="/assets/thoughtbubble.webp"
            alt="Zoe"
            className="w-32 h-32 md:w-40 md:h-40 mx-auto object-contain"
          />
        </motion.div>

        <div className="mb-8 space-y-2">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight px-2">
            What would you like to do today?
          </h2>
          <p className="text-slate-500 text-sm font-medium max-w-xl mx-auto px-4">
            By continuing, you agree to let us use this data to enhance learning experience.
          </p>
        </div>

        {/* Stacked cards (1 column) for the new horizontal-row design */}
        <div className="grid grid-cols-1 gap-4 w-full text-left max-w-2xl">
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
                ctaLabel={type.ctaLabel}
                onClick={() => handleCardClick(type.id, type.comingSoon)}
                isSelected={selectedType === type.id}
                comingSoon={type.comingSoon}
              />
            </motion.div>
          ))}
        </div>

        {/* System Hint */}
        <div className="mt-12 mx-auto pb-6">
          <div className="px-5 py-3 bg-[rgb(204,253,209)] rounded-full shadow-none inline-flex items-center gap-2">
            <Info className="w-4 h-4 shrink-0 text-[rgb(204,253,209)] bg-[rgb(0,107,12)] rounded-full" />
            <span className="text-[10px] md:text-[12px] font-bold text-[rgb(0,107,12)]">
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
