import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { TestResults } from "../components/results/TestResults";
import type { InterviewSession } from "../models/interview";
// import { getUser } from "../services/api/serverApi";
import { getEmailFromJWT } from "../utils/jwt";

export default function Results() {
  const navigate = useNavigate();
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [userName, setUserName] = useState<string | undefined>(undefined);

  useEffect(() => {
    const loadSessionAndUserName = async () => {
      const sessionStr = sessionStorage.getItem("interviewSession");
      if (!sessionStr) {
        toast.error("No interview session found");
        navigate("/selfapply");
        return;
      }

      try {
        const interviewSession = JSON.parse(sessionStr) as InterviewSession;
        setSession(interviewSession);

        // Try to get user name from localStorage
        const storedUserName = localStorage.getItem("userName");
        if (storedUserName) {
          setUserName(storedUserName);
          return;
        }

        // If not in localStorage, try to fetch from API
        // const storedToken = localStorage.getItem("studentToken");
        // const storedEmail = localStorage.getItem("studentEmail");

        // if (storedToken) {
        //   const email = getEmailFromJWT(storedToken);
        //   if (email) {
        //     try {
        //       const user = await getUser(email);
        //       if (user.name) {
        //         setUserName(user.name);
        //         localStorage.setItem("userName", user.name);
        //       }
        //     } catch (error) {
        //       console.error("Failed to fetch user details:", error);
        //     }
        //   }
        // } else if (storedEmail) {
        //   try {
        //     const user = await getUser(storedEmail);
        //     if (user.name) {
        //       setUserName(user.name);
        //       localStorage.setItem("userName", user.name);
        //     }
        //   } catch (error) {
        //     console.error("Failed to fetch user details:", error);
        //   }
        // }
      } catch (error) {
        console.error("Error parsing interview session:", error);
        toast.error("Invalid interview session data");
        navigate("/selfapply");
      }
    };

    loadSessionAndUserName();
  }, [navigate]);

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>Loading...</div>
      </div>
    );
  }

  const testResult = {
    id: session.sessionId,
    test_id: session.sessionId,
    user_id: session.userId,
    summary:
      session.result?.summary ||
      session.summary ||
      "Interview completed successfully.",
    score: session.result?.score || 0,
    question_number: session.result?.totalQuestions || session.qaHistory.length,
    correct_number: session.result?.correctAnswers || 0,
    elapse_time: session.result?.elapsedTime || 0,
    qa_history: session.qaHistory.map((qa) => ({
      question: qa.question,
      answer: qa.answer,
      summary: "",
    })),
    topStrengths: session.result?.topStrengths || [],
    improvementAreas: session.result?.improvementAreas || [],
    created_at: session.startTime,
    updated_at: session.endTime || new Date().toISOString(),
  };

  return <TestResults testResult={testResult} userName={userName} />;
}
