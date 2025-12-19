import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import DeviceTester from "@/components/DeviceTester";
import { DEFAULT_PIPER_BACKEND, preparePiperVoice } from "../lib/piper";
import JobSelection from "@/components/JobSelection";
import { ChevronDownIcon, ChevronLeft } from "lucide-react";
import { getEmailFromJWT, isValidJWTFormat } from "../utils/jwt";
import { checkUser, getJobs, getJob } from "../services/api/serverApi";
import type { Job } from "../models/job";
import { PiperLoader } from "../components/interview/PiperLoader";

interface FormData {
  email: string;
  selectedJobId: string | null | undefined;
  jobTitle: string;
  jobDescription: string;
  technicalSkills: string[];
  softSkills: string[];
  testTime: number;
}

type Step = "email" | "job_selection" | "speakerandmiccheck";

export default function SelfApply() {
  const navigate = useNavigate();
  const [preparing, setPreparing] = useState(false);
  const [status, setStatus] = useState<string>("idle");
  const voiceReadyRef = useRef(false);
  const [step, setStep] = useState<Step>("email");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkingUser, setCheckingUser] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [showAllJobs, setShowAllJobs] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    email: "",
    selectedJobId: undefined,
    jobTitle: "",
    jobDescription: "",
    technicalSkills: [],
    softSkills: [],
    testTime: 10,
  });

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    setLoadingJobs(true);
    try {
      const jobsList = await getJobs();
      setJobs(jobsList);
    } catch (error) {
      console.error("Error fetching jobs:", error);
      toast.error("Failed to fetch jobs");
    } finally {
      setLoadingJobs(false);
    }
  };

  useEffect(() => {
    const checkStoredAuth = async () => {
      const storedToken = localStorage.getItem("studentToken");

      if (storedToken) {
        const email = getEmailFromJWT(storedToken);

        if (!email) {
          localStorage.removeItem("studentToken");
          toast.error("Invalid authentication token. Please try again.");
          return;
        }

        setFormData((prev) => ({ ...prev, email }));

        try {
          const response = await checkUser(email);
          if (response.exists) {
            if (response.user?.user_id) {
              setUserId(response.user.user_id);
            } else {
              setUserId(email);
            }
            setStep("job_selection");
          } else {
            localStorage.removeItem("studentToken");
            setFormData((prev) => ({ ...prev, email: "" }));
            toast.error("Oh no, your data is not with us. Ask an admin to add your data.");
          }
        } catch (error) {
          console.error("Error checking stored token:", error);
          localStorage.removeItem("studentToken");
          setFormData((prev) => ({ ...prev, email: "" }));
          toast.error("Failed to verify authentication. Please contact support.");
        }
      } else {
        const storedEmail = localStorage.getItem("studentEmail");
        if (storedEmail) {
          setFormData((prev) => ({ ...prev, email: storedEmail }));
          try {
            const response = await checkUser(storedEmail);
            if (response.exists) {
              if (response.user?.user_id) {
                setUserId(response.user.user_id);
              } else {
                setUserId(storedEmail);
              }
              setStep("job_selection");
            } else {
              localStorage.removeItem("studentEmail");
              setFormData((prev) => ({ ...prev, email: "" }));
              toast.error("Oh no, your data is not with us. Ask an admin to add your data.");
            }
          } catch (error) {
            console.error("Error checking stored email:", error);
            localStorage.removeItem("studentEmail");
            setFormData((prev) => ({ ...prev, email: "" }));
            toast.error("Failed to verify email. Please contact support.");
          }
        }
      }
    };
    checkStoredAuth();
  }, []);

  const handleEmailSubmit = async () => {
    const input = formData.email.trim();

    if (!input) {
      toast.error("Please enter a JWT token or email address");
      return;
    }

    setCheckingUser(true);
    setEmailError(null);

    try {
      let emailToVerify = input;
      let jwtToken: string | null = null;

      if (isValidJWTFormat(input)) {
        const decodedEmail = getEmailFromJWT(input);

        if (!decodedEmail) {
          toast.error("Invalid JWT token: no email found in payload");
          setCheckingUser(false);
          return;
        }

        emailToVerify = decodedEmail;
        jwtToken = input;
      } else if (!input.includes("@")) {
        toast.error("Please enter a valid JWT token or email address");
        setCheckingUser(false);
        return;
      }

      const response = await checkUser(emailToVerify);

      if (response.exists) {
        if (jwtToken) {
          localStorage.setItem("studentToken", jwtToken);
          localStorage.removeItem("studentEmail");
        } else {
          localStorage.setItem("studentEmail", emailToVerify);
        }

        if (response.user?.user_id) {
          setUserId(response.user.user_id);
        } else {
          setUserId(emailToVerify);
        }

        setFormData((prev) => ({ ...prev, email: emailToVerify }));
        setStep("job_selection");
      } else {
        setEmailError("Oh no, your data is not with us. Ask an admin to add your data.");
      }
    } catch (error) {
      console.error("Error checking user:", error);
      setEmailError("Oh no, your data is not with us. Ask an admin to add your data.");
    } finally {
      setCheckingUser(false);
    }
  };

  const handleJobSelect = (jobId: string | null) => {
    if (jobId) {
      const selectedJob = jobs.find((j) => j.job_id === jobId);
      if (selectedJob) {
        setFormData({
          ...formData,
          selectedJobId: jobId,
          jobTitle: selectedJob.job_title,
          jobDescription: selectedJob.job_description,
          technicalSkills: selectedJob.technical_skills,
          softSkills: selectedJob.soft_skills,
        });
        setStep("speakerandmiccheck");
      }
    }
  };

  const handleStartInterview = async () => {
    if (!userId) {
      toast.error("User ID not found");
      return;
    }
    
    setIsSubmitting(true);
    
    if (!voiceReadyRef.current) {
      setPreparing(true);
      setStatus("Preparing voice system...");
      try {
        await preparePiperVoice((s) => setStatus(s), DEFAULT_PIPER_BACKEND);
        voiceReadyRef.current = true;
      } catch (error) {
        console.error("Piper preparation failed:", error);
        toast.warning("Voice system preparation failed, continuing without voice");
      } finally {
        setPreparing(false);
      }
    }

    try {
      let job: Job;
      if (formData.selectedJobId) {
        job = await getJob(formData.selectedJobId);
      } else {
        job = {
          job_id: `custom_${Date.now()}`,
          job_title: formData.jobTitle,
          job_description: formData.jobDescription,
          technical_skills: formData.technicalSkills,
          soft_skills: formData.softSkills,
        };
      }

      const interviewConfig = {
        userId,
        jobId: job.job_id,
        jobTitle: job.job_title,
        jobDescription: job.job_description,
        interviewTime: formData.testTime,
        language: "English",
        difficulty: "medium",
        examinationPoints: [],
      };

      sessionStorage.setItem("interviewConfig", JSON.stringify(interviewConfig));
      navigate("/interview");
    } catch (error) {
      console.error("Error starting interview:", error);
      toast.error((error as Error).message || "Failed to start interview");
      setStep("job_selection");
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case "email":
        return (
          <div className="w-full">
            <header className="border-b border-gray-200 bg-white">
              <div className="relative w-full px-6 py-4 flex items-center justify-center">
                <button
                  onClick={() => navigate("/")}
                  className="cursor-pointer absolute left-6 text-gray-600 hover:text-gray-900"
                >
                  <ChevronLeft />
                </button>
                <h1 className="text-base font-semibold">
                  Zoe: Your Learning Assistant
                </h1>
              </div>
            </header>

            <div className="flex flex-col gap-4 items-stretch w-full p-8 max-w-2xl mx-auto mt-12">
              <p className="text-lg text-gray-600">
                Let's get started! Please enter your email address or JWT token.
              </p>
            <Input
                placeholder="your.email@example.com or JWT token"
                value={formData.email}
              onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
                setEmailError(null);
              }}
              onKeyPress={(e) => {
                  if (e.key === "Enter" && !checkingUser) handleEmailSubmit();
              }}
            />
            {emailError && (
                <p className="text-red-500 text-sm">{emailError}</p>
            )}
            <Button
              onClick={handleEmailSubmit}
              size="lg"
                disabled={checkingUser}
                className="bg-[#2C5F2D] hover:bg-[#2C5F2D]/90 text-white"
            >
                {checkingUser ? <Spinner size="sm" /> : "Continue"}
            </Button>
            </div>
          </div>
        );

      case "job_selection":
        return (
          <div className="w-full">
            <header className="border-b border-gray-200 bg-white">
              <div className="relative w-full px-6 py-4 flex items-center justify-center">
                <button
                  onClick={() => navigate("/")}
                  className="cursor-pointer absolute left-6 text-gray-600 hover:text-gray-900"
                >
                  <ChevronLeft />
                </button>
                <h1 className="text-base font-semibold">
                  Zoe: Your Learning Assistant
                </h1>
              </div>
            </header>

            <div className="w-full flex justify-center">
              <main className="max-w-7xl mx-auto px-6 py-12">
                <div className="flex justify-center mb-8">
                  <img
                    src="/assets/zoe-talking 1.svg"
                    alt="Zoe Character"
                    className="w-32 h-32 md:w-40 md:h-40"
                  />
                </div>

                <h2 className="text-xl font-bold text-center mb-8">
                  Select a job role to practice
                </h2>

                <p className="text-md font-semibold text-center mb-3">
                  Select a job role from below :
                </p>

            {loadingJobs ? (
                  <div className="flex justify-center py-8">
                <Spinner size="lg" />
                  </div>
            ) : (
                  <>
                    <JobSelection
                      jobs={jobs}
                      onJobSelect={handleJobSelect}
                      selectedJobId={formData.selectedJobId}
                      showAll={showAllJobs}
                    />

                    {jobs.length > 3 && !showAllJobs && (
                      <div className="text-center mb-8">
                        <Button
                          variant="default"
                          size="lg"
                          onClick={() => setShowAllJobs(true)}
                          className="bg-white rounded-full shadow-sm"
                        >
                          See all new roles <ChevronDownIcon />
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </main>
            </div>
          </div>
        );

      case "speakerandmiccheck":
        return (
          <div className="w-full">
            <header className="border-b border-gray-200 bg-white">
              <div className="relative w-full px-6 py-4 flex items-center justify-center">
                <button
                  onClick={() => navigate("/")}
                  className="cursor-pointer absolute left-6 text-gray-600 hover:text-gray-900"
                >
                  <ChevronLeft />
                </button>
                <h1 className="text-base font-semibold">
                  Zoe: Your Learning Assistant
                </h1>
              </div>
            </header>

            <div>
              <div
                className="bg-cover bg-center min-h-[94vh] flex items-center justify-center"
                style={{
                  background:
                    "radial-gradient(53% 119.66% at 50% 47%, rgba(255, 255, 255, 0.2) 0%, rgba(111, 185, 113, 0.2) 100%)",
                }}
              >
                <DeviceTester onStartInterview={handleStartInterview} />
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen bg-primary">
            {renderStep()}
      {preparing && <PiperLoader status={status} />}
    </div>
  );
}
