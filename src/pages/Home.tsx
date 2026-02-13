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
import { toast } from "sonner";
import { getEmailFromJWT, isValidJWTFormat } from "../utils/jwt";
import { motion } from "framer-motion"; 
import { Briefcase, BrainCircuit, Code2 } from "lucide-react";
import InterviewCard from "@/components/InterviewCard";

export default function Home() {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const interviewTypes = [
    {
      id: "1-1-interview",
      icon: <Briefcase className="w-6 h-6 text-[#00A35C]" />,
      title: "1:1 Interview",
      description: "Test your knowledge, and practice your communication skills with an AI assistant.",
      estimatedTime: "5-10 mins",
      comingSoon: false,
    },
    {
      id: "flowchart",
      icon: <BrainCircuit className="w-6 h-6 text-[#00A35C]" />,
      title: "Critical Thinking with Flowchart",
      description: "Design flowcharts to test your problem-solving, algorithm, and process-thinking skills",
      estimatedTime: "15-20 mins",
      comingSoon: true,
    },
    {
      id: "competitive-coding",
      icon: <Code2 className="w-6 h-6 text-[#00A35C]" />,
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
    setTimeout(() => {
      navigate("/selfapply");
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
    <div className="min-h-screen w-full bg-[#F8FAFC] flex flex-col font-sans overflow-y-auto">
      
      {/* Header with Centered Text */}
      <header className="sticky top-0 z-50 shrink-0 w-full border-b border-slate-200 bg-white/90 backdrop-blur-sm shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 grid grid-cols-3 items-center">
          {/* Logo Left */}
          <div className="flex justify-start">
            <img 
              src="/assets/image 1.svg" 
              alt="Logo" 
              className="h-8 w-auto object-contain cursor-pointer"
              onClick={() => (window.location.href = "https://app.zuvy.org")}
            />
          </div>

          {/* Centered Text */}
          <div className="flex justify-center text-center">
            <h1 className="text-[10px] md:text-sm font-bold text-slate-800 tracking-tight leading-tight">
              Zoe: Your Learning Assistant
            </h1>
          </div>

          {/* Right Spacer */}
          <div className="flex justify-end" />
        </div>
      </header>

      {/* Main UI - py-10 added for breathing room on mobile */}
      <main className="flex-1 flex flex-col items-center justify-center max-w-6xl mx-auto px-6 py-10 w-full text-center">
        
        <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-4">
          <img
            src="/assets/zoe-talking 1.svg"
            alt="Zoe"
            className="w-20 h-20 md:w-28 md:h-28 drop-shadow-2xl animate-bounce-slow mx-auto"
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
                onClick={() => handleCardClick(type.id, type.comingSoon)}
                isSelected={selectedType === type.id}
                comingSoon={type.comingSoon}
              />
            </motion.div>
          ))}
        </div>

        {/* System Hint */}
        <div className="mt-12 mx-auto pb-6">
          <div className="px-6 py-2 bg-[#E8F3FF] border border-[#D0E7FF] rounded-full shadow-sm inline-block">
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