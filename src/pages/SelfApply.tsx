// // import { useState, useEffect, useRef } from "react";
// // import { useNavigate, useSearchParams } from "react-router-dom";
// // import { toast } from "sonner";
// // import { Spinner } from "@/components/ui/spinner";
// // import { Button } from "@/components/ui/button";
// // import DeviceTester from "@/components/DeviceTester";
// // import { DEFAULT_PIPER_BACKEND, preparePiperVoice } from "../lib/piper";
// // import JobSelection from "@/components/JobSelection";
// // import CreateJobModal from "@/components/CreateJobModal";
// // import { ChevronDownIcon, ChevronLeft, Plus } from "lucide-react";
// // // import { checkUser, getJob } from "../services/api/serverApi";
// // import { getJobs } from "../services/api/serverApi";
// // import type { Job } from "../models/job";
// // import { getEmailFromJWT } from "../utils/jwt";
// // import { Badge } from "@/components/ui/badge";
// // import { 
// //   trackJobSelection, 
// //   trackUserEngagement, 
// //   trackFeatureUsage,
// //   trackCrossPlatformJourney 
// // } from "../services/analytics";

// // interface FormData {
// //   email: string;
// //   selectedJobId: string | null | undefined;
// //   jobTitle: string;
// //   jobDescription: string;
// //   technicalSkills: string[];
// //   softSkills: string[];
// //   testTime: number;
// // }

// // type Step = "job_selection" | "speakerandmiccheck";

// // export default function SelfApply() {
// //   const navigate = useNavigate();
// //   const [searchParams] = useSearchParams();
// //   const [status, setStatus] = useState<string>("idle");
// //   const voiceReadyRef = useRef(false);
// //   const [step, setStep] = useState<Step>("job_selection");
// //   const [jobs, setJobs] = useState<Job[]>([]);
// //   const [loadingJobs, setLoadingJobs] = useState(false);
// //   const [isSubmitting, setIsSubmitting] = useState(false);
// //   const [showAllJobs, setShowAllJobs] = useState(false);
// //   const [isCreateJobModalOpen, setIsCreateJobModalOpen] = useState(false);
// //   const [userId, setUserId] = useState<string | null>(null);
// //   const pageStartTime = useRef<number>(Date.now());
// //   const jobSelectionStartTime = useRef<number>(Date.now());
// //   const [formData, setFormData] = useState<FormData>({
// //     email: "",
// //     selectedJobId: undefined,
// //     jobTitle: "",
// //     jobDescription: "",
// //     technicalSkills: [],
// //     softSkills: [],
// //     testTime: 10,
// //   });

// //   useEffect(() => {
// //     const invitationToken = searchParams.get("token");
// //     if (invitationToken) {
// //       navigate(`/interview/invited?token=${invitationToken}`);
// //       return;
// //     }
// //     fetchJobs();
    
// //     // Track page entry and cross-platform journey
// //     trackCrossPlatformJourney('selfapply_page_entered', {
// //       referrer: document.referrer,
// //       has_token: !!new URLSearchParams(window.location.search).get('token')
// //     });
    
// //     // Track page engagement on unmount
// //     return () => {
// //       const timeSpent = Date.now() - pageStartTime.current;
// //       trackUserEngagement('page_exit', {
// //         page: 'selfapply',
// //         time_spent_ms: timeSpent,
// //         step_reached: step,
// //         jobs_loaded: jobs.length
// //       });
// //     };
// //   }, []);

// //   const fetchJobs = async () => {
// //     setLoadingJobs(true);
// //     try {
// //       const jobsList = await getJobs();
// //       setJobs(jobsList);
// //     } catch (error) {
// //       console.error("Error fetching jobs:", error);
// //       toast.error("Failed to fetch jobs");
// //     } finally {
// //       setLoadingJobs(false);
// //     }
// //   };

// //   useEffect(() => {
// //     const checkStoredAuth = async () => {
// //       const storedToken = localStorage.getItem("studentToken");

// //       if (storedToken) {
// //         const email = getEmailFromJWT(storedToken);

// //         if (!email) {
// //           localStorage.removeItem("studentToken");
// //           toast.error("Invalid authentication token. Please try again.");
// //           navigate("/");
// //           return;
// //         }

// //         localStorage.setItem("studentEmail", email);
// //         setFormData((prev) => ({ ...prev, email }));
// //         setUserId(email);
// //         // try {
// //         //   const response = await checkUser(email);
// //         //   if (response.exists) {
// //         //     setFormData((prev) => ({ ...prev, email }));
// //         //     if (response.user?.user_id) {
// //         //       setUserId(response.user.user_id);
// //         //     } else {
// //         //       setUserId(email);
// //         //     }
// //         //     // Store user name if available
// //         //     if (response.user?.name) {
// //         //       localStorage.setItem("userName", response.user.name);
// //         //     }
// //         //   } else {
// //         //     localStorage.removeItem("studentToken");
// //         //     toast.error(
// //         //       "Your data is not with us. Ask an admin to add your data."
// //         //     );
// //         //     navigate("/");
// //         //   }
// //         // } catch (error) {
// //         //   console.error("Error checking stored token:", error);
// //         //   localStorage.removeItem("studentToken");
// //         //   toast.error("Failed to verify authentication.");
// //         //   navigate("/");
// //         // }
// //         return;
// //       }

// //       const storedEmail = localStorage.getItem("studentEmail");
// //       if (storedEmail) {
// //         setFormData((prev) => ({ ...prev, email: storedEmail }));
// //         setUserId(storedEmail);
// //         // try {
// //         //   const response = await checkUser(storedEmail);
// //         //   if (response.exists) {
// //         //     setFormData((prev) => ({ ...prev, email: storedEmail }));
// //         //     if (response.user?.user_id) {
// //         //       setUserId(response.user.user_id);
// //         //     } else {
// //         //       setUserId(storedEmail);
// //         //     }
// //         //     // Store user name if available
// //         //     if (response.user?.name) {
// //         //       localStorage.setItem("userName", response.user.name);
// //         //     }
// //         //   } else {
// //         //     localStorage.removeItem("studentEmail");
// //         //     toast.error(
// //         //       "Your data is not with us. Ask an admin to add your data."
// //         //     );
// //         //     navigate("/");
// //         //   }
// //         // } catch (error) {
// //         //   console.error("Error checking stored email:", error);
// //         //   localStorage.removeItem("studentEmail");
// //         //   toast.error("Failed to verify authentication.");
// //         //   navigate("/");
// //         // }
// //         return;
// //       }

// //       // toast.error(
// //       //   "Please provide authentication via URL parameter: ?token=your_jwt_token or ?email=your@email.com"
// //       // );
// //       // navigate("/");
// //     };

// //     checkStoredAuth();
// //   }, [navigate]);

// //   const handleJobSelect = (jobId: string | null) => {
// //     if (jobId) {
// //       const selectedJob = jobs.find((j) => j.job_id === jobId);
// //       if (selectedJob) {
// //         const selectionTime = Date.now() - jobSelectionStartTime.current;
        
// //         // Track job selection
// //         trackJobSelection(selectedJob.job_title);
// //         trackUserEngagement('job_selected', {
// //           job_id: jobId,
// //           job_title: selectedJob.job_title,
// //           selection_time_ms: selectionTime,
// //           total_jobs_available: jobs.length,
// //           job_type: 'predefined'
// //         });
        
// //         setFormData({
// //           ...formData,
// //           selectedJobId: jobId,
// //           jobTitle: selectedJob.job_title,
// //           jobDescription: selectedJob.job_description,
// //           technicalSkills: selectedJob.technical_skills,
// //           softSkills: selectedJob.soft_skills,
// //         });
// //         setStep("speakerandmiccheck");
        
// //         // Track progression to device check
// //         trackCrossPlatformJourney('device_check_started', {
// //           job_title: selectedJob.job_title,
// //           previous_step: 'job_selection'
// //         });
// //       }
// //     }
// //   };

// //   const handleCustomJobSubmit = (jobData: {
// //     job_title: string;
// //     job_description: string;
// //     technical_skills: string[];
// //     soft_skills: string[];
// //   }) => {
// //     const selectionTime = Date.now() - jobSelectionStartTime.current;
    
// //     // Track custom job creation
// //     trackUserEngagement('custom_job_created', {
// //       job_title: jobData.job_title,
// //       creation_time_ms: selectionTime,
// //       technical_skills_count: jobData.technical_skills.length,
// //       soft_skills_count: jobData.soft_skills.length,
// //       job_type: 'custom'
// //     });
    
// //     trackFeatureUsage('custom_job_creation', 'completed', {
// //       job_title: jobData.job_title,
// //       description_length: jobData.job_description.length
// //     });
    
// //     setFormData({
// //       ...formData,
// //       selectedJobId: null,
// //       jobTitle: jobData.job_title,
// //       jobDescription: jobData.job_description,
// //       technicalSkills: jobData.technical_skills,
// //       softSkills: jobData.soft_skills,
// //     });
// //     setIsCreateJobModalOpen(false);
// //     setStep("speakerandmiccheck");
// //   };

// //   const handleStartInterview = async () => {
// //     if (!userId) {
// //       toast.error("User ID not found");
// //       return;
// //     }

// //     setIsSubmitting(true);

// //     if (!voiceReadyRef.current) {
// //       setStatus("Preparing voice system...");
// //       try {
// //         await preparePiperVoice((s) => setStatus(s), DEFAULT_PIPER_BACKEND);
// //         voiceReadyRef.current = true;
// //       } catch (error) {
// //         console.error("Piper preparation failed:", error);
// //         toast.warning(
// //           "Voice system preparation failed, continuing without voice"
// //         );
// //       }
// //     }

// //     try {
// //       let job: Job;
// //       if (formData.selectedJobId) {
// //         const selectedJob = jobs.find((j) => j.job_id === formData.selectedJobId);
// //         if (selectedJob) {
// //           job = selectedJob;
// //         } else {
// //           throw new Error("Selected job not found");
// //         }
// //         // job = await getJob(formData.selectedJobId);
// //       } else {
// //         job = {
// //           job_id: `custom_${Date.now()}`,
// //           job_title: formData.jobTitle,
// //           job_description: formData.jobDescription,
// //           technical_skills: formData.technicalSkills,
// //           soft_skills: formData.softSkills,
// //         };
// //       }

// //       const interviewConfig = {
// //         userId,
// //         jobId: job.job_id,
// //         jobTitle: job.job_title,
// //         jobDescription: job.job_description,
// //         interviewTime: formData.testTime,
// //         language: "English",
// //         difficulty: "medium",
// //         examinationPoints: [...formData.technicalSkills, ...formData.softSkills],
// //       };

// //       sessionStorage.setItem(
// //         "interviewConfig",
// //         JSON.stringify(interviewConfig)
// //       );
// //       navigate("/interview");
// //     } catch (error) {
// //       console.error("Error starting interview:", error);
// //       toast.error((error as Error).message || "Failed to start interview");
// //       setStep("job_selection");
// //       setIsSubmitting(false);
// //     }
// //   };

// //   const renderStep = () => {
// //     switch (step) {
// //       case "job_selection":
// //         return (
// //           <div className="w-full">
// //             <header className="border-b border-gray-200 bg-white">
// //               <div className="relative w-full px-6 py-4 flex items-center justify-center">
// //                 <button
// //                   onClick={() => navigate("/")}
// //                   className="cursor-pointer absolute left-6 text-gray-600 hover:text-gray-900"
// //                 >
// //                   <ChevronLeft />
// //                 </button>
// //                 {/* <div className="flex gap-3 items-center"> */}
// //                 <h1 className="text-base font-semibold ">
// //                   Zoe: Your Learning Assistant
// //                 </h1>
// //                 {/* <Badge className="px-1 bg-green-400 rounded-sm font-semibold">
// //                     Beta
// //                   </Badge> */}
// //                 {/* </div> */}
// //               </div>
// //             </header>

// //             <div className="w-full flex justify-center">
// //               <main className="max-w-7xl mx-auto px-6 py-12">
// //                 <div className="flex justify-center mb-8">
// //                   <img
// //                     src="/assets/zoe-talking 1.svg"
// //                     alt="Zoe Character"
// //                     className="w-32 h-32 md:w-40 md:h-40"
// //                   />
// //                 </div>

// //                 <h2 className="text-xl font-bold text-center mb-8">
// //                   Select a job role to practice
// //                 </h2>

// //                 {loadingJobs ? (
// //                   <div className="flex justify-center py-8">
// //                     <Spinner size="lg" />
// //                   </div>
// //                 ) : (
// //                   <>
// //                     <JobSelection
// //                       jobs={jobs}
// //                       onJobSelect={handleJobSelect}
// //                       selectedJobId={formData.selectedJobId}
// //                       showAll={showAllJobs}
// //                     />

// //                     <div className="text-center mb-8 mt-12">
// //                       <h3 className="text-lg font-bold text-gray-800 mb-4">
// //                         Can't find a job role to practice?
// //                       </h3>
// //                       <Button
// //                         variant="default"
// //                         size="default"
// //                         onClick={() => setIsCreateJobModalOpen(true)}
// //                         className="bg-[#2C5F2D] hover:bg-[#1f4420] text-white text-sm font-semibold px-6 py-5 rounded-md shadow-md transition-all hover:scale-[1.02]"
// //                       >
// //                         Create Custom Interview
// //                       </Button>
// //                     </div>

// //                     {/* {jobs.length > 3 && !showAllJobs && (
// //                       <div className="text-center mb-8">
// //                         <Button
// //                           variant="default"
// //                           size="lg"
// //                           onClick={() => setShowAllJobs(true)}
// //                           className="bg-white rounded-full shadow-sm"
// //                         >
// //                           See all new roles <ChevronDownIcon />
// //                         </Button>
// //                       </div>
// //                     )} */}
// //                   </>
// //                 )}
// //               </main>
// //             </div>

// //             {/* Bottom notification */}
// //             <div className="fixed bottom-10 left-0 right-0 flex justify-center pb-4">
// //               <Badge className="px-3 py-1 font-bold text-sky-600 rounded-sm bg-blue-100">
// //                 Please note that Zoe works best on Google Chrome
// //               </Badge>
// //             </div>

// //             {/* Create Job Modal */}
// //             <CreateJobModal
// //               isOpen={isCreateJobModalOpen}
// //               onClose={() => setIsCreateJobModalOpen(false)}
// //               onSubmit={handleCustomJobSubmit}
// //             />
// //           </div>
// //         );

// //       case "speakerandmiccheck":
// //         return (
// //           <div className="w-full">
// //             <header className="border-b border-gray-200 bg-white">
// //               <div className="relative w-full px-6 py-4 flex items-center justify-center">
// //                 <button
// //                   onClick={() => navigate("/")}
// //                   className="cursor-pointer absolute left-6 text-gray-600 hover:text-gray-900"
// //                 >
// //                   <ChevronLeft />
// //                 </button>
// //                 {/* <div className="flex gap-3 items-center"> */}
// //                 <h1 className="text-base font-semibold ">
// //                   Zoe: Your Learning Assistant
// //                 </h1>
// //                 {/* <Badge className="px-1 bg-green-400 rounded-sm font-semibold">
// //                     Beta
// //                   </Badge> */}
// //                 {/* </div> */}
// //               </div>
// //             </header>

// //             <div>
// //               <div
// //                 className="bg-cover bg-center min-h-[94vh] flex items-center justify-center"
// //                 style={{
// //                   background:
// //                     "radial-gradient(53% 119.66% at 50% 47%, rgba(255, 255, 255, 0.2) 0%, rgba(111, 185, 113, 0.2) 100%)",
// //                 }}
// //               >
// //                 <DeviceTester onStartInterview={handleStartInterview} />
// //               </div>
// //             </div>
// //           </div>
// //         );

// //       default:
// //         return null;
// //     }
// //   };

// //   return <div className="flex min-h-screen bg-primary">{renderStep()}</div>;
// // }

// ***********************************************************


// import { useState, useEffect, useRef } from "react";
// import { useNavigate, useSearchParams } from "react-router-dom";
// import { toast } from "sonner";
// import { Spinner } from "@/components/ui/spinner";
// import { Button } from "@/components/ui/button";
// import DeviceTester from "@/components/DeviceTester";
// import CreateJobModal from "@/components/CreateJobModal";
// import { DEFAULT_PIPER_BACKEND, preparePiperVoice } from "../lib/piper";
// import { getJobs } from "../services/api/serverApi";
// import { getEmailFromJWT } from "../utils/jwt";
// import type { Job } from "../models/job";
// import { 
//   ChevronLeft, 
//   Plus, 
//   Clock, 
//   Laptop,
//   Sparkles,
//   ArrowRight,
//   Code2,
//   Terminal,
//   Globe,
//   Layout,
//   Stars,
//   Info
// } from "lucide-react";
// import { Badge } from "@/components/ui/badge";

// const getJobIcon = (title: string) => {
//   const t = title.toLowerCase();
//   if (t.includes('javascript') || t.includes('react')) return <Layout className="text-yellow-500" size={26} />;
//   if (t.includes('frontend')) return <Globe className="text-blue-500" size={26} />;
//   if (t.includes('python')) return <Terminal className="text-green-600" size={26} />;
//   return <Code2 className="text-[#2C5F2D]" size={26} />;
// };

// export default function SelfApply() {
//   const navigate = useNavigate();
//   const [step, setStep] = useState<"job_selection" | "speakerandmiccheck">("job_selection");
//   const [jobs, setJobs] = useState<Job[]>([]);
//   const [loadingJobs, setLoadingJobs] = useState(false);
//   const voiceReadyRef = useRef(false);
//   const [isCreateJobModalOpen, setIsCreateJobModalOpen] = useState(false);
//   const [userId, setUserId] = useState<string | null>(null);

//   useEffect(() => {
//     fetchJobs();
//     const storedToken = localStorage.getItem("studentToken");
//     if (storedToken) {
//       const email = getEmailFromJWT(storedToken);
//       if (email) setUserId(email);
//     }
//   }, []);

//   const fetchJobs = async () => {
//     setLoadingJobs(true);
//     try {
//       const jobsList = await getJobs();
//       setJobs(jobsList);
//     } catch (error) {
//       toast.error("Failed to fetch jobs");
//     } finally {
//       setLoadingJobs(false);
//     }
//   };

//   const handleStartInterview = async () => {
//     if (!userId) return toast.error("User ID not found");
//     if (!voiceReadyRef.current) {
//       try {
//         await preparePiperVoice(() => {}, DEFAULT_PIPER_BACKEND);
//         voiceReadyRef.current = true;
//       } catch (e) {}
//     }
//     navigate("/interview");
//   };

//   return (
//     <div className="h-screen bg-white flex flex-col font-sans overflow-hidden relative">
      
//       {/* --- FLOATING NOTE (Top Right) --- */}
//       <div className="absolute top-20 right-8 z-20 hidden md:block opacity-0 custom-fade-in" style={{ animationDelay: '800ms', animationFillMode: 'forwards' }}>
//         <Badge className="px-4 py-2 font-black text-[#007AFF] rounded-xl bg-[#EBF5FF] border border-[#D1E9FF] text-[9px] uppercase tracking-widest shadow-sm flex items-center gap-2">
//           <Info size={14} />
//           Works best on Google Chrome
//         </Badge>
//       </div>

//       {/* --- HEADER --- */}
//       <header className="shrink-0 border-b border-gray-100 py-6 bg-white z-10">
//         <div className="flex items-center justify-center gap-3">
//           <Stars className="text-yellow-400 fill-yellow-400 animate-pulse" size={22} />
//           <h1 className="text-xl font-black text-gray-900 tracking-tighter uppercase">
//             Zoe: Your Learning Assistant
//           </h1>
//           <Sparkles className="text-blue-400" size={20} />
//         </div>
//       </header>

//       {/* --- MAIN AREA --- */}
//       <main className="flex-1 flex flex-col px-12 py-4 relative overflow-y-auto md:overflow-hidden">
        
//         {/* Back Button */}
//         <div className="shrink-0">
//           <button 
//             onClick={() => step === "speakerandmiccheck" ? setStep("job_selection") : navigate("/")}
//             className="flex items-center gap-1 text-gray-400 hover:text-black transition-all group py-2"
//           >
//             <ChevronLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
//             <span className="text-[11px] font-black uppercase tracking-[0.2em]">Back</span>
//           </button>
//         </div>

//         {/* Content Container */}
//         <div className="flex-1 flex flex-col items-center justify-start -mt-2">
//           {step === "job_selection" ? (
//             <div className="w-full max-w-6xl flex flex-col items-center">
              
//               <div className="mb-6 custom-float shrink-0">
//                   <div className="relative">
//                     <div className="absolute inset-0 bg-green-100 blur-3xl rounded-full opacity-40"></div>
//                     <img src="/assets/zoe-talking 1.svg" alt="Zoe" className="relative w-24 h-24 md:w-28 md:h-28" />
//                   </div>
//               </div>

//               <h2 className="text-2xl font-black text-center mb-10 text-gray-900 tracking-tight custom-fade-in">
//                 Select a job role to practice
//               </h2>

//               {loadingJobs ? (
//                 <Spinner className="text-[#2C5F2D]" />
//               ) : (
//                 <div className="w-full flex flex-col">
//                   {/* Job Cards */}
//                   <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
//                     {jobs.slice(0, 3).map((job, index) => (
//                       <div 
//                         key={job.job_id}
//                         onClick={() => setStep("speakerandmiccheck")}
//                         className="group cursor-pointer bg-white border border-gray-100 rounded-[2rem] p-10 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 flex flex-col h-[300px] opacity-0 custom-slide-up"
//                         style={{ animationDelay: `${index * 150}ms`, animationFillMode: 'forwards' }}
//                       >
//                         <div className="flex items-center gap-4 mb-6">
//                           <div className="p-3 bg-gray-50 rounded-2xl group-hover:bg-green-50">
//                               {getJobIcon(job.job_title)}
//                           </div>
//                           <h3 className="text-[#2C5F2D] font-black text-xl leading-tight group-hover:text-black transition-colors">{job.job_title}</h3>
//                         </div>

//                         <p className="text-gray-500 text-sm leading-relaxed mb-8 line-clamp-3 flex-1 font-medium">
//                           {job.job_description || "Sharpen your skills for this specific role with a simulated high-pressure technical interview."}
//                         </p>
                        
//                         <div className="pt-6 border-t border-gray-50 flex items-center justify-between text-gray-400 font-bold">
//                           <div className="flex items-center gap-2">
//                             <Clock size={16} />
//                             <span className="text-[10px] uppercase tracking-widest">5-10 mins</span>
//                           </div>
//                           <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-[#2C5F2D] group-hover:scale-110 transition-all duration-300">
//                             <ArrowRight size={20} className="text-gray-400 group-hover:text-white transition-colors" />
//                           </div>
//                         </div>
//                       </div>
//                     ))}
//                   </div>

//                   {/* COMPACT & CLEAN BUTTON AREA */}
//                   <div className="text-center space-y-4 opacity-0 custom-fade-in pb-12" style={{ animationDelay: '600ms', animationFillMode: 'forwards' }}>
//                     <h3 className="text-sm font-bold text-gray-400 uppercase tracking-[0.2em]">
//                       Can't find a role?
//                     </h3>
                    
//                     <div className="flex justify-center">
//                       <Button
//                         onClick={() => setIsCreateJobModalOpen(true)}
//                         className="bg-[#2C5F2D] hover:bg-[#1a3a1b] text-white font-black px-8 py-4 h-auto rounded-xl shadow-lg transition-all hover:scale-105 active:scale-95 flex items-center gap-2 border-b-4 border-[#1a3a1b]"
//                       >
//                         <Plus size={18} />
//                         <span className="text-sm uppercase tracking-wider">Create Custom Interview</span>
//                       </Button>
//                     </div>
//                   </div>
//                 </div>
//               )}
//             </div>
//           ) : (
//             <div className="w-full max-w-3xl custom-zoom-in mt-6">
//                <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl overflow-hidden">
//                   <div className="bg-[#1A1A1A] p-10 text-white flex items-center justify-between">
//                     <h3 className="text-xl font-black flex items-center gap-3">
//                       <Laptop size={26} className="text-green-400" /> System Check
//                     </h3>
//                   </div>
//                   <div className="p-10">
//                     <DeviceTester onStartInterview={handleStartInterview} />
//                   </div>
//                </div>
//             </div>
//           )}
//         </div>
//       </main>

//       <style>{`
//         @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-10px); } }
//         @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
//         @keyframes slideUp { 
//           from { opacity: 0; transform: translateY(15px); } 
//           to { opacity: 1; transform: translateY(0); } 
//         }
//         .custom-float { animation: float 4s ease-in-out infinite; }
//         .custom-fade-in { animation: fadeIn 0.8s ease-out forwards; }
//         .custom-slide-up { animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
//         .line-clamp-3 {
//           display: -webkit-box;
//           -webkit-line-clamp: 3;
//           -webkit-box-orient: vertical;  
//           overflow: hidden;
//         }
//       `}</style>

//       <CreateJobModal
//         isOpen={isCreateJobModalOpen}
//         onClose={() => setIsCreateJobModalOpen(false)}
//         onSubmit={() => {
//           setIsCreateJobModalOpen(false);
//           setStep("speakerandmiccheck");
//         }}
//       />
//     </div>
//   );
// }

import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import DeviceTester from "@/components/DeviceTester";
import CreateJobModal from "@/components/CreateJobModal";
import { DEFAULT_PIPER_BACKEND, preparePiperVoice } from "../lib/piper";
import { getJobs } from "../services/api/serverApi";
import { getEmailFromJWT } from "../utils/jwt";
import type { Job } from "../models/job";
import { 
  ChevronLeft, 
  Plus, 
  Clock, 
  Laptop,
  Sparkles,
  ArrowRight,
  Code2,
  Terminal,
  Globe,
  Layout,
  Info
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
    if (!userId) return toast.error("User ID not found");
    
    // Don't block navigation - voice will be prepared in Interview component if needed
    // This prevents UI freezing on button click
    navigate("/interview");
  };

  return (
    <div className="h-screen bg-[#FBFAF8] flex flex-col font-sans overflow-hidden relative">
      
      {/* --- FLOATING NOTE (Top Right) --- */}
      <div className="absolute top-20 right-8 z-20 hidden md:block opacity-0 custom-fade-in" style={{ animationDelay: '800ms', animationFillMode: 'forwards' }}>
        <Badge className="px-4 py-2 font-black text-[#007AFF] rounded-xl bg-[#EBF5FF] border border-[#D1E9FF] text-[9px] uppercase tracking-widest shadow-sm flex items-center gap-2">
          <Info size={14} />
          Works best on Google Chrome
        </Badge>
      </div>

      <Header />

      {/* --- MAIN AREA --- */}
      <main className="flex-1 flex flex-col px-12 py-4 relative overflow-y-auto md:overflow-hidden">
        
        {/* Back Button */}
        <div className="shrink-0">
          <button 
            onClick={() => step === "speakerandmiccheck" ? setStep("job_selection") : navigate("/")}
            className="flex items-center gap-1 text-gray-400 hover:text-black transition-all group py-2"
          >
            <ChevronLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-[11px] font-black uppercase tracking-[0.2em]">Back</span>
          </button>
        </div>

        {/* Content Container */}
        <div className="flex-1 flex flex-col items-center justify-start -mt-2">
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
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
                    {jobs.slice(0, 3).map((job, index) => (
                      <div 
                        key={job.job_id}
                        onClick={() => setStep("speakerandmiccheck")}
                        className="group cursor-pointer bg-white border border-gray-100 rounded-[2rem] p-10 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 flex flex-col h-[300px] opacity-0 custom-slide-up"
                        style={{ animationDelay: `${index * 150}ms`, animationFillMode: 'forwards' }}
                      >
                        <div className="flex items-center gap-4 mb-6">
                          <div className="p-4 bg-[#E6F6EF] rounded-2xl">
                            {getJobIcon(job.job_title)}
                          </div>
                          <h3 className="text-[#2B5E2B] font-black text-xl leading-tight group-hover:text-black transition-colors">{job.job_title}</h3>
                        </div>

                        <p className="text-gray-500 text-sm leading-relaxed mb-8 line-clamp-3 flex-1 font-medium">
                          {job.job_description || "Sharpen your skills for this specific role with a simulated high-pressure technical interview."}
                        </p>
                        
                        <div className="pt-6 border-t border-gray-50 flex items-center justify-between text-gray-400 font-bold">
                          <div className="flex items-center gap-2">
                            <Clock size={16} />
                            <span className="text-[10px] uppercase tracking-widest">5-10 mins</span>
                          </div>
                          <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-[#2B5E2B] group-hover:scale-110 transition-all duration-300">
                            <ArrowRight size={20} className="text-gray-400 group-hover:text-white transition-colors" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="text-center space-y-4 opacity-0 custom-fade-in pb-12" style={{ animationDelay: '600ms', animationFillMode: 'forwards' }}>
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-[0.2em]">
                      Can't find a role?
                    </h3>
                    
                    <div className="flex justify-center">
                      <Button
                        onClick={() => setIsCreateJobModalOpen(true)}
                        className="bg-[#2B5E2B] hover:bg-[#1a3a1b] text-white font-black px-8 py-4 h-auto rounded-xl shadow-lg transition-all hover:scale-105 active:scale-95 flex items-center gap-2 border-b-4 border-[#1a3a1b]"
                      >
                        <Plus size={18} />
                        <span className="text-sm uppercase tracking-wider">Create Custom Interview</span>
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* --- SYSTEM CHECK UI (SCREENSHOT STYLE) --- */
            <div className="w-full max-w-3xl custom-zoom-in mt-6 zoe-hardware-wrapper">
               <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-[0_20px_60px_rgba(0,0,0,0.1)] overflow-hidden">
                  <div className="bg-[#2B5E2B] p-8 text-white flex items-center px-10">
                    <h3 className="text-xl font-black flex items-center gap-3">
                      <Laptop size={24} className="text-green-300" /> System Check
                    </h3>
                  </div>
                  <div className="p-10 bg-[#FAFAFA]">
                    <div className="bg-white rounded-[1.5rem] p-6 shadow-inner border border-gray-50">
                      <DeviceTester onStartInterview={handleStartInterview} />
                    </div>
                  </div>
               </div>
            </div>
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