import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import SelectionCard from "@/components/SelectionCard";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { checkUser } from "../services/api/serverApi";
import { getEmailFromJWT, isValidJWTFormat } from "../utils/jwt";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const interviewTypes = [
    {
      id: "1-1-interview",
      icon: "/assets/bot-message-square.svg",
      title: "1:1 Interview",
      description:
        "Test your knowledge, and practice your communication skills with an AI assistant.",
      estimatedTime: "5-10 mins",
      comingSoon: false,
    },
    {
      id: "flowchart",
      icon: "/assets/workflow.svg",
      title: "Critical Thinking with Flowchart",
      description:
        "Design flowcharts to test your problem-solving, algorithm, and process-thinking skills",
      estimatedTime: "15-20 mins",
      comingSoon: true,
    },
    {
      id: "competitive-coding",
      icon: "/assets/square-code.svg",
      title: "Competitive coding",
      description:
        "Technical interview to solve algorithmic and data-structure problems under time pressure.",
      estimatedTime: "30-45 mins",
      comingSoon: true,
    },
  ];

  const handleCardClick = (id: string) => {
    setSelectedType(id);
    setTimeout(() => {
      navigate("/selfapply");
    }, 300);
  };

  useEffect(() => {
    const authenticateFromQuery = async () => {
      const token = searchParams.get("token") || searchParams.get("jwt");

      if (token) {
        if (isValidJWTFormat(token)) {
          const email = getEmailFromJWT(token);
          if (email) {
            try {
              const response = await checkUser(email);
              if (response.exists) {
                localStorage.setItem("studentToken", token);
                localStorage.removeItem("studentEmail");
                // Store user name if available
                if (response.user?.name) {
                  localStorage.setItem("userName", response.user.name);
                }
                toast.success("Authentication successful");
              } else {
                toast.error("Email not found. Please contact support.");
              }
            } catch (error) {
              console.error("Error checking user:", error);
              toast.error("Failed to verify email. Please contact support.");
            }
          } else {
            toast.error("Invalid JWT token: no email found in payload");
          }
        } else {
          toast.error("Invalid JWT token format");
        }
        return;
      }

      const email = searchParams.get("email");
      if (email) {
        try {
          const response = await checkUser(email);
          if (response.exists) {
            localStorage.setItem("studentEmail", email);
            // Store user name if available
            if (response.user?.name) {
              localStorage.setItem("userName", response.user.name);
            }
            toast.success("Authentication successful");
          } else {
            toast.error("Email not found. Please contact support.");
          }
        } catch (error) {
          console.error("Error checking user:", error);
          toast.error("Failed to verify email. Please contact support.");
        }
      }
    };

    authenticateFromQuery();
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-primary flex flex-col">
      <header className="border-b border-gray-200 bg-white">
        <div className="relative w-full px-6 py-4 flex items-center justify-center">
          <button
            onClick={() => (window.location.href = "https://app.zuvy.org")}
            className="cursor-pointer absolute left-6 text-gray-600 hover:text-gray-900"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M15 5L5 15M5 5L15 15"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          {/* <div className="flex gap-3 items-center"> */}
          <h1 className="text-base font-semibold ">
            Zoe: Your Learning Assistant
          </h1>
          {/* <Badge className="px-1 bg-green-400 rounded-sm font-semibold">
              Beta
            </Badge>
          </div> */}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12 flex-1 flex flex-col">
        <div className="flex justify-center mb-8">
          <img
            src="/assets/zoe-talking 1.svg"
            alt="Zoe Character"
            className="w-32 h-32 md:w-40 md:h-40"
          />
        </div>

        <h3 className="text-xl font-bold text-muted-foreground text-center mb-8">
          What would you like to practice today?
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto mb-8">
          {interviewTypes.map((type) => (
            <SelectionCard
              key={type.id}
              icon={type.icon}
              title={type.title}
              description={type.description}
              estimatedTime={type.estimatedTime}
              isSelected={selectedType === type.id}
              onClick={() => handleCardClick(type.id)}
              comingSoon={type.comingSoon}
              showEstimatedTime={false}
            />
          ))}
        </div>

        <div className="fixed bottom-10 left-0 right-0 flex justify-center pb-4">
          <Badge className="px-3 py-1 font-bold text-sky-600 rounded-sm bg-blue-100">
            Please note that Zoe works best on Google Chrome
          </Badge>
        </div>
      </main>
    </div>
  );
}
