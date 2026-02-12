// import React, { useEffect, useState } from "react";
// import { useNavigate, useSearchParams } from "react-router-dom";
// import SelectionCard from "@/components/SelectionCard";
// import { Button } from "@/components/ui/button";
// import { toast } from "sonner";
// // import { checkUser } from "../services/api/serverApi";
// import { getEmailFromJWT, isValidJWTFormat } from "../utils/jwt";
// import { Badge } from "@/components/ui/badge";

// export default function Home() {
//   const [selectedType, setSelectedType] = useState<string | null>(null);
//   const [consentChecked, setConsentChecked] = useState(true);
//   const navigate = useNavigate();
//   const [searchParams] = useSearchParams();

//   const interviewTypes = [
//     {
//       id: "1-1-interview",
//       icon: "/assets/bot-message-square.svg",
//       title: "1:1 Interview",
//       description:
//         "Test your knowledge, and practice your communication skills with an AI assistant.",
//       estimatedTime: "5-10 mins",
//       comingSoon: false,
//     },
//     {
//       id: "flowchart",
//       icon: "/assets/workflow.svg",
//       title: "Critical Thinking with Flowchart",
//       description:
//         "Design flowcharts to test your problem-solving, algorithm, and process-thinking skills",
//       estimatedTime: "15-20 mins",
//       comingSoon: true,
//     },
//     {
//       id: "competitive-coding",
//       icon: "/assets/square-code.svg",
//       title: "Competitive coding",
//       description:
//         "Technical interview to solve algorithmic and data-structure problems under time pressure.",
//       estimatedTime: "30-45 mins",
//       comingSoon: true,
//     },
//   ];

//   const handleCardClick = (id: string) => {
//     setSelectedType(id);
//     setTimeout(() => {
//       navigate("/selfapply");
//     }, 300);
//   };

//   useEffect(() => {
//     const authenticateFromQuery = async () => {
//       const token = searchParams.get("token") || searchParams.get("jwt");

//       if (token) {
//         if (isValidJWTFormat(token)) {
//           const email = getEmailFromJWT(token);
//           if (email) {
//             localStorage.setItem("studentToken", token);
//             localStorage.setItem("studentEmail", email);
//             toast.success("Authentication successful");
//             // try {
//             //   const response = await checkUser(email);
//             //   if (response.exists) {
//             //     localStorage.setItem("studentToken", token);
//             //     localStorage.removeItem("studentEmail");
//             //     // Store user name if available
//             //     if (response.user?.name) {
//             //       localStorage.setItem("userName", response.user.name);
//             //     }
//             //     toast.success("Authentication successful");
//             //   } else {
//             //     toast.error("Email not found. Please contact support.");
//             //   }
//             // } catch (error) {
//             //   console.error("Error checking user:", error);
//             //   toast.error("Failed to verify email. Please contact support.");
//             // }
//           } else {
//             toast.error("Invalid JWT token: no email found in payload");
//           }
//         } else {
//           toast.error("Invalid JWT token format");
//         }
//         return;
//       }

//       // const email = searchParams.get("email");
//       // if (email) {
//       //   try {
//       //     const response = await checkUser(email);
//       //     if (response.exists) {
//       //       localStorage.setItem("studentEmail", email);
//       //       // Store user name if available
//       //       if (response.user?.name) {
//       //         localStorage.setItem("userName", response.user.name);
//       //       }
//       //       toast.success("Authentication successful");
//       //     } else {
//       //       toast.error("Email not found. Please contact support.");
//       //     }
//       //   } catch (error) {
//       //     console.error("Error checking user:", error);
//       //     toast.error("Failed to verify email. Please contact support.");
//       //   }
//       // }
//     };

//     authenticateFromQuery();
//   }, [searchParams]);

//   return (
//     <div className="min-h-screen bg-primary flex flex-col">
//       <header className="border-b border-gray-200 bg-white">
//         <div className="relative w-full px-6 py-4 flex items-center justify-center">
//           <button
//             onClick={() => (window.location.href = "https://app.zuvy.org")}
//             className="cursor-pointer absolute left-6 text-gray-600 hover:text-gray-900"
//           >
//             <svg
//               width="20"
//               height="20"
//               viewBox="0 0 20 20"
//               fill="none"
//               xmlns="http://www.w3.org/2000/svg"
//             >
//               <path
//                 d="M15 5L5 15M5 5L15 15"
//                 stroke="currentColor"
//                 strokeWidth="2"
//                 strokeLinecap="round"
//                 strokeLinejoin="round"
//               />
//             </svg>
//           </button>
//           {/* <div className="flex gap-3 items-center"> */}
//           <h1 className="text-base font-semibold ">
//             Zoe: Your Learning Assistant
//           </h1>
//           {/* <Badge className="px-1 bg-green-400 rounded-sm font-semibold">
//               Beta
//             </Badge>
//           </div> */}
//         </div>
//       </header>

//       <main className="max-w-5xl mx-auto px-6 py-12 flex-1 flex flex-col">
//         <div className="flex justify-center mb-8">
//           <img
//             src="/assets/zoe-talking 1.svg"
//             alt="Zoe Character"
//             className="w-32 h-32 md:w-40 md:h-40"
//           />
//         </div>

//         <h3 className="text-xl font-bold text-muted-foreground text-center mb-8">
//           What would you like to practice today?
//         </h3>

//         <div className="flex items-center justify-center mb-6">
//           <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground">
//             {/* <input
//               type="checkbox"
//               checked={consentChecked}
//               onChange={(e) => setConsentChecked(e.target.checked)}
//               className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
//             /> */}
//             <span>By continuing, you agree to let us use this data to enhance learning experience.</span>
//           </label>
//         </div>

//         <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto mb-8">
//           {interviewTypes.map((type) => (
//             <SelectionCard
//               key={type.id}
//               icon={type.icon}
//               title={type.title}
//               description={type.description}
//               estimatedTime={type.estimatedTime}
//               isSelected={selectedType === type.id}
//               onClick={() => handleCardClick(type.id)}
//               comingSoon={type.comingSoon}
//               showEstimatedTime={false}
//             />
//           ))}
//         </div>

//         <div className="fixed bottom-10 left-0 right-0 flex justify-center pb-4">
//           <Badge className="px-3 py-1 font-bold text-sky-600 rounded-sm bg-blue-100">
//             Please note that Zoe works best on Google Chrome
//           </Badge>
//         </div>
//       </main>
//     </div>
//   );
// }


import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import SelectionCard from "@/components/SelectionCard";
import { toast } from "sonner";
import { getEmailFromJWT, isValidJWTFormat } from "../utils/jwt";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion"; // Install using: npm install framer-motion
import { Briefcase, BrainCircuit, Code2, Chrome, ArrowLeft } from "lucide-react";

export default function Home() {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const interviewTypes = [
    {
      id: "1-1-interview",
      icon: <Briefcase className="w-6 h-6 text-green-600" />,
      title: "1:1 Interview",
      description: "Test your knowledge and practice communication skills with our advanced AI assistant.",
      estimatedTime: "5-10 mins",
      comingSoon: false,
      color: "border-green-100 bg-green-50/50"
    },
    {
      id: "flowchart",
      icon: <BrainCircuit className="w-6 h-6 text-blue-600" />,
      title: "Critical Thinking",
      description: "Design flowcharts to test your problem-solving, algorithm, and process-thinking skills.",
      estimatedTime: "15-20 mins",
      comingSoon: true,
      color: "border-blue-100 bg-blue-50/50"
    },
    {
      id: "competitive-coding",
      icon: <Code2 className="w-6 h-6 text-purple-600" />,
      title: "Competitive Coding",
      description: "Technical interview to solve algorithmic and data-structure problems under pressure.",
      estimatedTime: "30-45 mins",
      comingSoon: true,
      color: "border-purple-100 bg-purple-50/50"
    },
  ];

  const handleCardClick = (id: string, isComingSoon: boolean) => {
    if (isComingSoon) {
      toast.info("This module is coming soon! Stay tuned.");
      return;
    }
    setSelectedType(id);
    toast.loading("Preparing your session...");
    setTimeout(() => {
      navigate("/selfapply");
    }, 800);
  };

  useEffect(() => {
    const authenticateFromQuery = async () => {
      const token = searchParams.get("token") || searchParams.get("jwt");
      if (token && isValidJWTFormat(token)) {
        const email = getEmailFromJWT(token);
        if (email) {
          localStorage.setItem("studentToken", token);
          localStorage.setItem("studentEmail", email);
          toast.success("Welcome back!");
        }
      }
    };
    authenticateFromQuery();
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans selection:bg-green-100">
      {/* Navbar */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <button
            onClick={() => (window.location.href = "https://app.zuvy.org")}
            className="group flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-all font-medium text-sm"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Dashboard
          </button>
          
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
            <h1 className="text-sm font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">
              Zoe Assistant
            </h1>
          </div>

          <div className="w-[120px]" /> {/* Spacer for symmetry */}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12 flex-1 flex flex-col items-center">
        {/* Zoe Character Animation */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="relative mb-10"
        >
          <div className="absolute inset-0 bg-green-200 blur-3xl opacity-20 rounded-full" />
          <img
            src="/assets/zoe-talking 1.svg"
            alt="Zoe"
            className="w-32 h-32 md:w-44 md:h-44 relative z-10 drop-shadow-2xl animate-bounce-slow"
          />
        </motion.div>

        {/* Hero Section */}
        <div className="text-center mb-12 space-y-3">
          <motion.h2 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight"
          >
            What would you like to <span className="text-green-600">practice</span> today?
          </motion.h2>
          <p className="text-slate-500 max-w-lg mx-auto text-sm md:text-base font-medium">
            Join 1000+ students practicing with Zoe AI to clear their dream technical interviews.
          </p>
          <div className="pt-4">
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-widest border border-slate-200">
               Data usage policy: Enhanced Learning Experience
            </span>
          </div>
        </div>

        {/* Selection Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
          {interviewTypes.map((type, index) => (
            <motion.div
              key={type.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={!type.comingSoon ? { y: -10 } : {}}
              onClick={() => handleCardClick(type.id, type.comingSoon)}
              className={cn(
                "group relative p-8 rounded-[2rem] border-2 transition-all cursor-pointer flex flex-col h-full bg-white",
                selectedType === type.id ? "border-green-500 ring-4 ring-green-50" : "border-slate-100 hover:border-slate-300",
                type.comingSoon && "opacity-75 grayscale bg-slate-50 cursor-not-allowed"
              )}
            >
              <div className={cn("p-4 rounded-2xl w-fit mb-6", type.color)}>
                {type.icon}
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <h4 className="text-xl font-bold text-slate-900">{type.title}</h4>
                  {type.comingSoon && (
                    <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none text-[10px] uppercase font-black tracking-tighter">
                      Coming Soon
                    </Badge>
                  )}
                </div>
                <p className="text-slate-500 text-sm leading-relaxed font-medium">
                  {type.description}
                </p>
              </div>

              <div className="mt-8 flex items-center justify-between">
                 <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Time</span>
                    <span className="text-xs font-bold text-slate-700">{type.estimatedTime}</span>
                 </div>
                 {!type.comingSoon && (
                   <div className="h-10 w-10 rounded-full bg-slate-900 flex items-center justify-center text-white group-hover:bg-green-600 transition-colors">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14m-7-7 7 7-7 7"/></svg>
                   </div>
                 )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Footer Hint */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-16 flex items-center gap-3 px-6 py-3 bg-blue-50/50 border border-blue-100 rounded-2xl"
        >
          <Chrome className="w-5 h-5 text-blue-600" />
          <span className="text-xs font-bold text-blue-700 tracking-tight">
            Zoe works best on Google Chrome Desktop for the best voice experience.
          </span>
        </motion.div>
      </main>

      {/* Background Decor */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none -z-10 overflow-hidden">
         <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-green-50 rounded-full blur-[120px] opacity-60" />
         <div className="absolute bottom-[-5%] left-[-5%] w-[400px] h-[400px] bg-blue-50 rounded-full blur-[100px] opacity-40" />
      </div>

      <style>{`
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-15px); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

// Utility function (if not using shadcn)
function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}