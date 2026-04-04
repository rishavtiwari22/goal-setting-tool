import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import DeviceTester from "@/components/DeviceTester";
import CreateJobModal from "@/components/CreateJobModal";
import InterviewCard from "@/components/InterviewCard";
import { DEFAULT_PIPER_BACKEND, preparePiperVoice } from "../lib/piper";
import { getJobs } from "../services/api/serverApi";
import { classifyTechnicalRole } from "../services/api/deepseekApi";
import { getEmailFromJWT } from "../utils/jwt";
import type { Job } from "../models/job";
import type { InterviewMode } from "../services/interview/interviewEngine";
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
  Monitor,
  MonitorOff,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/Header";

type Step = "job_selection" | "ocr_choice" | "speakerandmiccheck";

const getJobIcon = (title: string) => {
  const t = title.toLowerCase();
  if (t.includes('javascript') || t.includes('react')) return <Layout className="text-[#2B5E2B]" size={26} />;
  if (t.includes('frontend')) return <Globe className="text-[#2B5E2B]" size={26} />;
  if (t.includes('python')) return <Terminal className="text-[#2B5E2B]" size={26} />;
  return <Code2 className="text-[#2B5E2B]" size={26} />;
};

export default function SelfApply() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const mode: InterviewMode = (location.state as any)?.mode ?? 'practice';

  const [step, setStep] = useState<Step>("job_selection");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [isClassifying, setIsClassifying] = useState(false);
  const [ocrEnabled, setOcrEnabled] = useState(false);
  const [isTechnicalRole, setIsTechnicalRole] = useState(false);
  const voiceReadyRef = useRef(false);
  const [isCreateJobModalOpen, setIsCreateJobModalOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [customJobData, setCustomJobData] = useState<{ job_title: string; job_description: string; technical_skills: string[]; soft_skills: string[] } | null>(null);
  const [formData] = useState({
    email: "",
    testTime: 30,
  });

  useEffect(() => {
    fetchJobs();
    const storedToken = localStorage.getItem("studentToken");
    if (storedToken) {
      const email = getEmailFromJWT(storedToken);
      if (email) setUserId(email);
    } else {
      // Fallback: use email from localStorage (bypass mode)
      const storedEmail = localStorage.getItem("studentEmail");
      if (storedEmail) setUserId(storedEmail);
    }

    const prepareVoiceWhenIdle = () => {
      if (!voiceReadyRef.current) {
        preparePiperVoice(() => {}, DEFAULT_PIPER_BACKEND)
          .then(() => { voiceReadyRef.current = true; })
          .catch((e) => { console.log("Background voice preparation failed:", e); });
      }
    };

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
      setTimeout(() => {
        setJobs(jobsList);
        setLoadingJobs(false);
      }, 0);
    } catch (error) {
      toast.error("Failed to fetch jobs");
      setLoadingJobs(false);
    }
  };

  const handleJobSelected = async (jobId: string | null, custom?: typeof customJobData) => {
    if (jobId) setSelectedJobId(jobId);
    if (custom) setCustomJobData(custom);

    if (mode === 'mentor') {
      // Mentor mode skips OCR detection entirely
      setTimeout(() => setStep("speakerandmiccheck"), 300);
      return;
    }

    // Practice mode: classify JD to decide if we should offer OCR
    setIsClassifying(true);
    try {
      const jd = custom
        ? `${custom.job_title}\n${custom.job_description}`
        : (() => {
            const job = jobs.find(j => j.job_id === jobId);
            return job ? `${job.job_title}\n${job.job_description}` : '';
          })();

      const isTechnical = await classifyTechnicalRole(jd);
      setIsTechnicalRole(isTechnical);

      if (isTechnical) {
        setStep("ocr_choice");
      } else {
        setStep("speakerandmiccheck");
      }
    } catch {
      // On classification failure, skip OCR choice
      setStep("speakerandmiccheck");
    } finally {
      setIsClassifying(false);
    }
  };

  const handleOcrChoice = (withOcr: boolean) => {
    setOcrEnabled(withOcr);
    setStep("speakerandmiccheck");
  };

  const handleBack = () => {
    if (step === "speakerandmiccheck") {
      if (mode === 'practice' && isTechnicalRole) {
        setStep("ocr_choice");
      } else {
        setStep("job_selection");
      }
    } else if (step === "ocr_choice") {
      setStep("job_selection");
    } else {
      navigate("/");
    }
  };

  const handleStartInterview = async () => {
    if (!userId) {
      toast.error("User ID not found");
      return;
    }
    if (!selectedJobId && !customJobData) {
      toast.error("Please select a job role first");
      return;
    }

    try {
      let interviewConfig;

      if (customJobData) {
        interviewConfig = {
          userId,
          jobId: `custom_${Date.now()}`,
          jobTitle: customJobData.job_title,
          jobDescription: customJobData.job_description,
          interviewTime: 15,
          language: "English",
          difficulty: "medium",
          examinationPoints: [
            ...(customJobData.technical_skills || []),
            ...(customJobData.soft_skills || [])
          ],
          mode,
          ocrEnabled,
        };
      } else {
        const selectedJob = jobs.find((j) => j.job_id === selectedJobId);
        if (!selectedJob) throw new Error("Selected job not found");
        interviewConfig = {
          userId,
          jobId: selectedJob.job_id,
          jobTitle: selectedJob.job_title,
          jobDescription: selectedJob.job_description,
          interviewTime: 15,
          language: "English",
          difficulty: "medium",
          examinationPoints: [
            ...(selectedJob.technical_skills || []),
            ...(selectedJob.soft_skills || [])
          ],
          mode,
          ocrEnabled,
        };
      }

      sessionStorage.setItem("interviewConfig", JSON.stringify(interviewConfig));

      const token = searchParams.get("token") || searchParams.get("jwt");
      navigate(token ? `/interview?token=${token}` : "/interview");
    } catch (error) {
      console.error("Error starting interview:", error);
      toast.error((error as Error).message || "Failed to start interview");
    }
  };

  return (
    <div className="h-screen bg-[#FBFAF8] flex flex-col font-sans overflow-hidden relative">
      <Header />

      <main className="flex-1 flex flex-col px-12 py-6 relative overflow-y-auto md:overflow-hidden">
        <div className={`shrink-0 w-full ${step === "speakerandmiccheck" ? "max-w-4xl mx-auto" : "max-w-6xl mx-auto"}`}>
          <button
            onClick={handleBack}
            className="flex items-center gap-1 text-gray-400 hover:text-black transition-all group py-2"
          >
            <ChevronLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-[14px] font-black tracking-[0.2em]">Back</span>
          </button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center">

          {/* ── Job Selection ── */}
          {step === "job_selection" && (
            <div className="w-full max-w-6xl flex flex-col items-center">
              <div className="mb-6 shrink-0">
                <img src="/assets/glassadjustment.webp" alt="Zoe" className="w-28 h-28 md:w-36 md:h-36 object-contain mx-auto" />
              </div>

              <h2 className="text-2xl font-black text-center mb-10 text-gray-900 tracking-tight custom-fade-in">
                {mode === 'mentor' ? 'Select a topic to learn' : 'Select a job role to practice'}
              </h2>

              {isClassifying ? (
                <div className="flex flex-col items-center gap-3">
                  <Spinner className="text-[#2B5E2B]" />
                  <p className="text-sm text-slate-500 font-medium">Analyzing role...</p>
                </div>
              ) : loadingJobs ? (
                <Spinner className="text-[#2B5E2B]" />
              ) : (
                <div className="w-full flex flex-col">
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
                          onClick={() => handleJobSelected(job.job_id)}
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
          )}

          {/* ── OCR Choice (practice + technical roles only) ── */}
          {step === "ocr_choice" && (
            <div className="w-full max-w-2xl flex flex-col items-center">
              <div className="mb-6 shrink-0">
                <img src="/assets/glassadjustment.webp" alt="Zoe" className="w-28 h-28 md:w-36 md:h-36 object-contain mx-auto" />
              </div>

              <h2 className="text-2xl font-black text-center mb-3 text-gray-900 tracking-tight">
                Would you like to use screen sharing?
              </h2>
              <p className="text-slate-500 text-sm font-medium text-center mb-10 max-w-md">
                This role involves coding. Zoe can silently observe your screen to ask more relevant technical questions.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                <button
                  onClick={() => handleOcrChoice(true)}
                  className="group p-6 rounded-xl border-2 border-gray-200 hover:border-[#2B5E2B] bg-white text-left transition-all duration-200 hover:shadow-md hover:scale-[1.01] active:scale-95"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-[#E6F6EF] flex items-center justify-center group-hover:bg-[#2B5E2B] transition-colors">
                      <Monitor size={20} className="text-[#2B5E2B] group-hover:text-white transition-colors" />
                    </div>
                    <span className="font-bold text-gray-900 text-base">Use screen sharing</span>
                  </div>
                  <p className="text-sm text-slate-500">
                    Zoe will use live OCR to silently read your screen and ask questions based on what you're building.
                  </p>
                </button>

                <button
                  onClick={() => handleOcrChoice(false)}
                  className="group p-6 rounded-xl border-2 border-gray-200 hover:border-gray-400 bg-white text-left transition-all duration-200 hover:shadow-md hover:scale-[1.01] active:scale-95"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                      <MonitorOff size={20} className="text-slate-500" />
                    </div>
                    <span className="font-bold text-gray-900 text-base">Continue without</span>
                  </div>
                  <p className="text-sm text-slate-500">
                    Proceed with a standard voice-only interview. No screen sharing required.
                  </p>
                </button>
              </div>
            </div>
          )}

          {/* ── Device Tester ── */}
          {step === "speakerandmiccheck" && (
            <DeviceTester onStartInterview={handleStartInterview} mode={mode} />
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
        .custom-float { animation: float 4s ease-in-out infinite; }
        .custom-fade-in { animation: fadeIn 0.8s ease-out forwards; }
        .custom-slide-up { animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .custom-zoom-in { animation: fadeIn 0.5s ease-out; }
        .custom-float:hover, .custom-fade-in, .custom-slide-up, .custom-zoom-in { will-change: transform, opacity; }
        .custom-float:not(:hover) { will-change: auto; }
        .zoe-hardware-wrapper div[class*="border"] { border-radius: 1.25rem !important; transition: all 0.3s ease !important; }
        .zoe-hardware-wrapper .p-4.border, .zoe-hardware-wrapper .p-6.border { animation: boxGlow 4s ease-in-out infinite; border-color: #f0f0f0 !important; background: white !important; }
        .zoe-hardware-wrapper .p-4.border:hover, .zoe-hardware-wrapper .p-6.border:hover { border-color: #2B5E2B !important; box-shadow: 0 12px 30px rgba(44,95,45,0.12) !important; animation: none; }
        .line-clamp-3 { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
        .line-clamp-4 { display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }
      `}</style>

      <CreateJobModal
        isOpen={isCreateJobModalOpen}
        onClose={() => setIsCreateJobModalOpen(false)}
        onSubmit={(jobData) => {
          setIsCreateJobModalOpen(false);
          handleJobSelected(null, jobData);
        }}
      />
    </div>
  );
}
