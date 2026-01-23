import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { TestResults } from "../components/results/TestResults";
import { InterviewFeedback } from "../components/feedback/InterviewFeedback";
import type { InterviewSession } from "../models/interview";
import { createUserFeedbackDocument } from "../services/storage/firebaseStorage";
import { loadInterviewSessionBySessionId } from "../services/storage/interviewStorage";
import { resultGenerationStatus } from "../services/resultGenerationStatus";

export default function Results() {
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId?: string }>();
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [userName, setUserName] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingResult, setIsGeneratingResult] = useState(false);

  useEffect(() => {
    const loadSessionAndUserName = async () => {
      setIsLoading(true);
      
      let interviewSession: InterviewSession | null = null;

      const sessionStr = sessionStorage.getItem("interviewSession");
      if (sessionStr) {
        try {
          interviewSession = JSON.parse(sessionStr) as InterviewSession;
        } catch (error) {
          console.error("Error parsing session from sessionStorage:", error);
        }
      }

      if (sessionId) {
        const localStorageSession = loadInterviewSessionBySessionId(sessionId);
        if (localStorageSession) {
          if (interviewSession) {
            interviewSession = {
              ...localStorageSession,
              ...interviewSession,
              result: localStorageSession.result || interviewSession.result,
            };
          } else {
            interviewSession = localStorageSession;
          }
        }
      }

      if (!interviewSession) {
        toast.error("No interview session found");
        navigate("/selfapply");
        setIsLoading(false);
        return;
      }

      if (interviewSession) {
        sessionStorage.setItem("interviewSession", JSON.stringify(interviewSession));
      }

      setSession(interviewSession);

      const storedUserName = localStorage.getItem("userName");
      if (storedUserName) {
        setUserName(storedUserName);
      }

      setIsLoading(false);

    };

    loadSessionAndUserName();
  }, [navigate, sessionId]);

  useEffect(() => {
    if (!sessionId) return;

    const checkStatus = () => {
      const generating = resultGenerationStatus.isCurrentlyGenerating(sessionId);
      setIsGeneratingResult(generating);

      if (!generating) {
        const sessionWithResult = loadInterviewSessionBySessionId(sessionId);
        if (sessionWithResult?.result) {
          setSession((prevSession) => {
            if (prevSession && !prevSession.result) {
              const updatedSession: InterviewSession = {
                ...prevSession,
                result: sessionWithResult.result,
              };
              sessionStorage.setItem("interviewSession", JSON.stringify(updatedSession));
              return updatedSession;
            }
            return prevSession;
          });
        }
      }
    };

    checkStatus();
    const unsubscribe = resultGenerationStatus.subscribe((isGenerating, currentSessionId) => {
      if (currentSessionId === sessionId) {
        setIsGeneratingResult(isGenerating);
        if (!isGenerating) {
          checkStatus();
        }
      }
    });

    return unsubscribe;
  }, [sessionId]);

  const handleFeedbackSubmit = async (feedback: {
    questionRelevance: number;
    referralLikelihood: number;
  }) => {
    if (!session) return;

    const latestSession = sessionId 
      ? loadInterviewSessionBySessionId(sessionId)
      : null;
    
    const sessionToUpdate = latestSession || session;

    const updatedSession: InterviewSession = {
      ...sessionToUpdate,
      userFeedback: {
        questionRelevance: feedback.questionRelevance,
        referralLikelihood: feedback.referralLikelihood,
        submittedAt: new Date().toISOString(),
      },
    };

    sessionStorage.setItem("interviewSession", JSON.stringify(updatedSession));
    setSession(updatedSession);

    const email = localStorage.getItem("studentEmail") || sessionToUpdate.userId;
    if (email) {
      try {
        await createUserFeedbackDocument(
          email,
          sessionToUpdate.sessionId,
          feedback.questionRelevance,
          feedback.referralLikelihood
        );
      } catch (error) {
        console.error("Failed to save feedback to Firebase:", error);
      }
    }

    if (!updatedSession.result && sessionId) {
      const checkForResult = () => {
        if (!resultGenerationStatus.isCurrentlyGenerating(sessionId)) {
          const sessionWithResult = loadInterviewSessionBySessionId(sessionId);
          if (sessionWithResult?.result) {
            const finalSession: InterviewSession = {
              ...updatedSession,
              result: sessionWithResult.result,
            };
            sessionStorage.setItem("interviewSession", JSON.stringify(finalSession));
            setSession(finalSession);
          }
        }
      };
      
      checkForResult();
      
      const unsubscribe = resultGenerationStatus.subscribe((isGenerating, currentSessionId) => {
        if (currentSessionId === sessionId && !isGenerating) {
          checkForResult();
          unsubscribe();
        }
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>Loading...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>No session found</div>
      </div>
    );
  }

  const isInvited = sessionStorage.getItem("isInvited") === "true";
  const invitationId = sessionStorage.getItem("invitationId");

  useEffect(() => {
    if (isInvited && invitationId && session?.result) {
      const updateInvitationStatus = async () => {
        try {
          const { updateInvitationStatus: updateStatus } = await import("../services/api/invitationApi");
          await updateStatus(invitationId, "completed");
          sessionStorage.removeItem("isInvited");
          sessionStorage.removeItem("invitationId");
        } catch (error) {
          console.error("Failed to update invitation status:", error);
        }
      };
      updateInvitationStatus();
    }
  }, [isInvited, invitationId, session?.result]);

  if (!session.userFeedback && !isInvited) {
    return <InterviewFeedback onSubmit={handleFeedbackSubmit} />;
  }

  if (isInvited && !session.result) {
    if (isGeneratingResult) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div>Generating results...</div>
        </div>
      );
    }
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>Waiting for results...</div>
      </div>
    );
  }

  if (isInvited && session.result) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <div className="max-w-2xl w-full text-center">
          <h1 className="text-3xl font-bold mb-4">Thank You!</h1>
          <p className="text-lg mb-8">
            Thanks for the interview our team you will be updated on the next steps.
          </p>
        </div>
      </div>
    );
  }

  if (!session.result && isGeneratingResult) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>Generating results...</div>
      </div>
    );
  }
  
  if (!session.result) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>Waiting for results...</div>
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
