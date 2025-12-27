import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import DeviceTester from "@/components/DeviceTester";
import { DEFAULT_PIPER_BACKEND, preparePiperVoice } from "../lib/piper";
import JobSelection from "@/components/JobSelection";
import CreateJobModal from "@/components/CreateJobModal";
import { ChevronDownIcon, ChevronLeft, Plus } from "lucide-react";
// import { checkUser, getJob } from "../services/api/serverApi";
import { getJobs } from "../services/api/serverApi";
import type { Job } from "../models/job";
import { getEmailFromJWT } from "../utils/jwt";
import { Badge } from "@/components/ui/badge";
import { 
  trackJobSelection, 
  trackUserEngagement, 
  trackFeatureUsage,
  trackCrossPlatformJourney 
} from "../services/analytics/ga4";

interface FormData {
  email: string;
  selectedJobId: string | null | undefined;
  jobTitle: string;
  jobDescription: string;
  technicalSkills: string[];
  softSkills: string[];
  testTime: number;
}

type Step = "job_selection" | "speakerandmiccheck";

export default function SelfApply() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<string>("idle");
  const voiceReadyRef = useRef(false);
  const [step, setStep] = useState<Step>("job_selection");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAllJobs, setShowAllJobs] = useState(false);
  const [isCreateJobModalOpen, setIsCreateJobModalOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const pageStartTime = useRef<number>(Date.now());
  const jobSelectionStartTime = useRef<number>(Date.now());
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
    
    // Track page entry and cross-platform journey
    trackCrossPlatformJourney('selfapply_page_entered', {
      referrer: document.referrer,
      has_token: !!new URLSearchParams(window.location.search).get('token')
    });
    
    // Track page engagement on unmount
    return () => {
      const timeSpent = Date.now() - pageStartTime.current;
      trackUserEngagement('page_exit', {
        page: 'selfapply',
        time_spent_ms: timeSpent,
        step_reached: step,
        jobs_loaded: jobs.length
      });
    };
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
          navigate("/");
          return;
        }

        localStorage.setItem("studentEmail", email);
        setFormData((prev) => ({ ...prev, email }));
        setUserId(email);
        // try {
        //   const response = await checkUser(email);
        //   if (response.exists) {
        //     setFormData((prev) => ({ ...prev, email }));
        //     if (response.user?.user_id) {
        //       setUserId(response.user.user_id);
        //     } else {
        //       setUserId(email);
        //     }
        //     // Store user name if available
        //     if (response.user?.name) {
        //       localStorage.setItem("userName", response.user.name);
        //     }
        //   } else {
        //     localStorage.removeItem("studentToken");
        //     toast.error(
        //       "Your data is not with us. Ask an admin to add your data."
        //     );
        //     navigate("/");
        //   }
        // } catch (error) {
        //   console.error("Error checking stored token:", error);
        //   localStorage.removeItem("studentToken");
        //   toast.error("Failed to verify authentication.");
        //   navigate("/");
        // }
        return;
      }

      const storedEmail = localStorage.getItem("studentEmail");
      if (storedEmail) {
        setFormData((prev) => ({ ...prev, email: storedEmail }));
        setUserId(storedEmail);
        // try {
        //   const response = await checkUser(storedEmail);
        //   if (response.exists) {
        //     setFormData((prev) => ({ ...prev, email: storedEmail }));
        //     if (response.user?.user_id) {
        //       setUserId(response.user.user_id);
        //     } else {
        //       setUserId(storedEmail);
        //     }
        //     // Store user name if available
        //     if (response.user?.name) {
        //       localStorage.setItem("userName", response.user.name);
        //     }
        //   } else {
        //     localStorage.removeItem("studentEmail");
        //     toast.error(
        //       "Your data is not with us. Ask an admin to add your data."
        //     );
        //     navigate("/");
        //   }
        // } catch (error) {
        //   console.error("Error checking stored email:", error);
        //   localStorage.removeItem("studentEmail");
        //   toast.error("Failed to verify authentication.");
        //   navigate("/");
        // }
        return;
      }

      // toast.error(
      //   "Please provide authentication via URL parameter: ?token=your_jwt_token or ?email=your@email.com"
      // );
      // navigate("/");
    };

    checkStoredAuth();
  }, [navigate]);

  const handleJobSelect = (jobId: string | null) => {
    if (jobId) {
      const selectedJob = jobs.find((j) => j.job_id === jobId);
      if (selectedJob) {
        const selectionTime = Date.now() - jobSelectionStartTime.current;
        
        // Track job selection
        trackJobSelection(selectedJob.job_title);
        trackUserEngagement('job_selected', {
          job_id: jobId,
          job_title: selectedJob.job_title,
          selection_time_ms: selectionTime,
          total_jobs_available: jobs.length,
          job_type: 'predefined'
        });
        
        setFormData({
          ...formData,
          selectedJobId: jobId,
          jobTitle: selectedJob.job_title,
          jobDescription: selectedJob.job_description,
          technicalSkills: selectedJob.technical_skills,
          softSkills: selectedJob.soft_skills,
        });
        setStep("speakerandmiccheck");
        
        // Track progression to device check
        trackCrossPlatformJourney('device_check_started', {
          job_title: selectedJob.job_title,
          previous_step: 'job_selection'
        });
      }
    }
  };

  const handleCustomJobSubmit = (jobData: {
    job_title: string;
    job_description: string;
    technical_skills: string[];
    soft_skills: string[];
  }) => {
    const selectionTime = Date.now() - jobSelectionStartTime.current;
    
    // Track custom job creation
    trackUserEngagement('custom_job_created', {
      job_title: jobData.job_title,
      creation_time_ms: selectionTime,
      technical_skills_count: jobData.technical_skills.length,
      soft_skills_count: jobData.soft_skills.length,
      job_type: 'custom'
    });
    
    trackFeatureUsage('custom_job_creation', 'completed', {
      job_title: jobData.job_title,
      description_length: jobData.job_description.length
    });
    
    setFormData({
      ...formData,
      selectedJobId: null,
      jobTitle: jobData.job_title,
      jobDescription: jobData.job_description,
      technicalSkills: jobData.technical_skills,
      softSkills: jobData.soft_skills,
    });
    setIsCreateJobModalOpen(false);
    setStep("speakerandmiccheck");
  };

  const handleStartInterview = async () => {
    if (!userId) {
      toast.error("User ID not found");
      return;
    }

    setIsSubmitting(true);

    if (!voiceReadyRef.current) {
      setStatus("Preparing voice system...");
      try {
        await preparePiperVoice((s) => setStatus(s), DEFAULT_PIPER_BACKEND);
        voiceReadyRef.current = true;
      } catch (error) {
        console.error("Piper preparation failed:", error);
        toast.warning(
          "Voice system preparation failed, continuing without voice"
        );
      }
    }

    try {
      let job: Job;
      if (formData.selectedJobId) {
        const selectedJob = jobs.find((j) => j.job_id === formData.selectedJobId);
        if (selectedJob) {
          job = selectedJob;
        } else {
          throw new Error("Selected job not found");
        }
        // job = await getJob(formData.selectedJobId);
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
        examinationPoints: [...formData.technicalSkills, ...formData.softSkills],
      };

      sessionStorage.setItem(
        "interviewConfig",
        JSON.stringify(interviewConfig)
      );
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
                {/* <div className="flex gap-3 items-center"> */}
                <h1 className="text-base font-semibold ">
                  Zoe: Your Learning Assistant
                </h1>
                {/* <Badge className="px-1 bg-green-400 rounded-sm font-semibold">
                    Beta
                  </Badge> */}
                {/* </div> */}
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

                    <div className="text-center mb-8 mt-12">
                      <h3 className="text-lg font-bold text-gray-800 mb-4">
                        Can't find a job role to practice?
                      </h3>
                      <Button
                        variant="default"
                        size="default"
                        onClick={() => setIsCreateJobModalOpen(true)}
                        className="bg-[#2C5F2D] hover:bg-[#1f4420] text-white text-sm font-semibold px-6 py-5 rounded-md shadow-md transition-all hover:scale-[1.02]"
                      >
                        Create Custom Interview
                      </Button>
                    </div>

                    {/* {jobs.length > 3 && !showAllJobs && (
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
                    )} */}
                  </>
                )}
              </main>
            </div>

            {/* Bottom notification */}
            <div className="fixed bottom-10 left-0 right-0 flex justify-center pb-4">
              <Badge className="px-3 py-1 font-bold text-sky-600 rounded-sm bg-blue-100">
                Please note that Zoe works best on Google Chrome
              </Badge>
            </div>

            {/* Create Job Modal */}
            <CreateJobModal
              isOpen={isCreateJobModalOpen}
              onClose={() => setIsCreateJobModalOpen(false)}
              onSubmit={handleCustomJobSubmit}
            />
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
                {/* <div className="flex gap-3 items-center"> */}
                <h1 className="text-base font-semibold ">
                  Zoe: Your Learning Assistant
                </h1>
                {/* <Badge className="px-1 bg-green-400 rounded-sm font-semibold">
                    Beta
                  </Badge> */}
                {/* </div> */}
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

  return <div className="flex min-h-screen bg-primary">{renderStep()}</div>;
}
