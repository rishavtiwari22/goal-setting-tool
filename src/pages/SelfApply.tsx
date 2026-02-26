import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import DeviceTester from "@/components/DeviceTester";
import CreateJobModal from "@/components/CreateJobModal";
import InterviewCard from "@/components/InterviewCard";
import { DEFAULT_PIPER_BACKEND, preparePiperVoice } from "../lib/piper";
import { getJobs } from "../services/api/serverApi";
import { getEmailFromJWT } from "../utils/jwt";
import type { Job } from "../models/job";
import { 
  ChevronLeft, 
  Plus, 
  Laptop,
  Sparkles,
  Code2,
  Terminal,
  Globe,
  Layout,
  Info,
  Clock,
  ArrowRight
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/Header";

const getJobIcon = (title: string) => {
  const t = title.toLowerCase();
  if (t.includes('javascript') || t.includes('react')) return <Layout className="text-[#2B5E2B]" size={26} />;
  if (t.includes('frontend')) return <Globe className="text-[#2B5E2B]" size={26} />;
  if (t.includes('python')) return <Terminal className="text-[#2B5E2B]" size={26} />;
  return <Code2 className="text-[#2B5E2B]" size={26} />;
};

export default function SelfApply() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"job_selection" | "speakerandmiccheck">("job_selection");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const voiceReadyRef = useRef(false);
  const [isCreateJobModalOpen, setIsCreateJobModalOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  useEffect(() => {
    fetchJobs();
    const storedToken = localStorage.getItem("studentToken");
    if (storedToken) {
      const email = getEmailFromJWT(storedToken);
      if (email) setUserId(email);
    }

    // Prepare Piper voice during idle time to avoid blocking UI
    const prepareVoiceWhenIdle = () => {
      if (!voiceReadyRef.current) {
        preparePiperVoice(() => {}, DEFAULT_PIPER_BACKEND)
          .then(() => {
            voiceReadyRef.current = true;
          })
          .catch((e) => {
            console.log("Background voice preparation failed:", e);
          });
      }
    };

    // Use requestIdleCallback if available, otherwise setTimeout
    if ('requestIdleCallback' in window) {
      const idleCallbackId = requestIdleCallback(prepareVoiceWhenIdle, { timeout: 5000 });
      return () => cancelIdleCallback(idleCallbackId);
    } else {
      const timeoutId = setTimeout(prepareVoiceWhenIdle, 2000);
      return () => clearTimeout(timeoutId);
    }
  }, []);

  const fetchJobs = async () => {
    setLoadingJobs(true);
    try {
      const jobsList = await getJobs();
      // Use setTimeout to yield to main thread and prevent blocking
      setTimeout(() => {
        setJobs(jobsList);
        setLoadingJobs(false);
      }, 0);
    } catch (error) {
      toast.error("Failed to fetch jobs");
      setLoadingJobs(false);
    }
  };

  const handleStartInterview = async () => {
    if (!userId) {
      toast.error("User ID not found");
      return;
    }

    if (!selectedJobId) {
      toast.error("Please select a job role first");
      return;
    }

    try {
      const selectedJob = jobs.find((j) => j.job_id === selectedJobId);
      if (!selectedJob) {
        throw new Error("Selected job not found");
      }

      const interviewConfig = {
        userId,
        jobId: selectedJob.job_id,
        jobTitle: selectedJob.job_title,
        jobDescription: selectedJob.job_description,
        interviewTime: 10, // Default 10 minutes
        language: "English",
        difficulty: "medium",
        examinationPoints: [
          ...(selectedJob.technical_skills || []),
          ...(selectedJob.soft_skills || [])
        ],
      };

      sessionStorage.setItem(
        "interviewConfig",
        JSON.stringify(interviewConfig)
      );

      // Don't block navigation - voice will be prepared in Interview component if needed
      // This prevents UI freezing on button click
      navigate("/interview");
    } catch (error) {
      console.error("Error starting interview:", error);
      toast.error((error as Error).message || "Failed to start interview");
    }
  };

  return (
    <div className="h-screen bg-[#FBFAF8] flex flex-col font-sans overflow-hidden relative">
      

      <Header />

      {/* --- MAIN AREA --- */}
      <main className="flex-1 flex flex-col px-12 py-6 relative overflow-y-auto md:overflow-hidden">
        
        {/* Back Button — aligns to same max-width as content */}
        <div className={`shrink-0 w-full ${step === "speakerandmiccheck" ? "max-w-4xl mx-auto" : "max-w-6xl mx-auto"}`}>
          <button 
            onClick={() => step === "speakerandmiccheck" ? setStep("job_selection") : navigate("/")}
            className="flex items-center gap-1 text-gray-400 hover:text-black transition-all group py-2"
          >
            <ChevronLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-[14px] font-black tracking-[0.2em]">Back</span>
          </button>
        </div>

        {/* Content Container */}
        <div className="flex-1 flex flex-col items-center justify-center">
          {step === "job_selection" ? (
            <div className="w-full max-w-6xl flex flex-col items-center">
              
              <div className="mb-6 custom-float shrink-0">
                  <div className="relative">
                    <div className="absolute inset-0 bg-green-100 blur-3xl rounded-full opacity-40"></div>
                    <img src="/assets/zoe-talking 1.svg" alt="Zoe" className="relative w-24 h-24 md:w-28 md:h-28" />
                  </div>
              </div>

              <h2 className="text-2xl font-black text-center mb-10 text-gray-900 tracking-tight custom-fade-in">
                Select a job role to practice
              </h2>

              {loadingJobs ? (
                <Spinner className="text-[#2B5E2B]" />
              ) : (
                <div className="w-full flex flex-col">
                  {/* Job Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                    {jobs.slice(0, 3).map((job, index) => (
                      <div
                        key={job.job_id}
                        className="opacity-0 custom-slide-up"
                        style={{ animationDelay: `${index * 150}ms`, animationFillMode: 'forwards' }}
                      >
                        <InterviewCard
                          icon={getJobIcon(job.job_title)}
                          title={job.job_title}
                          description={job.job_description || "Sharpen your skills for this specific role with a simulated high-pressure technical interview."}
                          estimatedTime="5-10 mins"
                          onClick={() => {
                            setSelectedJobId(job.job_id);
                            setTimeout(() => setStep("speakerandmiccheck"), 300);
                          }}
                          isSelected={selectedJobId === job.job_id}
                        />
                      </div>
                    ))}
                  </div>

                  <div className="text-center space-y-3 opacity-0 custom-fade-in pb-12" style={{ animationDelay: '600ms', animationFillMode: 'forwards' }}>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Can't find a role?
                    </h3>
                    
                    <div className="flex justify-center">
                      <Button
                        onClick={() => setIsCreateJobModalOpen(true)}
                        className="bg-[#2B5E2B] hover:bg-[#1a3a1b] text-white font-black px-6 h-12 rounded-lg shadow-sm transition-all hover:scale-[1.01] active:scale-95 flex items-center gap-2 border-b-2 border-[#1a3a1b]"
                      >
                        <Plus size={16} />
                        <span className="text-sm">Create Custom Interview</span>
                      </Button>
                    </div>

                    {/* Chrome notification below button */}
                    <div className="flex justify-center pt-4 px-4">
                      <Badge className="px-3 md:px-4 py-2 font-bold text-[#007AFF] rounded-lg md:rounded-xl bg-[#EBF5FF] border border-[#D1E9FF] text-[9px] md:text-[10px] uppercase tracking-wide shadow-none flex items-center gap-2">
                        <Info size={12} className="md:hidden" />
                        <Info size={14} className="hidden md:block" />
                        <span className="text-center">Please note that Zoe works best on Google Chrome</span>
                      </Badge>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* --- DEVICE TESTER FULL SCREEN --- */
            <DeviceTester onStartInterview={handleStartInterview} />
          )}
        </div>
      </main>

      <style>{`
        @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-10px); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { 
          from { opacity: 0; transform: translateY(15px); } 
          to { opacity: 1; transform: translateY(0); } 
        }
        @keyframes boxGlow {
          0%, 100% { transform: scale(1); box-shadow: 0 4px 12px rgba(0,0,0,0.03); }
          50% { transform: scale(1.01); box-shadow: 0 8px 24px rgba(44,95,45,0.08); }
        }

        .custom-float { 
          animation: float 4s ease-in-out infinite; 
        }
        .custom-fade-in { 
          animation: fadeIn 0.8s ease-out forwards; 
        }
        .custom-slide-up { 
          animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; 
        }
        .custom-zoom-in { 
          animation: fadeIn 0.5s ease-out; 
        }
        
        /* Only add will-change during animation */
        .custom-float:hover,
        .custom-fade-in,
        .custom-slide-up,
        .custom-zoom-in {
          will-change: transform, opacity;
        }
        
        .custom-float:not(:hover) {
          will-change: auto;
        }

        /* REFINING MIC/SPEAKER BOXES WITHOUT BREAKING DEVICE TESTER */
        .zoe-hardware-wrapper div[class*="border"] {
            border-radius: 1.25rem !important;
            transition: all 0.3s ease !important;
        }

        /* Applying the requested clean Green Shadow and Animation to inner tester boxes */
        .zoe-hardware-wrapper .p-4.border, .zoe-hardware-wrapper .p-6.border {
            animation: boxGlow 4s ease-in-out infinite;
            border-color: #f0f0f0 !important;
            background: white !important;
        }

        .zoe-hardware-wrapper .p-4.border:hover, .zoe-hardware-wrapper .p-6.border:hover {
            border-color: #2B5E2B !important;
            box-shadow: 0 12px 30px rgba(44,95,45,0.12) !important;
            animation: none;
        }

        .line-clamp-3 {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;  
          overflow: hidden;
        }
        
        .line-clamp-4 {
          display: -webkit-box;
          -webkit-line-clamp: 4;
          -webkit-box-orient: vertical;  
          overflow: hidden;
        }
      `}</style>

      <CreateJobModal
        isOpen={isCreateJobModalOpen}
        onClose={() => setIsCreateJobModalOpen(false)}
        onSubmit={() => {
          setIsCreateJobModalOpen(false);
          setStep("speakerandmiccheck");
        }}
      />
    </div>
  );
}